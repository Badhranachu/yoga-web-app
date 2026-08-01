# EKAM Yoga Manual Testing Checklist

Use this checklist before production deployment. Execute tests in a clean
browser session and record the environment, tester, date, and result.

## Test Information

| Field | Value |
|---|---|
| Environment |  |
| Build/version |  |
| Browser/device |  |
| Tester |  |
| Test date |  |

## Execution Notes

- Use at least one admin account and two member accounts.
- Use a second browser or private window for concurrent booking tests.
- Do not use production payment credentials during manual QA unless the test
  environment is explicitly approved.
- Record defects with the Test ID, request payload, response, timestamp, and
  screenshots where relevant.
- Mark each case `Pass`, `Fail`, or `Blocked` in the final column.

## Authentication

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| AUTH-001 | Registration | Open Register; submit valid email, password, confirmation, name, and phone. | Account is created as a member; no admin role can be supplied from the form; user is directed to sign in. |  |
| AUTH-002 | Registration validation | Submit blank required fields, invalid email, mismatched passwords, and a weak password. | Clear validation errors appear; no account is created. |  |
| AUTH-003 | Duplicate registration | Register with an existing email using different casing or whitespace. | Request is rejected without creating a duplicate account. |  |
| AUTH-004 | Login | Sign in with valid member credentials. | Access and refresh tokens are issued; member is routed to `/account`; profile data appears. |  |
| AUTH-005 | Invalid login | Submit an incorrect password and a nonexistent email. | Login fails with a safe error; account existence is not disclosed. |  |
| AUTH-006 | Admin login | Sign in with valid admin credentials. | Admin is routed to `/dashboard` and sees admin navigation. |  |
| AUTH-007 | Protected routes | Open `/dashboard` and `/account` while signed out. | User is redirected to login; protected data is not exposed. |  |
| AUTH-008 | Role protection | Sign in as a member and open admin routes/API endpoints. | Access is denied; member cannot view admin dashboard, management, or reports. |  |
| AUTH-009 | Token refresh | Allow the access token to expire or simulate a 401, then perform an authenticated request. | Access token refreshes once and the original request succeeds; concurrent 401s share one refresh. |  |
| AUTH-010 | Refresh failure | Use an invalid/expired refresh token and make an API request. | Session is cleared and the user is returned to login. |  |
| AUTH-011 | Logout | Sign in, choose logout, then reuse the old refresh token and revisit protected routes. | Local session is cleared; refresh token is rejected/blacklisted; protected routes require login. |  |
| AUTH-012 | Password reset request | Submit a valid and unknown email on Forgot Password. | Same safe success message is shown for both; no account enumeration occurs. |  |
| AUTH-013 | Password reset completion | Open a valid reset link, set a compliant password, and sign in with it. | Password changes successfully and the new password works. |  |
| AUTH-014 | Password reset validation | Use an expired, invalid, or already-used token; submit weak or mismatched passwords. | Reset is rejected; token cannot be reused; validation is clear. |  |
| AUTH-015 | Change password | While signed in, submit the wrong current password, then the correct current password with a valid new password. | Wrong current password is rejected; valid change succeeds and the new password can log in. |  |

## Profile

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| PROF-001 | Profile summary | Open the member dashboard while signed in. | Correct name, email, and phone summary are displayed. |  |
| PROF-002 | Profile update | Update first name, last name, and phone number; save; refresh the page. | Changes are validated, persisted, and reflected in the topbar and profile summary. |  |
| PROF-003 | Email protection | Inspect the profile form and submit attempts that alter the email or role. | Email, role, and active state remain server-controlled and unchanged. |  |
| PROF-004 | Profile authorization | Attempt to request or modify another user's profile. | Request is denied; only the authenticated user's profile is accessible. |  |

