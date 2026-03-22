-- Replace increment_identification_count to enforce a server-side cap of 3 for free users.
-- Pro users also call this function, so we silently return the current count
-- instead of raising an error when the limit is reached.
CREATE OR REPLACE FUNCTION public.increment_identification_count(p_user_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  new_count integer;
  current_count integer;
BEGIN
  -- Guard: Only allow users to increment their own count
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'You can only increment your own identification count';
  END IF;

  -- Get current count
  SELECT identifications_count INTO current_count
  FROM public.profiles
  WHERE id = p_user_id;

  -- If already at or above the free limit, return current count without incrementing
  IF current_count >= 3 THEN
    RETURN current_count;
  END IF;

  UPDATE public.profiles
  SET identifications_count = identifications_count + 1
  WHERE id = p_user_id
  RETURNING identifications_count INTO new_count;

  RETURN new_count;
END;
$function$;
