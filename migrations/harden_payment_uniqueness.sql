-- Prevent duplicate payment references from being processed more than once.

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_mpesa_checkout_request_id
ON orders (mpesa_checkout_request_id)
WHERE mpesa_checkout_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_mpesa_transaction_id
ON orders (mpesa_transaction_id)
WHERE mpesa_transaction_id IS NOT NULL;
