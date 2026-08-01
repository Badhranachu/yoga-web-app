# Admin Reports API

All report endpoints require an authenticated admin user:

`GET /api/reports/<report>/`

Supported reports are `users`, `bookings`, `attendance`, `payments`,
`subscriptions`, `leaves`, and `transfers`.

Common query parameters:

- `search`: searches the report's relevant user, transaction, reason, or email fields
- `status`: applies the domain status filter
- `date_from` / `date_to`: filters the report's relevant date range
- `sort` and `order=asc|desc`: controls sorting
- `page` and `page_size`: pagination, with a maximum page size of 100
- `export=csv|pdf`: downloads the filtered and sorted report

JSON responses use the shared success envelope. CSV exports contain the report
columns and PDF exports contain a printable text report. The endpoint is
read-only and reuses the existing booking, attendance, payment, subscription,
leave, transfer, and account records.
