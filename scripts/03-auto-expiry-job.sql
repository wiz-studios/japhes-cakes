-- 1. Create a function to expire cake orders
CREATE OR REPLACE FUNCTION expire_unpaid_cakes() 
RETURNS void AS $$
BEGIN
  UPDATE orders
  SET payment_status = 'expired',
      status = 'cancelled'
  WHERE order_type = 'cake'
    AND payment_status = 'pending'
    AND expires_at < now()
    AND status NOT IN ('delivered', 'cancelled');
END;
$$ LANGUAGE plpgsql;

-- 2. Setup Cron Job (Requires pg_cron extension, available on Supabase)
-- This runs every 5 minutes
SELECT cron.schedule('expire-cakes', '*/5 * * * *', 'SELECT expire_unpaid_cakes()');

-- Documentation:
-- To deploy, run this in the Supabase SQL Editor. 
-- Ensure 'pg_cron' is enabled in Database > Extensions.
