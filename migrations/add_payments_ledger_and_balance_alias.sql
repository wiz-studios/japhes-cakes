-- Adds a payments ledger for each STK attempt and an optional amount_paid alias on orders.
-- Safe to run multiple times.

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS amount_paid NUMERIC NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'payment_amount_paid'
  ) THEN
    UPDATE orders
    SET amount_paid = COALESCE(payment_amount_paid, amount_paid, 0)
    WHERE amount_paid IS DISTINCT FROM COALESCE(payment_amount_paid, amount_paid, 0);
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  amount NUMERIC,
  method TEXT NOT NULL DEFAULT 'mpesa' CHECK (method IN ('mpesa', 'cash')),
  status TEXT NOT NULL CHECK (status IN ('initiated', 'success', 'failed')),
  lipana_transaction_id TEXT,
  lipana_checkout_request_id TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_order_created_at
ON payments(order_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_payments_status
ON payments(status);

CREATE INDEX IF NOT EXISTS idx_payments_checkout_request_id
ON payments(lipana_checkout_request_id)
WHERE lipana_checkout_request_id IS NOT NULL;
