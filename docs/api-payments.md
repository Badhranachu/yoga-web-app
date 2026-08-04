# Payments API

## Razorpay checkout flow

Purchasing/renewing a subscription or paying per slot is a two-step flow —
no subscription/slot-purchase row is created until a real Razorpay payment
is verified:

1. `POST /api/payments/orders/create/` with `{"payment_type": "subscription"|"single_slot"}`.
   Returns a Razorpay order for the current plan price / single-slot price:

   ```json
   {
     "success": true,
     "data": {
       "order_id": "order_...",
       "amount": 120000,
       "currency": "INR",
       "key_id": "rzp_test_...",
       "payment_type": "subscription"
     }
   }
   ```

   The frontend opens Razorpay Checkout with these values.

2. `POST /api/payments/orders/verify/` once checkout succeeds, with
   `{"action": "purchase"|"renew"|"slot", "razorpay_order_id", "razorpay_payment_id", "razorpay_signature"}`.
   The signature is verified server-side (HMAC-SHA256 with
   `RAZORPAY_KEY_SECRET`) before the domain action runs. Only on success is
   the subscription purchased/renewed or the slot purchase recorded:

   ```json
   {
     "success": true,
     "data": {
       "subscription": {},
       "payment": {
         "transaction_id": "txn_...",
         "provider": "razorpay",
         "provider_transaction_id": "pay_...",
         "amount": "1200.00",
         "currency": "INR",
         "status": "successful",
         "receipt": {
           "receipt_number": "EKAM-20260801-..."
         }
       }
     }
   }
   ```

   Single-slot payments (`action: "slot"`) return `purchase` instead of
   `subscription`. An invalid/forged signature returns `400` and nothing is
   created.

Both endpoints require `PAYMENT_PROCESSING_ENABLED=True` (the default) and
`RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` configured in `.env`.

## Payment history

`GET /api/payments/history/`

Returns the authenticated user's payment history. Admins receive studio-wide
history from the same endpoint.

## Revenue summary

`GET /api/payments/revenue/`

Admin-only. Returns successful transaction count, total revenue in INR, and
totals grouped by payment type.

## Receipt download

`GET /api/payments/receipts/<receipt_id>/download/`

The payer or an admin can download the receipt as a text file. Other users
receive a forbidden response.
