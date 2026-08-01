# Payments API

## Payment actions

Existing payment actions remain:

- `POST /api/payments/subscriptions/purchase/`
- `POST /api/payments/subscriptions/renew/`
- `POST /api/payments/slot-purchases/`

Successful responses now include the domain result and the generated payment:

```json
{
  "success": true,
  "data": {
    "subscription": {},
    "payment": {
      "transaction_id": "txn_...",
      "amount": "1200.00",
      "currency": "AED",
      "status": "successful",
      "receipt": {
        "receipt_number": "EKAM-20260801-..."
      }
    }
  }
}
```

Single-slot payments return `purchase` instead of `subscription`.

## Payment history

`GET /api/payments/history/`

Returns the authenticated user's payment history. Admins receive studio-wide
history from the same endpoint.

## Revenue summary

`GET /api/payments/revenue/`

Admin-only. Returns successful transaction count, total revenue in AED, and
totals grouped by payment type.

## Receipt download

`GET /api/payments/receipts/<receipt_id>/download/`

The payer or an admin can download the receipt as a text file. Other users
receive a forbidden response.
