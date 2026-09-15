-- ============================================================================
-- FIX: handle_new_user() silently kept a stale role on email-matched accounts
-- ============================================================================
-- Root cause: when a new Supabase Auth signup's email matched an existing
-- public.users row (e.g. a row pre-seeded by scripts/seed_production.mjs, or
-- left over from an earlier account state), the trigger only linked
-- auth_user_id and never re-synced `role` from the new signup's metadata. If
-- that pre-existing row's role didn't match what the new signup actually is
-- (owner vs driver), the account silently kept the old role forever — the
-- session/UI would show the new identity, but every owner-only API call
-- (e.g. PATCH /expenses/:id/approve) would 403 against the real, unsynced
-- role in public.users.
--
-- Fix: on an email match, sync `role` from the new signup's metadata when
-- one is explicitly provided (e.g. driver creation always passes
-- user_metadata.role = "driver"), otherwise keep the existing value so a
-- plain owner sign-in with no role metadata doesn't clobber it.
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
        role = lower(COALESCE(NEW.raw_user_meta_data->>'role', role)),
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

-- One-time correction: this account was already linked with a stale role
-- before the fix above existed, so the trigger fix alone won't repair it.
UPDATE public.users
SET role = 'owner'
WHERE lower(email) = lower('mohammedismail9788@gmail.com');
