-- Add partial payment support (deposit + balance)
-- Run this migration in your Supabase SQL editor

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_plan TEXT,
ADD COLUMN IF NOT EXISTS payment_amount_paid NUMERIC,
ADD COLUMN IF NOT EXISTS payment_amount_due NUMERIC,
ADD COLUMN IF NOT EXISTS payment_deposit_amount NUMERIC,
ADD COLUMN IF NOT EXISTS payment_last_request_amount NUMERIC;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_plan_check;
ALTER TABLE orders
ADD CONSTRAINT orders_payment_plan_check CHECK (payment_plan IN ('full', 'deposit'));

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;
ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check
CHECK (payment_status IN ('pending', 'initiated', 'deposit_paid', 'paid', 'pay_on_delivery', 'pay_on_pickup', 'failed', 'expired'));

-- Backfill existing rows
UPDATE orders
SET payment_plan = 'full'
WHERE payment_plan IS NULL;

UPDATE orders
SET payment_amount_paid = COALESCE(payment_amount_paid, CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END),
    payment_amount_due = COALESCE(payment_amount_due, CASE WHEN payment_status = 'paid' THEN 0 ELSE total_amount END),
    payment_deposit_amount = COALESCE(payment_deposit_amount, CEIL(total_amount * 0.5));

COMMENT ON COLUMN orders.payment_plan IS 'Payment plan: full or deposit';
COMMENT ON COLUMN orders.payment_amount_paid IS 'Amount paid so far';
COMMENT ON COLUMN orders.payment_amount_due IS 'Remaining balance';
COMMENT ON COLUMN orders.payment_deposit_amount IS 'Required deposit amount (50%)';
COMMENT ON COLUMN orders.payment_last_request_amount IS 'Amount requested in the last M-Pesa STK push';
