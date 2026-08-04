# Database Schema

Living document. Updated at the end of every phase that changes the
database. Do not let this drift from `manage.py showmigrations` /
the actual model files under `backend/apps/*/models.py`.

## ER Diagram

```mermaid
erDiagram
    USER ||--o{ PASSWORD_RESET_TOKEN : "requests"
    TIMETABLE_CONFIG ||--o{ SLOT : "generates"
    LEAVE ||--o{ SLOT : "blocks"
    USER ||--o{ LEAVE : "creates"
    USER ||--o{ USER_SUBSCRIPTION : "purchases"
    SUBSCRIPTION_PLAN ||--o{ USER_SUBSCRIPTION : "priced by"
    USER ||--o{ SLOT_PURCHASE : "pays for"
    SLOT ||--o| BOOKING : "holds"
    USER ||--o{ BOOKING : "makes"
    USER_SUBSCRIPTION ||--o{ BOOKING : "deducted for"
    BOOKING ||--o{ BOOKING_CHANGE_REQUEST : "move requests"
    USER ||--o{ BOOKING_CHANGE_REQUEST : "creates/reviews"
    SLOT ||--o{ BOOKING_CHANGE_REQUEST : "requested/current snapshots"
    USER ||--o{ NOTIFICATION : "receives"

    USER {
        bigint id PK
        varchar email UK
        varchar first_name
        varchar last_name
        varchar phone_number
        varchar role "admin | user"
        bool is_active
        bool is_staff
        datetime created_at
        datetime updated_at
    }

    PASSWORD_RESET_TOKEN {
        bigint id PK
        bigint user_id FK
        varchar token UK
        datetime expires_at
        datetime used_at
        datetime created_at
        datetime updated_at
    }

    STUDIO_SETTING {
        bigint id PK
        varchar key UK
        varchar value
        varchar description
        datetime created_at
        datetime updated_at
    }

    TIMETABLE_CONFIG {
        bigint id PK
        smallint weekday UK "0=Mon .. 6=Sun"
        bool is_open
        time start_time
        time end_time
        smallint slot_duration_minutes
        datetime created_at
        datetime updated_at
    }

    SLOT {
        bigint id PK
        date date
        time start_time
        time end_time
        smallint weekday
        bool is_booked
        bigint source_config_id FK "nullable"
        bigint leave_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    LEAVE {
        bigint id PK
        date start_date
        date end_date
        varchar reason
        bigint created_by_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    SUBSCRIPTION_PLAN {
        bigint id PK
        decimal monthly_price
        int included_sessions "default 30"
        bool is_active
        datetime created_at
        datetime updated_at
    }

    USER_SUBSCRIPTION {
        bigint id PK
        bigint user_id FK
        bigint plan_id FK
        varchar status "active|expired|exhausted|cancelled"
        int sessions_included "snapshot"
        int sessions_remaining
        decimal price_paid "snapshot"
        date start_date
        date end_date
        datetime created_at
        datetime updated_at
    }

    SLOT_PURCHASE {
        bigint id PK
        bigint user_id FK
        decimal price_paid "snapshot"
        datetime created_at
        datetime updated_at
    }

    BOOKING {
        bigint id PK
        bigint slot_id FK "historical rows allowed; active slot locked in service"
        bigint user_id FK
        varchar status "booked|cancelled|attended"
        datetime cancelled_at
        datetime attended_at
        bigint subscription_deducted_from_id FK "nullable"
        datetime created_at
        datetime updated_at
    }

    BOOKING_CHANGE_REQUEST {
        bigint id PK
        bigint booking_id FK
        varchar request_type "transfer | reschedule"
        varchar status "pending | approved | rejected"
        bigint requested_by_id FK
        bigint current_slot_id FK "nullable"
        bigint requested_slot_id FK "nullable"
        date/time current_snapshot
        date/time requested_snapshot
        bigint reviewed_by_id FK "nullable"
        datetime reviewed_at
        varchar decision_reason
        datetime notification_sent_at
        datetime created_at
        datetime updated_at
    }

    NOTIFICATION {
        bigint id PK
        bigint recipient_id FK
        varchar notification_type
        varchar channel "in_app"
        varchar title
        text message
        bool is_read
        datetime read_at
        varchar related_type
        varchar related_id
        varchar action_url
        varchar dedupe_key UK
        datetime created_at
        datetime updated_at
    }
```