## Timetable

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| TIME-001 | Timetable display | Open Classes as admin. | All seven weekdays and their open/closed state, times, and duration are shown. |  |
| TIME-002 | Timetable validation | Set an open day with missing times, end before start, or non-positive duration. | Update is rejected with field-level validation; existing timetable remains unchanged. |  |
| TIME-003 | Timetable update | Change one weekday's hours and duration. | Configuration saves; future unbooked slots for that weekday regenerate. |  |
| TIME-004 | Booked slot preservation | Change timetable settings after a slot has a booking. | Existing booked slot and its booking remain unchanged. |  |
| TIME-005 | Past slot preservation | Change timetable settings after past slots exist. | Past slots are not deleted or modified. |  |
| TIME-006 | Generation horizon | Change the slot-generation horizon and inspect future slots. | New future slots are generated within the horizon; existing history is preserved. |  |
| TIME-007 | Resync | Run the admin timetable resync action twice. | First run creates only missing slots; second run is idempotent and creates no duplicates. |  |
| TIME-008 | Slot visibility | View slots as a member. | Available, booked, unavailable, and leave-conflict states are visible with correct labels. |  |
| TIME-009 | Timezone | Create/view a slot near midnight in the configured studio timezone. | Dates and times are displayed consistently in Asia/Kolkata; no UTC date rollover appears. |  |

## Leave Management

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| LEAVE-001 | Add leave | As admin, add a future leave with a valid inclusive date range and reason. | Leave is recorded; affected future slots become unavailable; no slots are deleted. |  |
| LEAVE-002 | Leave validation | Submit a past start date, end before start, or overlapping leave. | Request is rejected; no partial leave or slot changes occur. |  |
| LEAVE-003 | Leave history | Add a leave, then inspect leave history. | Record shows dates, reason, creator, and past/future state. |  |
| LEAVE-004 | Leave visibility | View slots during a leave as a member. | Slots remain visible but cannot be booked. |  |
| LEAVE-005 | Booked leave conflict | Apply leave over an already-booked future slot. | Booking remains unchanged; slot is surfaced as a leave conflict for admin attention. |  |
| LEAVE-006 | Release future leave | Delete a future leave. | Only slots blocked by that leave are restored; bookings remain unchanged. |  |
| LEAVE-007 | Past leave protection | Attempt to delete a past leave. | Deletion is rejected; past leave history remains permanent. |  |
| LEAVE-008 | Leave authorization | Attempt add/delete leave as a member. | Read behavior follows policy; write operations are denied. |  |

## Booking

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| BOOK-001 | Book available slot | As a member, select an available future slot and confirm. | One booking is created; slot becomes booked; confirmation notification is generated. |  |
| BOOK-002 | Booked slot visibility | Refresh the timetable after booking. | The booked slot remains visible and cannot be booked again. |  |
| BOOK-003 | Invalid booking | Attempt to book a past, leave-blocked, unavailable, or nonexistent slot. | Booking is rejected; no booking or payment state is changed. |  |
| BOOK-004 | Duplicate user booking | Attempt to book the same slot twice as the same user. | Second attempt is rejected; only one booking exists. |  |
| BOOK-005 | Booking history | Open member booking history. | Upcoming, attended, and cancelled bookings remain visible with correct status. |  |
| BOOK-006 | Cancel booking | Cancel a booked future booking. | Booking status becomes cancelled, history remains, slot availability is restored according to business rules, and cancellation notification is generated. |  |
| BOOK-007 | Invalid cancellation | Cancel an already-cancelled, attended, or unauthorized booking. | Request is rejected; booking history and session balance remain correct. |  |
| BOOK-008 | Admin booking view | Open Bookings as admin. | All studio bookings are visible with member, slot, and status information. |  |
| BOOK-009 | Booking authorization | Attempt to view, cancel, attend, or change another user's booking as a member. | Unauthorized operation is denied. |  |

## Booking Conflict Resolution

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| CONFLICT-001 | Concurrent booking | In two sessions, submit bookings for the same available slot at nearly the same time. | Exactly one booking succeeds; the other receives a conflict response. |  |
| CONFLICT-002 | Deterministic ordering | Repeat simultaneous booking with two users whose emails have known alphabetical order. | Database locking determines the committed winner; effectively simultaneous conflict handling remains deterministic according to the documented ordering rule. |  |
| CONFLICT-003 | Suggestion | Trigger a conflict while a later available slot exists. | Response contains the next available suggested slot in chronological order. |  |
| CONFLICT-004 | Accept suggestion | In the conflict dialog, press Accept. | Only then is the suggested slot booked; original unavailable slot remains unchanged. |  |
| CONFLICT-005 | Cancel suggestion | Trigger the conflict dialog and press Cancel. | No suggested-slot booking is created. |  |
| CONFLICT-006 | Stale suggestion | Let another user take the suggested slot, then accept it. | Normal booking conflict handling applies; no duplicate booking is created. |  |
| CONFLICT-007 | No suggestion | Trigger a conflict when no later slot is available. | Clear unavailable response is shown; no booking is created. |  |

