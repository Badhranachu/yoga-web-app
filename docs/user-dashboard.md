# User Dashboard

Phase 12 extends the existing member account route at `/account` with a
responsive dashboard using the homepage design tokens and shared account
layout.

The dashboard reuses the existing booking, subscription, payment, receipt,
notification, authentication, and booking-change APIs. It provides:

- Subscription status, sessions remaining, sessions used, and next booking
- Upcoming bookings and complete booking history
- Recent payment, payment history, and receipt downloads
- Notifications and the authenticated user's profile summary

Booking cancellation, reschedule requests, and transfer approval remain on the
existing booking flow. No new business rules or database structures were
introduced in Phase 12.