## Database Tables

### `accounts_user`

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| email | EmailField | unique, `USERNAME_FIELD` |
| first_name | CharField(150) | blank allowed |
| last_name | CharField(150) | blank allowed |
| phone_number | CharField(32) | blank allowed |
| role | CharField(16) | choices: `admin`, `user`; default `user` |
| is_active | Boolean | default `True` |
| is_staff | Boolean | default `False`; gates Django admin only, not app role |
| created_at | DateTime | auto |
| updated_at | DateTime | auto |

**Constraints:** `email` unique.
**Indexes:** PK on `id`; unique index on `email`.
**Business rules:** `role` defaults to `user` on self-registration; only
promoted to `admin` out-of-band (Django admin or a future admin-only
endpoint) — never client-settable at registration.

### `accounts_password_reset_token`

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| user_id | FK → accounts_user | `on_delete=CASCADE` |
| token | CharField(128) | unique, `secrets.token_urlsafe(48)` |
| expires_at | DateTime | default now + `PASSWORD_RESET_TOKEN_TTL_HOURS` (env-configurable) |
| used_at | DateTime | null until consumed |
| created_at / updated_at | DateTime | auto |

**Constraints:** `token` unique.
**Business rules:** single-use (`used_at` set on consumption); expired or
used tokens are rejected by `reset_password_with_token`.

### `core_studio_setting`

Generic admin-configurable key/value store. Introduced in Phase 3 so
studio-wide values (starting with the slot generation horizon) are never
hardcoded in application code — every future "configurable from the admin
panel" value can be added here without a schema change.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| key | CharField(100) | unique, e.g. `slot_generation_horizon_days` |
| value | CharField(255) | stored as text, cast by the typed accessor (`StudioSetting.get_int`, etc.) |
| description | CharField(255) | blank allowed, admin-facing hint |
| created_at / updated_at | DateTime | auto |

**Constraints:** `key` unique.
**Business rules:** absence of a row falls back to the code-defined default
in `apps.core.settings_keys` (e.g. `slot_generation_horizon_days` defaults
to 30, clamped 7–365) — the app never crashes on a missing setting.

### `classes_timetable_config`

The **only** thing an admin configures for scheduling. One row per weekday,
seeded by migration `classes_app.0002_seed_timetable_config` with the
studio's initial default (9:00 AM–9:00 PM, 60-minute slots, all 7 days
open) and edited thereafter — never created or deleted through the app.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| weekday | PositiveSmallInteger | unique; 0=Monday … 6=Sunday |
| is_open | Boolean | default `True`; closed days generate no slots |
| start_time | Time | working start time |
| end_time | Time | working end time; must be after `start_time` when `is_open` |
| slot_duration_minutes | PositiveSmallInteger | length of each generated slot |
| created_at / updated_at | DateTime | auto |

**Constraints:** `weekday` unique (exactly 7 rows, one per weekday).
**Business rules:** saving a row triggers `classes_app.signals` →
`services.regenerate_weekday(weekday)`, which deletes and regenerates only
that weekday's **future, unbooked** slots. Past slots and booked slots are
never touched, regardless of what changes here.

The initial timetable rows are seeded by migration `0002`; initial slot
generation runs in migration `0004`, after the `Leave` table from `0003`
exists. This ordering is required because slot generation checks leave dates.

### `classes_slot`

System-generated bookable time-windows, derived from `TimetableConfig`.
Never created directly by an admin or via a public "create slot" endpoint —
only `apps.classes_app.services.generate_slots()` (and its callers:
`regenerate_weekday`, `regenerate_all`, the `generate_slots` management
command, and the horizon-update endpoint) writes rows here.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| date | Date | |
| start_time | Time | |
| end_time | Time | |
| weekday | PositiveSmallInteger | denormalized from `date` for fast per-weekday queries/deletes |
| is_booked | Boolean | default `False`; not yet set by any code path — reserved for the booking module (later phase) |
| source_config_id | FK → classes_timetable_config, nullable | `on_delete=SET_NULL`; traceability only, not required for regeneration logic |
| leave_id | FK → classes_leave, nullable | `on_delete=SET_NULL`; set when this slot falls within an active leave (Phase 4) |
| created_at / updated_at | DateTime | auto |