## Transfer Request

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| TRANSFER-001 | Create transfer request | As admin, select a booked reservation and request an available target slot. | Pending transfer request is created; booking does not move immediately. |  |
| TRANSFER-002 | User notification | Create an admin transfer. | User receives in-app notification and the confirmation request shows current and requested slots. |  |
| TRANSFER-003 | User accepts transfer | As the user, open the request and press Accept. | Target availability is rechecked; booking moves transactionally only after acceptance. |  |
| TRANSFER-004 | User rejects transfer | As the user, press Reject. | Request is rejected and original booking remains unchanged. |  |
| TRANSFER-005 | Target becomes unavailable | Book the target slot from another session before approval, then approve. | Approval fails safely; original booking remains unchanged. |  |
| TRANSFER-006 | Duplicate transfer | Submit another pending transfer for the same booking. | Duplicate pending request is rejected. |  |
| TRANSFER-007 | Transfer audit | Approve and reject transfer requests, then inspect history. | Every request retains status, requester, reviewer, slots, timestamps, and decision history. |  |
| TRANSFER-008 | Transfer permissions | Attempt to create/approve/reject transfers with unauthorized roles. | Only permitted admin/user actions succeed. |  |

## User Reschedule

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| RESCH-001 | Create reschedule request | As a member, choose another available slot and submit a reschedule request. | Pending request is created; booking remains on its current slot. |  |
| RESCH-002 | Admin notification | Submit a reschedule request. | Admin receives an in-app notification and the request appears in admin booking management. |  |
| RESCH-003 | Admin approves | Approve a pending reschedule. | Target availability is rechecked and booking moves transactionally. |  |
| RESCH-004 | Admin rejects | Reject a pending reschedule with/without a reason. | Booking remains unchanged and request records rejection. |  |
| RESCH-005 | Stale target | Occupy target slot before approval. | Approval is rejected safely; no partial move occurs. |  |
| RESCH-006 | Duplicate reschedule | Submit another pending request for the same booking. | Duplicate pending request is rejected. |  |

## Subscription

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| SUB-001 | Plan display | Open Subscription as member. | Current plan price and included sessions are displayed. |  |
| SUB-002 | Purchase | Purchase a subscription with an active plan. | One active subscription cycle is created with correct price, dates, and session count. |  |
| SUB-003 | Concurrent purchase | Submit two subscription purchases concurrently for one user. | Only one active subscription is created; the second request is rejected or directed to renewal. |  |
| SUB-004 | Duplicate purchase | Purchase while a usable subscription is active. | Purchase is rejected; active subscription is not duplicated. |  |
| SUB-005 | Renewal | Renew an active, exhausted, or expired subscription. | New cycle is created according to business rules; previous cycle is preserved in history. |  |
| SUB-006 | Concurrent renewal | Submit two renewals concurrently. | Row locking prevents concurrent active cycles or inconsistent balances. |  |
| SUB-007 | Expiry | Use a subscription past its end date. | Subscription is treated as expired and is not usable for booking. |  |
| SUB-008 | Exhaustion | Use all included sessions. | Subscription becomes exhausted and no longer qualifies as active/usable. |  |
| SUB-009 | Subscription notification | Purchase, renew, and expire subscriptions. | Corresponding in-app notifications are created once per lifecycle event. |  |
| SUB-010 | Admin plan update | As admin, update monthly price/included sessions and inspect existing subscriptions. | Future purchases use new settings; existing subscription snapshots remain unchanged. |  |
| SUB-011 | Invalid plan update | Submit negative price, zero sessions, or unauthorized update. | Validation/permission error; plan remains unchanged. |  |

