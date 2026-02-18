-- School inquiry CRM mini-board data source

CREATE TABLE IF NOT EXISTS school_inquiries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    course TEXT NOT NULL,
    message TEXT,
    status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'interested', 'enrolled', 'dropped')),
    email_sent BOOLEAN NOT NULL DEFAULT false,
    source TEXT DEFAULT 'website',
    last_contacted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_inquiries_status_created
ON school_inquiries(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_school_inquiries_created_at
ON school_inquiries(created_at DESC);

ALTER TABLE school_inquiries ENABLE ROW LEVEL SECURITY;
