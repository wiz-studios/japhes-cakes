-- Capture post-order customer feedback and expose it to admin.

CREATE TABLE IF NOT EXISTS public.order_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  rating SMALLINT CHECK (rating BETWEEN 1 AND 5),
  comment TEXT CHECK (comment IS NULL OR char_length(trim(comment)) BETWEEN 2 AND 1200),
  submitted_from TEXT NOT NULL DEFAULT 'order_submitted',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT order_reviews_feedback_present CHECK (
    rating IS NOT NULL OR (comment IS NOT NULL AND char_length(trim(comment)) > 0)
  )
);

CREATE INDEX IF NOT EXISTS idx_order_reviews_created_at
ON public.order_reviews (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_reviews_order_id
ON public.order_reviews (order_id);

ALTER TABLE public.order_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_reviews FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_reviews_public_insert" ON public.order_reviews;
DROP POLICY IF EXISTS "order_reviews_admin_select" ON public.order_reviews;
DROP POLICY IF EXISTS "order_reviews_admin_update" ON public.order_reviews;
DROP POLICY IF EXISTS "order_reviews_admin_delete" ON public.order_reviews;

CREATE POLICY "order_reviews_public_insert"
ON public.order_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (rating IS NULL OR rating BETWEEN 1 AND 5)
  AND (comment IS NULL OR char_length(trim(comment)) BETWEEN 2 AND 1200)
  AND (rating IS NOT NULL OR (comment IS NOT NULL AND char_length(trim(comment)) > 0))
);

CREATE POLICY "order_reviews_admin_select"
ON public.order_reviews
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "order_reviews_admin_update"
ON public.order_reviews
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "order_reviews_admin_delete"
ON public.order_reviews
FOR DELETE
TO authenticated
USING (public.is_admin_user());
