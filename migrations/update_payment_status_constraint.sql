-- Update payment status constraint to include 'initiated'
-- This fixes the error: violates check constraint "orders_payment_status_check"

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check 
CHECK (payment_status IN ('pending', 'initiated', 'paid', 'pay_on_delivery', 'pay_on_pickup', 'failed'));

COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, initiated, paid, pay_on_delivery, pay_on_pickup, failed';
