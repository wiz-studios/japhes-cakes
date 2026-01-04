-- Create the auto-expiry cron job for unpaid cake orders (every 5 minutes)
SELECT cron.schedule(
  'auto_expire_unpaid_cake_orders',
  '*/9 * * * *',
  $$
  UPDATE orders
  SET
    status = 'expired',
    payment_status = 'expired',
    cancelled_at = NOW()
  WHERE
    category = 'cake'
    AND payment_status = 'pending'
    AND expires_at IS NOT NULL
    AND expires_at <= NOW()
    AND status NOT IN ('expired', 'cancelled');
  $$
);

-- Verify the cron job exists
SELECT jobid, jobname, schedule, command
FROM cron.job;

-- Example: Mark a test order as expired for verification (replace <TEST_ORDER_ID> with a real ID)
-- UPDATE orders
-- SET expires_at = NOW() - INTERVAL '3 hours'
-- WHERE id = '<TEST_ORDER_ID>';

-- After 5 minutes, verify the order status
-- SELECT id, status, payment_status
-- FROM orders
-- WHERE id = '<TEST_ORDER_ID>';
