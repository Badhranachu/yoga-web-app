# Payment & Receipt System

Phase 9 uses a gateway-neutral payment ledger. The existing subscription and
single-slot services remain the business entry points; once those operations
complete successfully, they create a `PaymentTransaction` and immutable
`Receipt` in the same database transaction.

## Supported payment types

- Monthly subscription purchase or renewal.
- Single-slot payment.

The current layer does not call a payment gateway. `provider` and
`provider_transaction_id` are stored on each transaction so a future gateway
adapter can supply external identifiers without adding gateway-specific logic
to subscription, booking, or UI code.

## Receipt contents

Every successful payment creates a receipt containing:

- Receipt number
- Internal transaction ID
- User name and email
- Payment type
- Amount and currency
- Payment date
- Payment status

Receipts are immutable snapshots and can be downloaded as text files through
the receipt download endpoint.

## Access rules

- Members can view only their own payment history and download their own receipts.
- Admins can view all payment history, download all receipts, and view the successful-payment revenue summary.
- Revenue totals include only transactions with `status=successful`.
# Production gate

The current payment service is gateway-neutral ledger infrastructure, not a
live payment gateway. Production settings disable subscription purchase,
renewal, and single-slot payment mutations until a real provider adapter and
verified callback flow are integrated. Receipt and payment-history behavior
must be tested in development/staging only until then.