## Session Deduction and Attendance

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| ATT-001 | Mark attended | As admin, mark a booked reservation attended. | Booking becomes attended; exactly one session is deducted from the linked subscription. |  |
| ATT-002 | Attendance history | Open admin booking/report attendance history. | Attended record includes member, slot, status, and attendance timestamp. |  |
| ATT-003 | Mark twice | Attempt to mark an attended or cancelled booking attended. | Invalid state transition is rejected; no extra deduction occurs. |  |
| ATT-004 | Revert attendance | Revert an attended booking. | Booking returns to booked state and the same subscription receives exactly one restored session. |  |
| ATT-005 | Revert twice | Attempt to revert a non-attended booking. | Request is rejected; balance remains unchanged. |  |
| ATT-006 | Exhaustion boundary | Mark the final-session booking attended. | Balance reaches zero and subscription becomes exhausted without going negative. |  |
| ATT-007 | Subscription renewal attribution | Attend a booking, renew, then revert attendance. | Restored session is attributed to the original subscription, not the renewal. |  |
| ATT-008 | Concurrent attendance | Mark the same booking attended from two admin sessions. | Row locking prevents duplicate deduction and inconsistent status. |  |

## Payments and Receipts

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| PAY-001 | Subscription payment | Complete a subscription purchase. | Successful gateway-neutral transaction is recorded with correct amount, type, user, and status. |  |
| PAY-002 | Single-slot payment | Complete a pay-per-slot purchase. | Single-slot transaction and purchase history are recorded correctly. |  |
| PAY-003 | Payment history member | Open payment history as a member. | Only the authenticated user's transactions are visible. |  |
| PAY-004 | Payment history admin | Open payment history as admin. | All user transactions are visible with status and receipt details. |  |
| PAY-005 | Receipt generation | Complete each successful payment type. | Exactly one immutable receipt is generated per successful transaction. |  |
| PAY-006 | Receipt contents | Download a receipt and inspect it. | Receipt number, transaction ID, user, payment type, amount, currency, date, and status are present. |  |
| PAY-007 | Receipt authorization | Attempt to download another user's receipt as a member. | Download is denied. |  |
| PAY-008 | Payment failure | Simulate or submit a failed/pending gateway result through the integration boundary. | Failed/pending payment does not create a successful entitlement or receipt. |  |
| PAY-009 | Revenue summary | Open admin payment summary/dashboard. | Only successful payments contribute to revenue totals and trends. |  |
| PAY-010 | Payment notification | Complete a successful payment. | Payment-success notification appears once and links to the correct account page. |  |

## Notifications

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| NOTIF-001 | Notification creation | Trigger booking confirmed/cancelled, transfer, reschedule, subscription, expiry, and payment events. | Correct notification type, title, message, related object, and action URL are stored. |  |
| NOTIF-002 | Notification bell | Sign in with unread notifications. | Bell displays unread counter and opens the notification list. |  |
| NOTIF-003 | Read notification | Open an unread notification. | Notification becomes read, read timestamp is set, and counter decreases. |  |
| NOTIF-004 | Mark all read | Open the bell and press Mark All Read. | All of the authenticated user's notifications become read; other users are unaffected. |  |
| NOTIF-005 | Notification privacy | Attempt to request another user's notifications or mark them read. | Access is denied. |  |
| NOTIF-006 | Deduplication | Repeat the same lifecycle operation or reload the UI. | Duplicate lifecycle notifications are not created. |  |
| NOTIF-007 | Notification navigation | Click notifications with action URLs. | User is routed to the correct member/admin page. |  |

## Admin Dashboard

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| ADMIN-001 | Admin overview access | Sign in as admin and open `/dashboard`. | Overview loads successfully; member cannot access it. |  |
| ADMIN-002 | Dashboard metrics | Create representative users, bookings, payments, subscriptions, slots, transfer requests, and leaves. | Today's bookings/revenue, monthly/total revenue, users, subscriptions, slots, transfers, and leaves match source records. |  |
| ADMIN-003 | Revenue trend | Create successful and unsuccessful payments across several days. | Seven-day trend includes successful payments only and uses studio-local dates. |  |
| ADMIN-004 | Booking trend | Create booked, attended, and cancelled bookings across several days. | Trend includes booked/attended reservations and excludes cancelled bookings as documented. |  |
| ADMIN-005 | Subscription trend | Create subscriptions on different days. | Seven-day subscription trend counts records by creation date. |  |
| ADMIN-006 | Recent widgets | Create more than five payments and bookings. | Recent widgets show the five newest records in correct order. |  |
| ADMIN-007 | Empty state | Use an environment with no activity. | Cards show zero/none and widgets show clear empty states without errors. |  |
| ADMIN-008 | Dashboard permissions | Call `/api/dashboard/overview/` as member, anonymous user, and admin. | Only admin receives data; others receive appropriate authorization responses. |  |
| ADMIN-009 | Dashboard responsiveness | Test at mobile, tablet, and desktop widths. | Sidebar remains usable, labels collapse appropriately on narrow screens, cards wrap, and no horizontal clipping occurs. |  |

