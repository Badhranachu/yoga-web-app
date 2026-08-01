# Booking API

## Create a booking

`POST /api/bookings/`

Request:

```json
{ "slot_id": 123 }
```

Successful bookings retain the existing response shape:

```json
{
  "success": true,
  "data": { "id": 456, "slot": {}, "status": "booked" },
  "message": "Slot booked successfully."
}
```

If another transaction committed a booking for the requested slot first, the
endpoint returns HTTP `409` without creating a booking for the requester:

```json
{
  "success": false,
  "errors": "This slot has already been booked.",
  "code": 409,
  "data": { "suggested_slot": {} }
}
```

The suggested slot is the next chronological available slot at the time of
conflict detection. It is not reserved by the conflict response. The client
must ask the member to accept or cancel; accepting submits a new request to
the same endpoint for the suggested slot.

If there is no later available slot, `suggested_slot` is `null` and no booking
is created.

## Transfer and reschedule requests

Admin transfer request:

`POST /api/bookings/transfer-requests/`

```json
{ "booking_id": 456, "slot_id": 789 }
```

User reschedule request:

`POST /api/bookings/reschedule-requests/`

```json
{ "booking_id": 456, "slot_id": 789 }
```

Both endpoints validate and lock the booking and target slot, but do not move
the booking. They create an auditable pending request and send an email
notification to the member or admins respectively.

Request lists:

- `GET /api/bookings/requests/me/` — the authenticated user's requests.
- `GET /api/bookings/requests/admin/` — admin-only studio-wide requests.

Decisions:

- `POST /api/bookings/requests/<id>/approve/` — booking owner accepts an admin transfer, or an admin approves a user reschedule.
- `POST /api/bookings/requests/<id>/reject/` — the same authorized recipient rejects the request.

Approval re-checks target availability under row locks. If the target is no
longer available, the request is not applied and a conflict response is
returned. Rejection never changes the booking. Existing booking and
subscription history is not rewritten.
