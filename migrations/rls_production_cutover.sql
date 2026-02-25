-- Production cutover RLS hardening
-- Goals:
-- 1) Remove broad authenticated access on core operational tables
-- 2) Restrict admin access to explicit admin role/allowlist
-- 3) Force RLS on sensitive tables

CREATE TABLE IF NOT EXISTS public.admin_users (
  email TEXT PRIMARY KEY,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_users_is_active
ON public.admin_users (is_active);

CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_payload JSONB;
  email_claim TEXT;
  role_claim TEXT;
  metadata_role_claim TEXT;
BEGIN
  jwt_payload := auth.jwt();
  role_claim := lower(coalesce(jwt_payload->>'role', ''));
  metadata_role_claim := lower(coalesce(jwt_payload->'user_metadata'->>'role', ''));

  IF role_claim = 'admin' OR metadata_role_claim = 'admin' THEN
    RETURN TRUE;
  END IF;

  email_claim := lower(coalesce(jwt_payload->>'email', ''));
  IF email_claim = '' THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.admin_users au
    WHERE lower(au.email) = email_claim
      AND au.is_active = TRUE
  );
END;
$$;

REVOKE ALL ON FUNCTION public.is_admin_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin_user() TO anon, authenticated;

ALTER TABLE public.delivery_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.delivery_zones FORCE ROW LEVEL SECURITY;
ALTER TABLE public.orders FORCE ROW LEVEL SECURITY;
ALTER TABLE public.order_items FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_notes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.payment_attempts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.school_inquiries FORCE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings FORCE ROW LEVEL SECURITY;
ALTER TABLE public.admin_users FORCE ROW LEVEL SECURITY;

-- Cleanup broad legacy policies
DROP POLICY IF EXISTS "Admin full access for delivery_zones" ON public.delivery_zones;
DROP POLICY IF EXISTS "Admin full access for orders" ON public.orders;
DROP POLICY IF EXISTS "Admin full access for order_items" ON public.order_items;
DROP POLICY IF EXISTS "Admin full access for admin_notes" ON public.admin_notes;
DROP POLICY IF EXISTS "Public insert access for orders" ON public.orders;
DROP POLICY IF EXISTS "Public read access for own orders" ON public.orders;
DROP POLICY IF EXISTS "Public insert access for order items" ON public.order_items;
DROP POLICY IF EXISTS "store_settings_authenticated_update" ON public.store_settings;

-- Delivery zones: public read, admin modify
DROP POLICY IF EXISTS "Public read access for delivery zones" ON public.delivery_zones;
CREATE POLICY "delivery_zones_public_read"
ON public.delivery_zones
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "delivery_zones_admin_insert"
ON public.delivery_zones
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "delivery_zones_admin_update"
ON public.delivery_zones
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "delivery_zones_admin_delete"
ON public.delivery_zones
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Orders: admin read/modify only (public access now via trusted server endpoints/actions)
CREATE POLICY "orders_admin_select"
ON public.orders
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "orders_admin_insert"
ON public.orders
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "orders_admin_update"
ON public.orders
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "orders_admin_delete"
ON public.orders
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Order items: admin read/modify only
CREATE POLICY "order_items_admin_select"
ON public.order_items
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "order_items_admin_insert"
ON public.order_items
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "order_items_admin_update"
ON public.order_items
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "order_items_admin_delete"
ON public.order_items
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Admin notes: admin only
CREATE POLICY "admin_notes_admin_select"
ON public.admin_notes
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "admin_notes_admin_insert"
ON public.admin_notes
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_notes_admin_update"
ON public.admin_notes
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "admin_notes_admin_delete"
ON public.admin_notes
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Payment attempts: admin read only
CREATE POLICY "payment_attempts_admin_select"
ON public.payment_attempts
FOR SELECT
TO authenticated
USING (public.is_admin_user());

-- School inquiries: public insert + admin read/update/delete
DROP POLICY IF EXISTS "school_inquiries_public_insert" ON public.school_inquiries;
CREATE POLICY "school_inquiries_public_insert"
ON public.school_inquiries
FOR INSERT
TO anon, authenticated
WITH CHECK (
  status = 'new'
  AND email_sent = false
);

CREATE POLICY "school_inquiries_admin_select"
ON public.school_inquiries
FOR SELECT
TO authenticated
USING (public.is_admin_user());

CREATE POLICY "school_inquiries_admin_update"
ON public.school_inquiries
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

CREATE POLICY "school_inquiries_admin_delete"
ON public.school_inquiries
FOR DELETE
TO authenticated
USING (public.is_admin_user());

-- Store settings: public read + admin write
DROP POLICY IF EXISTS "store_settings_public_read" ON public.store_settings;
CREATE POLICY "store_settings_public_read"
ON public.store_settings
FOR SELECT
TO anon, authenticated
USING (TRUE);

CREATE POLICY "store_settings_admin_insert"
ON public.store_settings
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_user());

CREATE POLICY "store_settings_admin_update"
ON public.store_settings
FOR UPDATE
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Admin allowlist table access
CREATE POLICY "admin_users_self_read"
ON public.admin_users
FOR SELECT
TO authenticated
USING (
  public.is_admin_user()
  OR lower(email) = lower(coalesce(auth.jwt()->>'email', ''))
);

CREATE POLICY "admin_users_admin_manage"
ON public.admin_users
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());
