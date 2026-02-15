-- Busy mode control + cake design image support.
-- Run this migration in Supabase SQL editor.

ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS design_image_url TEXT;

COMMENT ON COLUMN order_items.design_image_url IS 'Optional uploaded reference image for custom cake design';

CREATE TABLE IF NOT EXISTS store_settings (
    id BOOLEAN PRIMARY KEY DEFAULT TRUE CHECK (id = TRUE),
    busy_mode_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    busy_mode_action TEXT NOT NULL DEFAULT 'disable_orders'
        CHECK (busy_mode_action IN ('disable_orders', 'increase_eta')),
    busy_mode_extra_minutes INTEGER NOT NULL DEFAULT 20
        CHECK (busy_mode_extra_minutes >= 0 AND busy_mode_extra_minutes <= 180),
    busy_mode_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO store_settings (id, busy_mode_enabled, busy_mode_action, busy_mode_extra_minutes, busy_mode_message)
VALUES (TRUE, FALSE, 'disable_orders', 20, 'We are currently overloaded. Please try again shortly.')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE store_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "store_settings_public_read" ON store_settings;
CREATE POLICY "store_settings_public_read"
ON store_settings
FOR SELECT
TO anon, authenticated
USING (TRUE);

DROP POLICY IF EXISTS "store_settings_authenticated_update" ON store_settings;
CREATE POLICY "store_settings_authenticated_update"
ON store_settings
FOR UPDATE
TO authenticated
USING (TRUE)
WITH CHECK (TRUE);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'cake-designs',
    'cake-designs',
    TRUE,
    4194304,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "cake_designs_bucket_public_read" ON storage.objects;
CREATE POLICY "cake_designs_bucket_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'cake-designs');
