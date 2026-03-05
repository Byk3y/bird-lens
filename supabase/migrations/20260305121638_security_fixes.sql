-- Security Fix Migration
-- Addresses: data theft via transfer_anonymous_data, credit manipulation via
-- increment_identification_count, email enumeration via check_email_exists,
-- public storage bucket, and overly broad RPC grants.

-- =============================================================================
-- 1. FIX: transfer_anonymous_data — Add anonymous user verification guard
-- =============================================================================
-- The old function accepted any UUID and transferred that user's data to the
-- caller with no validation. A malicious user could steal any other user's
-- sightings, feedback, and credits.

CREATE OR REPLACE FUNCTION public.transfer_anonymous_data(old_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  anon_credits integer;
  is_anon boolean;
BEGIN
  -- Guard: Prevent self-transfer (no-op)
  IF old_user_id = auth.uid() THEN
    RETURN;
  END IF;

  -- Guard: Verify old_user_id belongs to an anonymous user
  SELECT is_anonymous INTO is_anon
  FROM auth.users
  WHERE id = old_user_id;

  IF is_anon IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  IF NOT is_anon THEN
    RAISE EXCEPTION 'Source account is not anonymous';
  END IF;

  -- 1. Transfer sightings
  UPDATE public.sightings
  SET user_id = auth.uid()
  WHERE user_id = old_user_id;

  -- 2. Transfer user feedback
  UPDATE public.user_feedback
  SET user_id = auth.uid()
  WHERE user_id = old_user_id;

  -- 3. Merge identification credits
  SELECT identifications_count INTO anon_credits
  FROM public.profiles
  WHERE id = old_user_id;

  IF anon_credits IS NOT NULL AND anon_credits > 0 THEN
    UPDATE public.profiles
    SET identifications_count = identifications_count + anon_credits
    WHERE id = auth.uid();
  END IF;

  -- 4. Clean up the anonymous profile row
  DELETE FROM public.profiles WHERE id = old_user_id;
END;
$function$;

-- =============================================================================
-- 2. FIX: increment_identification_count — Restrict to self-only
-- =============================================================================
-- The old function allowed any user to increment any other user's count.

CREATE OR REPLACE FUNCTION public.increment_identification_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count integer;
BEGIN
  -- Guard: Only allow users to increment their own count
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only increment your own identification count';
  END IF;

  UPDATE public.profiles
  SET identifications_count = identifications_count + 1
  WHERE id = p_user_id
  RETURNING identifications_count INTO new_count;

  RETURN new_count;
END;
$function$;

-- =============================================================================
-- 3. NOTE: check_email_exists — Anon access intentionally kept
-- =============================================================================
-- This function is called pre-auth during signup (lib/auth.tsx:172-181) to
-- check email availability. Revoking anon access would break the signup flow.
-- Mitigation: consider adding server-side rate limiting to prevent bulk
-- enumeration, or move the check into a server-side signup validation flow.

-- =============================================================================
-- 4. NOTE: Sightings storage bucket is public (intentionally deferred)
-- =============================================================================
-- The sightings bucket is currently public, meaning anyone with a file URL can
-- access user photos/audio. Making it private requires migrating the client to
-- use signed URLs (createSignedUrl) instead of getPublicUrl in:
--   - hooks/useBirdIdentification.ts (lines 371-375, 399-403)
--   - app/(tabs)/collection.tsx (all image_url references)
-- This is deferred to avoid breaking existing stored URLs. Upload/delete
-- operations are already restricted to the file owner via storage RLS policies.

-- =============================================================================
-- 5. FIX: Revoke anon/PUBLIC from sensitive RPC functions
-- =============================================================================
-- These SECURITY DEFINER functions should only be callable by authenticated users.

REVOKE EXECUTE ON FUNCTION public.transfer_anonymous_data(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.transfer_anonymous_data(uuid) FROM PUBLIC;

REVOKE EXECUTE ON FUNCTION public.increment_identification_count(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.increment_identification_count(uuid) FROM PUBLIC;
