# Webhook + RLS Production Cutover

This pass enforces stricter webhook authentication and hardens Supabase RLS policies.

## 1) Apply migration

Run:

```bash
-- in Supabase SQL editor
\i migrations/rls_production_cutover.sql
```

or via setup script:

```bash
node scripts/setup-supabase.js --db "<DATABASE_URL>"
```

## 2) Add at least one admin identity

The new RLS checks use:
- JWT role claim (`role=admin` or `user_metadata.role=admin`), or
- `admin_users` allowlist.

Add your admin email:

```sql
insert into public.admin_users (email, is_active)
values ('you@example.com', true)
on conflict (email) do update set is_active = excluded.is_active, updated_at = now();
```

## 3) Webhook strict envs (required in production)

Set these for STK/C2B callbacks:

```bash
MPESA_CALLBACK_SECRET=...
MPESA_C2B_CALLBACK_SECRET=...
```

Optional but stronger:

```bash
MPESA_CALLBACK_HMAC_SECRET=...
MPESA_C2B_CALLBACK_HMAC_SECRET=...
```

Notes:
- In `NODE_ENV=production`, webhook auth now fails closed if secrets are missing.
- C2B register endpoint also requires `MPESA_REGISTER_SECRET` in production.

## 4) Verify

1. Trigger STK callback in sandbox and confirm it returns `200` + updates order.
2. Trigger C2B validation/confirmation and confirm accepted only with correct auth headers.
3. Open admin dashboard and confirm data visible for your admin account.
4. Confirm non-admin authenticated account cannot read/update admin data via Supabase.