**Constraints:** unique on (`date`, `start_time`) — `unique_slot_per_date_start_time`; this is also what makes generation idempotent (`get_or_create` on the same key).
**Indexes:** `idx_slot_date` on `date`; `idx_slot_date_booked` on (`date`, `is_booked`) for the regeneration query (`date >= today AND is_booked = False`); `idx_slot_leave` on `leave_id`.
**Business rules:**
- Slots are only ever generated for `date >= today` (studio-local date via `timezone.localdate()`; Django `TIME_ZONE` is `Asia/Kolkata`), out to `StudioSetting.slot_generation_horizon_days`.
- Regeneration (weekday change, horizon change, or explicit resync) deletes only rows matching `date >= today AND is_booked = False` for the affected scope, then re-runs generation — so it is safe to call repeatedly and never destroys history or booked slots.
- Generation is additive-only per run: `get_or_create` means a second run against unchanged config creates zero new rows and modifies nothing (idempotent).
- Generation skips any date covered by an active `classes_leave` row entirely — no slot is created there.
- **Availability** is derived (not stored) from `(is_booked, leave_id)` — see `Slot.availability` property: `available` (neither), `unavailable` (leave only), `booked` (is_booked only), `leave_conflict` (both — a confirmed booking now clashes with a leave added after the fact; surfaced for admin attention, booking itself untouched).

### `classes_leave`

An admin-declared studio closure over an inclusive date range (`start_date`
to `end_date`). Introduced in Phase 4 (Leave Management). No slot may be
booked on a leave date. Never deletes a `Slot` row — see `services.apply_leave`
/ `release_leave` in `docs` business rules below.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| start_date | Date | inclusive |
| end_date | Date | inclusive; must be ≥ `start_date` |
| reason | CharField(255) | blank allowed |
| created_by_id | FK → accounts_user, nullable | `on_delete=SET_NULL`; audit trail of who added it |
| created_at / updated_at | DateTime | auto |

**Constraints:** `leave_end_date_gte_start_date` check constraint (`end_date >= start_date`).
**Indexes:** `idx_leave_date_range` on (`start_date`, `end_date`).
**Business rules:**
- Adding a leave (`services.apply_leave`) sets `leave_id` on every **future** `Slot` in range (`date >= max(start_date, today)`) — it never deletes a slot. Unbooked slots become `unavailable`; already-booked slots become `leave_conflict` (the booking is left completely alone).
- Past dates within the range are never touched at the `Slot` level, even though the `Leave` row itself is retained — this is what keeps leave history permanent and auditable without ever mutating historical bookings.
- A leave may only be deleted while `end_date >= today`. Deleting it (`services.release_leave`) clears `leave_id` on every slot it had blocked, restoring prior availability; the `Leave` row is then hard-deleted. A leave that has already ended cannot be deleted — it remains in `GET /leaves/` permanently as history.
- New leaves may not overlap an existing leave's date range (validated at the serializer level) and may not start in the past.
- `generate_slots()` skips any date covered by an active leave, so extending the horizon or regenerating a weekday never creates a slot on a leave date.

### `payments_subscription_plan`

The studio's single subscription offering. One row, admin-edited in place —
same pattern as `classes_timetable_config`. Never created or deleted
through the app; seeded once by migration with the spec's default
(30 included sessions).

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| monthly_price | Decimal(10,2) | admin-set |
| included_sessions | PositiveInteger | default `30` |
| is_active | Boolean | default `True`; gates whether new purchases/renewals are allowed |
| created_at / updated_at | DateTime | auto |

**Business rules:** Admin edits this single row via `PATCH /api/payments/subscription-plan/` (admin-only). Editing it only affects **future** purchases/renewals — every `UserSubscription` snapshots `monthly_price` and `included_sessions` at purchase time, so changing the plan never retroactively alters an existing member's cycle.

