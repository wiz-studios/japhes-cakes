-- School gallery assets for public /school page and admin management

CREATE TABLE IF NOT EXISTS school_gallery (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('students', 'cakes', 'pizza', 'class')),
    image_url TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_visible BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_school_gallery_category
ON school_gallery(category);

CREATE INDEX IF NOT EXISTS idx_school_gallery_sort
ON school_gallery(sort_order, created_at DESC);

ALTER TABLE school_gallery ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "school_gallery_public_read" ON school_gallery;
CREATE POLICY "school_gallery_public_read"
ON school_gallery
FOR SELECT
TO anon, authenticated
USING (is_visible = true);

-- Public bucket for school gallery images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school-gallery',
    'school-gallery',
    true,
    2097152,
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "school_gallery_bucket_public_read" ON storage.objects;
CREATE POLICY "school_gallery_bucket_public_read"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'school-gallery');
