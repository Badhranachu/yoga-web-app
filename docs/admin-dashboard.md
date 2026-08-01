# Admin Dashboard

Phase 11 adds the admin overview at the existing dashboard route. It reuses
the existing sidebar, topbar, homepage palette, typography, and notification
bell.

Cards are supplied by `GET /api/dashboard/overview/`: today's bookings and
revenue, month-to-date and lifetime successful revenue, registered users,
active and expired subscriptions, future booked and available slots, pending
transfer requests, and upcoming leaves.

The trend widgets show the last seven studio-local calendar days. Revenue is
grouped from successful payments, bookings include booked and attended
reservations (cancelled bookings are excluded), and subscriptions are grouped
by creation date. Recent payments and bookings are read-only summaries.

Access is restricted to admin users by the backend permission layer. No Phase
11 database tables or columns were added.