### `payments_user_subscription`

One user's purchased subscription cycle. A user has at most one row with
`status='active'` at a time — purchasing while one is active is rejected;
renewing marks the prior row `cancelled` and creates a fresh row rather
than mutating history in place.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| user_id | FK → accounts_user | `on_delete=CASCADE` |
| plan_id | FK → payments_subscription_plan | `on_delete=PROTECT` (a plan can't be deleted while referenced) |
| status | CharField(16) | `active` / `expired` / `exhausted` / `cancelled` |
| sessions_included | PositiveInteger | snapshot of `plan.included_sessions` at purchase/renewal |
| sessions_remaining | PositiveInteger | live balance, mutated only by `services.deduct_session` / `restore_session` |
| price_paid | Decimal(10,2) | snapshot of `plan.monthly_price` at purchase/renewal |
| start_date / end_date | Date | 30-day cycle from purchase/renewal date |
| created_at / updated_at | DateTime | auto |

**Indexes:** `idx_usersub_user_status` on (`user_id`, `status`) — the hot path for "does this user have a usable subscription."
**Business rules:**
- Purchase and renewal operations lock the owning user row inside their
  transaction before checking or changing active-subscription state. This
  serializes concurrent subscription requests for the same user and preserves
  the one-active-cycle rule.
- Status is lazily synced on read (`services._sync_status`): an `active` row flips to `expired` once `end_date` has passed, or `exhausted` once `sessions_remaining` hits 0 — no scheduled job required.
- `deduct_session(subscription)` / `restore_session(subscription)` are the **only** ways `sessions_remaining` changes. Both are pure, booking-agnostic service functions (`apps.payments.services`) designed to be called by the future Bookings module when a booking is marked attended / an attended booking is reverted. Neither function knows what a booking or a slot is.
- `deduct_session` never lets the balance go below 0; the moment it hits 0 the row becomes `exhausted`. `restore_session` never restores above `sessions_included`, and reactivates an `exhausted` row back to `active` if it isn't also past its `end_date`.
- Renewing is valid regardless of whether the previous subscription is still active, expired, or exhausted — all three are legitimate reasons to renew, matching "After sessions become zero → Renew Subscription OR Pay per slot."
- History is permanent: no `UserSubscription` row is ever deleted, only superseded by a new one.

### `payments_slot_purchase`

A pay-per-visit purchase record, made when a user has no usable
subscription. This phase only records the payment; the future Bookings
module is what ties a specific purchase to a specific slot booking.

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| user_id | FK → accounts_user | `on_delete=CASCADE` |
| price_paid | Decimal(10,2) | snapshot of the single-slot price (`core_studio_setting[single_slot_price]`) at purchase time |
| created_at / updated_at | DateTime | auto |

**Business rules:** always available regardless of subscription state, but only meaningfully offered by the frontend once a user has no usable subscription (mirrors the "Renew OR Pay per slot" choice).

### `payments_transaction`

Gateway-neutral payment ledger entry. A successful subscription purchase,
subscription renewal, or single-slot purchase creates exactly one successful
transaction in the same transaction as the domain purchase.

| Field | Type | Notes |
|---|---|---|
| user_id | FK → accounts_user | payer; protected from deletion |
| transaction_id | CharField(64) | unique internal transaction identifier |
| provider | CharField(64) | blank until a gateway adapter is integrated |
| provider_transaction_id | CharField(128) | optional external gateway identifier |
| payment_type | CharField(16) | `subscription` or `single_slot` |
| amount | Decimal(10,2) | charged amount snapshot |
| currency | CharField(3) | default `INR` |
| status | CharField(16) | `pending`, `successful`, `failed`, or `refunded` |
| subscription_id / slot_purchase_id | nullable FK | source domain purchase |
| metadata | JSON | gateway-neutral extension data |

### `payments_receipt`

Immutable receipt snapshot with a protected one-to-one relationship to a
payment transaction. It preserves the user and payment details even if
profile or pricing data changes later.

| Field | Type | Notes |
|---|---|---|
| transaction_id | OneToOne FK → payments_transaction | source payment |
| receipt_number | CharField(64) | unique receipt identifier |
| user_name / user_email | snapshot fields | payer at payment time |
| payment_type | CharField(16) | payment type snapshot |
| amount / currency | snapshot fields | receipt amount |
| payment_date | DateTime | successful payment timestamp |
| status | CharField(16) | payment status snapshot |

**Business rules:** receipts are generated only for successful payments,
remain permanently available, and are downloadable only by the payer or an
admin. Revenue summaries aggregate successful transactions only.

### `bookings_booking`

One user's reservation of one slot. `slot` is a `OneToOneField` — the
DB-level guarantee behind "one slot can contain only one booking." Booking
creation only reserves the slot; it never touches payment or subscription
state (business rule: payment/subscription balance is independent of
booking creation).

| Field | Type | Notes |
|---|---|---|
| id | BigAutoField (PK) | |
| slot_id | **OneToOneField** → classes_slot | `on_delete=PROTECT`; UNIQUE at the DB level — this is what makes "one slot, one booking" structurally impossible to violate |
| user_id | FK → accounts_user | `on_delete=PROTECT` (a user with booking history can't be hard-deleted) |
| status | CharField(16) | `booked` / `cancelled` / `attended` |
| cancelled_at | DateTime | null unless cancelled |
| attended_at | DateTime | null unless attended |
| subscription_deducted_from_id | FK → payments_user_subscription, nullable | Set exactly when `mark_attended` deducts a session; `revert_attended` restores to *this specific* subscription, never whichever one happens to be active at revert time — those can differ if the user renewed in between |
| created_at / updated_at | DateTime | auto |

**Indexes:** `idx_booking_user_status` on (`user_id`, `status`).
**Business rules:**
- **Race-condition prevention**: `services.create_booking` wraps the whole operation in `transaction.atomic()` and takes `select_for_update()` on the target `Slot` row before checking `is_booked`. A concurrent request for the same slot blocks on the lock until the first transaction commits, then correctly observes `is_booked=True` — verified under real concurrent load (10 simultaneous requests for one slot → exactly 1 success, 9 correctly rejected, 0 duplicate `Booking` rows). The `OneToOneField` unique constraint is the second, DB-level backstop.
- **Conflict resolution**: when a locked request observes that the slot was booked by an earlier committed transaction, `POST /api/bookings/` returns HTTP 409 with a deterministic, chronological next-available slot suggestion. The suggestion is locked only while it is inspected and is never reserved automatically; the member must explicitly accept it through a second normal booking request. Concurrent requests therefore remain first-committed-wins, with no existing booking modified or transferred.
- **Booked slots are never hidden.** `classes_app.SlotListView` (Phase 3) already returns every slot regardless of `is_booked`/`availability`; this phase adds no filtering that would hide booked slots from either admin or member views.
- Booking a slot sets `classes_slot.is_booked=True`; cancelling sets it back to `False`. Both happen inside the same atomic transaction as the `Booking` row change.
- **Session deduction is decoupled from booking creation.** A session is deducted **only** when an admin calls `mark_attended` (→ `apps.payments.services.deduct_session`), and restored only via `revert_attended` (→ `restore_session`). Cancelling a `booked` (not yet attended) booking never touches the session balance.
- Cancelled and attended bookings are never deleted — `Booking` rows are permanent history, same principle as `classes_leave`.

### `bookings_booking_change_request`

An approval-gated request to move an existing booked reservation. The same
table records both admin-initiated transfers and user-initiated reschedules.

| Field | Type | Notes |
|---|---|---|
| booking_id | FK → bookings_booking | booking being moved; protected from deletion |
| request_type | CharField(16) | `transfer` or `reschedule` |
| status | CharField(16) | `pending`, `approved`, or `rejected` |
| requested_by_id | FK → accounts_user | initiator; protected from deletion |
| current_slot_id / requested_slot_id | nullable FK → classes_slot | live references for display; set null if a slot is removed |
| current/requested date and times | snapshot fields | preserve the audit record even if slot rows change |
| reviewed_by_id / reviewed_at | nullable reviewer audit fields | set only after approval or rejection |
| decision_reason | CharField(255) | optional rejection/audit note |
| notification_sent_at | DateTime | records the email notification attempt |

**Business rules:**
- Only `BOOKED` bookings may have a pending transfer or reschedule request;
  attended and cancelled bookings are not moved.
- A booking may have only one pending change request. The service checks this
  while holding the booking row lock, preventing duplicate requests under
  concurrent submissions.
- Creating a request never changes the booking or either slot.
- Approval locks the request, booking, current slot, and requested slot in a
  transaction, verifies that the target is still available, then frees the
  old slot and reserves the requested slot. Subscription and attendance
  fields are untouched.
- Rejection changes only the request status; the booking remains unchanged.
- Every request remains permanently recorded for audit history.

### `notifications_notification`

Recipient-scoped in-app notification records generated by the reusable
`apps.notifications.services.NotificationService`.

| Field | Type | Notes |
|---|---|---|
| recipient_id | FK → accounts_user | only this user may read or modify the notification |
| notification_type | CharField(32) | booking, transfer, reschedule, subscription, or payment event |
| channel | CharField(16) | currently `in_app`; future email/SMS channels can be added at the service boundary |
| title / message | text fields | display content |
| is_read / read_at | Boolean/DateTime | read state |
| related_type / related_id | reference fields | optional domain object reference without cross-app foreign keys |
| action_url | CharField(255) | optional dashboard destination |
| dedupe_key | nullable unique CharField | prevents duplicate lifecycle notifications |

**Business rules:** notifications are created by domain services, unread by
default, individually readable by the recipient, and permanently retained.
`mark-all-read` updates only the authenticated user's unread records.

## Relationships

Phase 12 user-dashboard views are composed from existing account, booking,
payment, subscription, receipt, and notification tables; no schema changes
were required.

Phase 13 reports are read-only aggregates over the existing tables and add no
database models, columns, constraints, or migrations.

The Phase 11 dashboard is an aggregate read-only service over the existing
tables; it introduces no database table, column, constraint, or migration.

- `accounts_user` 1 — N `accounts_password_reset_token`
- `accounts_user` 1 — N `classes_leave` (`created_by`, nullable)
- `classes_timetable_config` 1 — N `classes_slot` (nullable FK; a slot survives its source config being deleted, though config rows are never deleted in normal operation)
- `classes_leave` 1 — N `classes_slot` (nullable FK; a slot survives its blocking leave being deleted — `release_leave` clears it explicitly before the delete)
- `accounts_user` 1 — N `payments_user_subscription`
- `payments_subscription_plan` 1 — N `payments_user_subscription` (`on_delete=PROTECT`)
- `accounts_user` 1 — N `payments_slot_purchase`
- `accounts_user` 1 — N `payments_transaction`
- `payments_user_subscription` 1 — N `payments_transaction`
- `payments_slot_purchase` 1 — N `payments_transaction`
- `payments_transaction` 1 — 1 `payments_receipt`
- `classes_slot` 1 — 0..1 `bookings_booking` (OneToOne, `on_delete=PROTECT`)
- `accounts_user` 1 — N `bookings_booking` (`on_delete=PROTECT`)
- `payments_user_subscription` 1 — N `bookings_booking` (via `subscription_deducted_from`, nullable)
- `bookings_booking` 1 — N `bookings_booking_change_request`
- `accounts_user` 1 — N `bookings_booking_change_request` as requester/reviewer
- `accounts_user` 1 — N `notifications_notification`

## Phase 14 Production Review

Added report-oriented indexes for active users, booking creation dates,
requested transfer/reschedule dates, and payment status/date queries. Existing
transaction boundaries, foreign keys, unique booking constraints, and audit
history remain unchanged.

Booking history correction: `bookings_booking.slot_id` is now a protected
foreign key rather than a unique one-to-one relation. This preserves cancelled
and attended history while allowing a slot freed by cancellation to be booked
again. `create_booking()` locks the slot and permits only one active booking at
a time; the slot's unique date/start-time constraint remains.

## Update Log

| Date | Phase | Change |
|---|---|---|
| 2026-07-31 | Phase 2 — Authentication | Initial schema: `accounts_user`, `accounts_password_reset_token`, plus `token_blacklist` tables from `djangorestframework-simplejwt` (unmanaged by app code). |
| 2026-08-01 | Phase 3 — Timetable Module | Added `core_studio_setting` (generic admin-configurable settings), `classes_timetable_config` (per-weekday working hours + slot duration, seeded 9AM–9PM/60min for all 7 days), `classes_slot` (system-generated bookable windows, unique on date+start_time, idempotent generation). No changes to existing accounts tables. |
| 2026-08-01 | Phase 4 — Leave Management | Added `classes_leave` (admin-declared date-range closures, permanent history, deletable only while future). Added `classes_slot.leave_id` (nullable FK, `idx_slot_leave` index) and the derived `Slot.availability` property (`available`/`unavailable`/`booked`/`leave_conflict`). `generate_slots()` now skips leave-covered dates. No existing columns changed or removed. |
| 2026-08-01 | Phase 5 — Subscription Module | Added `payments_subscription_plan` (single admin-editable plan, seeded 1200.00/30 sessions), `payments_user_subscription` (per-user session balance and cycle, price/session snapshot at purchase time), `payments_slot_purchase` (pay-per-visit record). Added `core_studio_setting` key `single_slot_price` (default 150.00) and `StudioSetting.get_decimal`. Added reusable, booking-agnostic `apps.payments.services.deduct_session` / `restore_session`, intended for the future Bookings module to call — no Booking model exists yet. Also fixed a pre-existing bug where hand-written error responses (e.g. `LogoutView` in Phase 2) used `success_response` with a 4xx status, incorrectly emitting `"success": true`; added `apps.core.responses.error_response` and used it for this phase's new error paths — the Phase 2 occurrence is unfixed and noted for a future cleanup pass. |
| 2026-08-01 | Phase 6 — Booking Module | Added `bookings_booking` (OneToOne on `slot_id` — DB-level "one slot, one booking"; `status` booked/cancelled/attended; permanent history, never deleted). Race conditions on concurrent booking of the same slot are prevented via `select_for_update()` inside `transaction.atomic()` in `apps.bookings.services.create_booking` — verified under real concurrent load. Wired `mark_attended`/`revert_attended` to Phase 5's `deduct_session`/`restore_session`, recording exactly which subscription was deducted (`subscription_deducted_from`) so a revert can never misattribute a restored session to the wrong subscription. No existing tables/columns changed. |
| 2026-08-01 | Pre-Phase 7 Readiness | Moved initial slot generation to `classes_app.0004` so fresh migrations create the `Leave` table before slot generation queries it; standardized hand-written API errors on `error_response`; serialized subscription purchase/renewal per user with row locking; configured Django `TIME_ZONE` as `Asia/Kolkata`. No schema tables or business rules changed. |
| 2026-08-01 | Phase 7 — Booking Conflict Resolution | Extended the existing race-safe booking endpoint with HTTP 409 conflict responses containing a deterministic next-available slot suggestion. Added the member confirmation flow; accepting sends a normal booking request, while cancelling creates no booking. No database tables or booking state rules changed. |
| 2026-08-01 | Phase 8 — Booking Transfer & Reschedule | Added `bookings_booking_change_request` for approval-gated admin transfers and user reschedules, with slot snapshots, reviewer audit fields, duplicate-pending protection under booking-row locking, and email notification timestamps. Approval moves only booked reservations inside a transaction; rejection leaves the booking unchanged. |
| 2026-08-01 | Phase 9 — Payment & Receipt System | Added gateway-neutral `payments_transaction` and immutable `payments_receipt` tables. Subscription and single-slot purchase services now create successful payment history and receipts atomically. Added member/admin history access, revenue aggregation, and receipt downloads. |
| 2026-08-01 | Phase 10 — Notification System | Added reusable `notifications_notification` records, notification service/API, unread/read state, mark-all-read, event deduplication, and dashboard notification bell integration. Booking, transfer/reschedule, subscription, expiration, and payment workflows now emit in-app notifications. |
