-- Add mpesa_checkout_request_id to orders table
-- This is critical for matching callbacks to specific requests

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS mpesa_checkout_request_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_request_id ON orders(mpesa_checkout_request_id);

COMMENT ON COLUMN orders.mpesa_checkout_request_id IS 'Unique request ID for M-Pesa STK Push tracking';
