-- Add payment fields to orders table
-- Run this migration in your Supabase SQL editor

-- First, drop existing constraints if they exist
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Add columns if they don't exist
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS payment_status TEXT,
ADD COLUMN IF NOT EXISTS mpesa_phone TEXT,
ADD COLUMN IF NOT EXISTS mpesa_transaction_id TEXT;

-- Now add the correct constraints
ALTER TABLE orders
ADD CONSTRAINT orders_payment_method_check CHECK (payment_method IN ('mpesa', 'cash'));

ALTER TABLE orders
ADD CONSTRAINT orders_payment_status_check CHECK (payment_status IN ('pending', 'paid', 'pay_on_delivery', 'pay_on_pickup', 'failed'));

-- Set default values for existing orders
UPDATE orders
SET payment_method = 'cash',
    payment_status = CASE 
      WHEN fulfilment = 'delivery' THEN 'pay_on_delivery'
      ELSE 'pay_on_pickup'
    END
WHERE payment_method IS NULL;

-- Create index for faster payment status queries
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON orders(payment_method);

-- Add comment for documentation
COMMENT ON COLUMN orders.payment_method IS 'Payment method: mpesa or cash';
COMMENT ON COLUMN orders.payment_status IS 'Payment status: pending, paid, pay_on_delivery, pay_on_pickup, or failed';
COMMENT ON COLUMN orders.mpesa_phone IS 'M-Pesa phone number (if payment_method is mpesa)';
COMMENT ON COLUMN orders.mpesa_transaction_id IS 'M-Pesa transaction confirmation code';