## User Dashboard

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| USER-001 | Member overview | Sign in as member and open `/account`. | Dashboard loads cards, upcoming bookings, recent payment, histories, notifications, and profile summary. |  |
| USER-002 | Subscription cards | Purchase, exhaust, expire, and renew subscriptions. | Status, remaining sessions, used sessions, and cycle dates update correctly. |  |
| USER-003 | Upcoming bookings | Create multiple future bookings. | Upcoming list is chronological and next booking is correct. |  |
| USER-004 | Booking history actions | Cancel a booking, request reschedule, and approve/reject transfer. | Existing business workflows work from the dashboard and history remains intact. |  |
| USER-005 | Payment and receipt history | Complete multiple payments and download receipts from the dashboard. | Only member payments appear and each receipt downloads correctly. |  |
| USER-006 | Notification panel | Trigger notifications and open the dashboard panel/bell. | Notifications are visible, correctly dated, and private to the member. |  |
| USER-007 | User dashboard responsiveness | Test mobile, tablet, and desktop widths. | Cards, lists, dialogs, buttons, and receipt actions remain usable without overflow. |  |
| USER-008 | User dashboard accessibility | Navigate using keyboard and inspect button labels/focus states. | Interactive controls are keyboard reachable, visibly focused, and meaningfully labelled. |  |

## Reports and Admin Management

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| REPORT-001 | Reports access | Open Reports as admin and as member. | Admin sees reports; member is denied. |  |
| REPORT-002 | User management report | Select User Management and search by name/email. | Matching users appear with role, active state, and creation date. |  |
| REPORT-003 | Booking history report | Select Booking History; filter by status/date; sort by a column. | Results match source bookings and sort direction changes correctly. |  |
| REPORT-004 | Attendance report | Select Attendance History. | Only attended bookings appear with attendance information. |  |
| REPORT-005 | Payment report | Search transaction/email; filter status and date. | Payment rows match ledger and show receipt numbers. |  |
| REPORT-006 | Subscription report | Filter subscription status/date and search by email. | Subscription history includes active, expired, exhausted, cancelled, and prior cycles as applicable. |  |
| REPORT-007 | Leave report | Filter overlapping date ranges and search reason/creator. | Leave history matches the inclusive date-range rules. |  |
| REPORT-008 | Transfer report | Filter transfer/reschedule requests by status/type/date. | Request history includes requester, reviewer, requested slot date/time, and status. |  |
| REPORT-009 | Pagination | Create more than one page of records; navigate Previous/Next. | Page count, rows, and disabled boundary controls are correct. |  |
| REPORT-010 | Sorting | Sort each report by multiple columns in ascending and descending order. | Data is consistently ordered and no rows disappear. |  |
| REPORT-011 | CSV export | Apply search, filters, and sorting; export CSV. | Download contains the filtered/sorted dataset with correct headers and values. |  |
| REPORT-012 | PDF export | Apply search, filters, and sorting; export PDF. | Download opens as a readable PDF containing report title, generation time, headers, and filtered rows. |  |
| REPORT-013 | Export authorization | Attempt report JSON/CSV/PDF endpoints as a member or anonymous user. | Export is denied; no report data is leaked. |  |
| REPORT-014 | Empty reports | Search for a value with no matches. | Empty state is clear; CSV/PDF exports contain headers/title without unrelated rows. |  |

