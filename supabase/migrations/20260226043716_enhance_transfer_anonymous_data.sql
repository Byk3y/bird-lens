-- Create the enhanced transfer_anonymous_data function
CREATE OR REPLACE FUNCTION public.transfer_anonymous_data(old_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  anon_credits integer;
BEGIN
  -- 1. Transfer sightings
  UPDATE public.sightings 
  SET user_id = auth.uid()
  WHERE user_id = old_user_id;

  -- 2. Transfer user feedback
  UPDATE public.user_feedback
  SET user_id = auth.uid()
  WHERE user_id = old_user_id;

  -- 3. Merge identification credits
  -- Get credits from anonymous profile
  SELECT identifications_count INTO anon_credits 
  FROM public.profiles 
  WHERE id = old_user_id;

  IF anon_credits > 0 THEN
    UPDATE public.profiles
    SET identifications_count = identifications_count + anon_credits
    WHERE id = auth.uid();
  END IF;

  -- 4. Clean up the anonymous profile row 
  -- (auth.users row will be handled by Supabase eventually or kept)
  DELETE FROM public.profiles WHERE id = old_user_id;
END;
$function$;
