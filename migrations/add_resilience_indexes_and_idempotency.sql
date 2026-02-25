-- Resilience hardening:
-- 1) Add required indexes for high-read/high-write paths
-- 2) Add idempotency key storage to safely replay duplicate critical requests

CREATE INDEX IF NOT EXISTS idx_orders_created_at
ON orders (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_status
ON orders (status);

CREATE INDEX IF NOT EXISTS idx_orders_phone
ON orders (phone);

CREATE INDEX IF NOT EXISTS idx_orders_payment_status
ON orders (payment_status);

CREATE INDEX IF NOT EXISTS idx_orders_mpesa_checkout_request_id
ON orders (mpesa_checkout_request_id)
WHERE mpesa_checkout_request_id IS NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'lipana_checkout_request_id'
  ) THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_orders_lipana_checkout_request_id ON public.orders (lipana_checkout_request_id)';
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_order_items_order_id
ON order_items (order_id);

CREATE TABLE IF NOT EXISTS idempotency_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope TEXT NOT NULL,
  idempotency_key TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'processing',
  resource_id TEXT,
  response_json JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
  CONSTRAINT idempotency_keys_status_check CHECK (status IN ('processing', 'completed', 'failed')),
  CONSTRAINT uq_idempotency_scope_key UNIQUE (scope, idempotency_key)
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
ON idempotency_keys (expires_at);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_scope_status_created_at
ON idempotency_keys (scope, status, created_at DESC);

ALTER TABLE idempotency_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'anon'
  ) THEN
    EXECUTE 'REVOKE ALL ON TABLE idempotency_keys FROM anon';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE rolname = 'authenticated'
  ) THEN
    EXECUTE 'REVOKE ALL ON TABLE idempotency_keys FROM authenticated';
  END IF;
END
$$;