## API, Security, and Data Integrity

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| SEC-001 | Error envelope | Trigger serializer, permission, not-found, conflict, and business-rule errors. | Errors consistently use `success=false` and the shared error shape. |  |
| SEC-002 | API permissions | Call every admin, member, and public endpoint with anonymous, member, and admin tokens. | Each endpoint enforces its documented permission boundary. |  |
| SEC-003 | Object ownership | Change IDs in booking, receipt, notification, profile, and payment requests. | Users cannot access or mutate another user's objects. |  |
| SEC-004 | Input validation | Send malformed IDs, unsupported statuses, invalid dates, oversized page sizes, and unexpected fields. | Requests are rejected safely; no traceback or unintended mutation occurs. |  |
| SEC-005 | SQL/query safety | Search using quotes, wildcard characters, long strings, and HTML/script text. | No SQL error or script execution; values are treated as data. |  |
| SEC-006 | Session security | Inspect production cookies/headers over HTTPS. | Secure, HttpOnly, HSTS, referrer, frame, and content-type protections are present as configured. |  |
| SEC-007 | Audit preservation | Cancel, transfer, reschedule, attend, revert, pay, and renew records. | Existing booking/payment/request histories remain immutable where required. |  |
| SEC-008 | Transaction rollback | Force a failure during a booking move, payment/receipt creation, or session deduction. | Related writes roll back together; no partial state remains. |  |
| SEC-009 | Timezone boundary | Test operations around midnight in Asia/Kolkata. | Revenue, trends, slot dates, leave dates, subscription dates, and notifications use the correct studio date. |  |
| SEC-010 | Concurrent state changes | Repeat simultaneous booking, purchase, renewal, attendance, transfer approval, and reschedule approval. | Row locking/unique constraints preserve one valid final state and prevent duplicate entitlements. |  |

## Responsive and Accessibility Review

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| UX-001 | Mobile layout | Test 320px, 375px, and 430px viewport widths across public, member, and admin pages. | No unexpected horizontal scrolling; content and controls remain readable. |  |
| UX-002 | Tablet layout | Test common tablet portrait and landscape widths. | Grids, tables, dialogs, and navigation adapt without overlap. |  |
| UX-003 | Keyboard navigation | Navigate login, booking, dialogs, dashboard, reports, and profile with keyboard only. | Logical tab order, visible focus, and keyboard activation work. |  |
| UX-004 | Screen-reader labels | Inspect icon-only controls, notification bell, sortable report headers, buttons, and form fields. | Controls have accessible names and state announcements where applicable. |  |
| UX-005 | Error and loading states | Throttle/fail API requests on each major page. | Loading, empty, and error states are understandable and do not trap the user. |  |
| UX-006 | Contrast and text | Review token-based colors in light and dark browser contrast settings. | Text, status badges, focus indicators, and disabled states remain distinguishable. |  |
| UX-007 | Dialog behavior | Open conflict, transfer, reschedule, and confirmation dialogs. | Dialog content is clear, focus is managed, Escape/cancel behavior is safe, and no accidental action occurs. |  |

## Release Gate

| Test ID | Feature | Steps | Expected Result | Pass/Fail |
|---|---|---|---|---|
| REL-001 | Django check | Run `python manage.py check`. | No errors. |  |
| REL-002 | Deployment check | Run `python manage.py check --deploy --settings=config.settings.prod` with a strong production secret and production environment values. | No security errors; warnings are reviewed and accepted only when intentional. |  |
| REL-003 | Migration verification | Run `python manage.py makemigrations --check --dry-run`, `python manage.py migrate --check`, and inspect `showmigrations`. | No model changes are pending; all required migrations are applied. |  |
| REL-004 | Backend verification | Run backend automated tests and Python syntax/static checks. | All available tests pass; no syntax or import errors. |  |
| REL-005 | Frontend lint | Run `npm run lint`. | No lint errors or warnings. |  |
| REL-006 | Frontend production build | Run `npm run build`. | TypeScript compilation and Vite production build complete successfully. |  |
| REL-007 | Diff/format check | Run `git diff --check`. | No whitespace errors. |  |
| REL-008 | Backup and rollback | Verify database backup, migration rollback plan, and deployment rollback artifact. | Recovery procedure is documented and testable before release. |  |
| REL-009 | Production configuration | Verify secrets, allowed hosts, CORS origins, database credentials, email, HTTPS, and frontend API URL. | No development defaults or credentials are used in production. |  |
| REL-010 | QA sign-off | Review all failed/blocked cases and attach defect references. | All release-blocking cases pass or have explicit approval. |  |
