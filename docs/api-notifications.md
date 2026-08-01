# Notifications API

- `GET /api/notifications/` — authenticated user's notifications.
- `GET /api/notifications/?unread=true` — authenticated user's unread notifications.
- `GET /api/notifications/unread-count/` — returns `{ "unread_count": N }`.
- `POST /api/notifications/<id>/read/` — marks one owned notification read.
- `POST /api/notifications/mark-all-read/` — marks all owned notifications read.

All endpoints are authenticated and scoped to the current user. Notification
records include event type, title, message, read state, related object
reference, action URL, and creation timestamp.
