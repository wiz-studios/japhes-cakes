-- Harden order reviews to be optional (rating/comment) and anonymous (no PII stored).

ALTER TABLE public.order_reviews
  DROP COLUMN IF EXISTS customer_name,
  DROP COLUMN IF EXISTS customer_phone;

ALTER TABLE public.order_reviews
  ALTER COLUMN rating DROP NOT NULL,
  ALTER COLUMN rating DROP DEFAULT,
  ALTER COLUMN comment DROP NOT NULL;

ALTER TABLE public.order_reviews
  DROP CONSTRAINT IF EXISTS order_reviews_rating_check,
  DROP CONSTRAINT IF EXISTS order_reviews_comment_check,
  DROP CONSTRAINT IF EXISTS order_reviews_feedback_present;

ALTER TABLE public.order_reviews
  ADD CONSTRAINT order_reviews_rating_check CHECK (rating IS NULL OR rating BETWEEN 1 AND 5),
  ADD CONSTRAINT order_reviews_comment_check CHECK (comment IS NULL OR char_length(trim(comment)) BETWEEN 2 AND 1200),
  ADD CONSTRAINT order_reviews_feedback_present CHECK (
    rating IS NOT NULL OR (comment IS NOT NULL AND char_length(trim(comment)) > 0)
  );

DROP POLICY IF EXISTS "order_reviews_public_insert" ON public.order_reviews;

CREATE POLICY "order_reviews_public_insert"
ON public.order_reviews
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (rating IS NULL OR rating BETWEEN 1 AND 5)
  AND (comment IS NULL OR char_length(trim(comment)) BETWEEN 2 AND 1200)
  AND (rating IS NOT NULL OR (comment IS NOT NULL AND char_length(trim(comment)) > 0))
);
