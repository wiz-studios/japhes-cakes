-- Check all pg_cron jobs
SELECT * FROM cron.job;

-- Check for expired orders
SELECT * FROM orders WHERE payment_status = 'expired';
