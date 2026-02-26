# Resilience Hardening (Next.js + Supabase + Lipana)

This project now includes baseline protections for traffic spikes, duplicate requests, and external dependency slowdowns.

## Implemented

### Rate limiting
- `POST /api/school-inquiry`
- `POST /api/mpesa/stk`
- `POST /api/mpesa/callback`
- `POST /api/mpesa/c2b/validation`
- `POST /api/mpesa/c2b/confirmation`
- `POST /api/mpesa/c2b/register`
- Order submission server actions (`submitCakeOrder`, `submitPizzaOrder`) now include a burst limiter.

### Idempotency
- DB-backed idempotency table: `idempotency_keys`
- Order submit actions accept and honor `idempotencyKey`
- STK initiation accepts and honors `idempotencyKey`
- STK and C2B callbacks remain replay-safe using `payment_attempts` uniqueness + processed checks

### Timeout + graceful degradation
- Daraja HTTP calls now use `fetchWithTimeout`
- Turnstile verification now uses timeout wrapper
- SMTP sends have socket timeouts
- School inquiry lead is persisted first and returns quickly; email send runs asynchronously (`after()`)

### Webhook safety
- Optional shared secret support for callbacks
- Optional HMAC signature verification support
- Fast callback response with async processing path

### Database scale
- Added index migration for:
  - `orders.created_at`
  - `orders.status`
  - `orders.phone`
  - `orders.payment_status`
  - `orders.mpesa_checkout_request_id`
  - conditional `orders.lipana_checkout_request_id` if column exists
  - `order_items.order_id`
- Admin dashboard now uses pagination + status/date filters

### Read-pressure reduction
- Delivery zones now use in-process cache (`lib/delivery-zones-cache.ts`)
- Removed broad `select("*")` usage from key order/admin pages

### Monitoring
- `GET /api/health`
- `GET /api/health?deep=1` adds DB probe
- Correlation/request IDs now included in critical logs for order/payment transitions
- Admin paid-order alerts now send WhatsApp messages automatically from STK + C2B success callbacks
- `GET /api/cron/payment-reconcile` re-checks stuck M-Pesa STK requests against Daraja and syncs order/payment state

### Load testing scaffold
- k6 script: `load-tests/k6-basic.js`
- Covers landing page, health check, inquiry submit, payment init, and status lookup

## Required migration

Run:

```bash
node scripts/setup-supabase.js --db "<DATABASE_URL>"
```

or, if migrating old/new:

```bash
node scripts/migrate-supabase.js --old "<OLD_DATABASE_URL>" --new "<NEW_DATABASE_URL>"
```

## Suggested env vars

```bash
MPESA_HTTP_TIMEOUT_MS=5000
TURNSTILE_TIMEOUT_MS=4000
SMTP_TIMEOUT_MS=8000
DELIVERY_ZONES_CACHE_TTL_MS=300000
ORDER_SUBMIT_RATE_LIMIT_PER_MINUTE=3
ADMIN_DASHBOARD_PAGE_SIZE=50

# Optional webhook auth hardening
MPESA_CALLBACK_SECRET=
MPESA_CALLBACK_HMAC_SECRET=
MPESA_C2B_CALLBACK_SECRET=
MPESA_C2B_CALLBACK_HMAC_SECRET=

# Optional admin payment alerts (WhatsApp Cloud API)
ENABLE_ADMIN_PAYMENT_ALERTS=true
ADMIN_PAYMENT_ALERT_WHATSAPP_TO=2547XXXXXXXX
WHATSAPP_ALERT_ACCESS_TOKEN=
WHATSAPP_ALERT_PHONE_NUMBER_ID=
WHATSAPP_ALERT_API_VERSION=v22.0

# Cron auth + reconciliation worker
CRON_SECRET=
MPESA_RECONCILE_BATCH_SIZE=25
MPESA_RECONCILE_LOOKBACK_MINUTES=360
```

## Scheduler setup

Vercel Hobby does not support minute-level cron schedules, so deployments fail if `vercel.json` includes `*/N` cron expressions.

- Hobby plan: use GitHub Actions scheduler (`.github/workflows/payment-reconcile-cron.yml`)
- Pro/Enterprise: you can use Vercel Cron with minute-level schedules

Required GitHub config for Hobby scheduler:

- Repository secret: `CRON_SECRET` (same value as your app env `CRON_SECRET`)
- Optional repository variable: `CRON_BASE_URL` (defaults to `https://japhes-cakes.vercel.app`)

## k6 usage

```bash
k6 run load-tests/k6-basic.js \
  -e BASE_URL=https://your-domain.com \
  -e TEST_PHONE=0712345678 \
  -e TEST_ORDER_ID=P512K82
```

For realistic payment-init tests, use a real test order ID and phone in sandbox.

## One-command prelaunch check

Run before production cutover:

```bash
npm run prelaunch:check
```

This validates required env vars, callback URL shape, and required migration files.
