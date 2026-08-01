# Notification System

Phase 10 provides reusable in-app notifications through the dedicated
`apps.notifications` domain. Booking, transfer/reschedule, subscription, and
payment services call `NotificationService`; they do not write notification
rows directly.

## Supported events

- Booking confirmed or cancelled.
- Transfer requested, approved, or rejected.
- Reschedule requested, approved, or rejected.
- Subscription purchased, renewed, or expired.
- Payment successful.

Notifications are recipient-specific, unread by default, and deduplicated for
lifecycle events using a stable event key. Users can only access their own
notifications.

## Delivery boundary

The current channel is `in_app`. The notification service and stored channel
field are intentionally independent from business modules, allowing email and
SMS adapters to be added later without changing booking, subscription, or
payment workflows.

## UI behavior

The reusable notification bell is mounted in both dashboard layouts. It shows
the unread counter, opens the latest notifications, supports individual read
actions, and supports Mark All Read.
