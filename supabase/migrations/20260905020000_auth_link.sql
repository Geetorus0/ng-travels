-- ============================================================================
-- NG TRAVELS — SUPABASE AUTH LINKAGE
-- Links auth.users identities to public.users (role, driver_id) so RLS
-- policies and the API server's session verification can resolve them.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  matched_id INTEGER;
BEGIN
  -- Link to an existing ops-created user row matched by email, if any.
  SELECT id INTO matched_id
  FROM public.users
  WHERE email IS NOT NULL AND lower(email) = lower(NEW.email)
  LIMIT 1;

  IF matched_id IS NOT NULL THEN
    UPDATE public.users
    SET auth_user_id = NEW.id,
        last_login = now()
    WHERE id = matched_id;
  ELSE
    INSERT INTO public.users (auth_user_id, name, email, phone, role, status)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
      NEW.email,
      NEW.phone,
      lower(COALESCE(NEW.raw_user_meta_data->>'role', 'owner')),
      'active'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Helper functions for RLS policies
CREATE OR REPLACE FUNCTION public.current_app_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_driver_id()
RETURNS INTEGER AS $$
  SELECT driver_id FROM public.users WHERE auth_user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;
