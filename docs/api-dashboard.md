# Admin Dashboard API

## `GET /api/dashboard/overview/`

Requires an authenticated user with the `admin` role. The endpoint is
read-only and returns the shared success envelope. It includes the eleven
dashboard metrics, five recent payments, five recent bookings, and seven daily
points for each of the revenue, booking, and subscription trends.

Revenue values are strings in the payment currency (currently AED). The
aggregate keeps the dashboard from duplicating domain API calls in the
browser.
