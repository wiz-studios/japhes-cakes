-- Track M-Pesa STK attempts and guard against replayed callbacks.

CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
    checkout_request_id TEXT,
    merchant_request_id TEXT,
    mpesa_receipt TEXT,
    result_code INTEGER,
    result_desc TEXT,
    amount NUMERIC,
    phone TEXT,
    status TEXT NOT NULL DEFAULT 'received',
    processed_at TIMESTAMPTZ,
    raw_payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_order_id
ON payment_attempts(order_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_checkout_request_id
ON payment_attempts(checkout_request_id)
WHERE checkout_request_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_payment_attempts_mpesa_receipt
ON payment_attempts(mpesa_receipt)
WHERE mpesa_receipt IS NOT NULL;
