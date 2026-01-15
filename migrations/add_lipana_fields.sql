-- Add Lipana tracking fields to orders table
-- Safe to run multiple times

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS lipana_checkout_request_id TEXT,
ADD COLUMN IF NOT EXISTS lipana_transaction_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_lipana_checkout_request_id
ON orders(lipana_checkout_request_id);

COMMENT ON COLUMN orders.lipana_checkout_request_id IS 'Lipana checkout request ID for STK Push tracking';
COMMENT ON COLUMN orders.lipana_transaction_id IS 'Lipana transaction reference (receipt ID)';
