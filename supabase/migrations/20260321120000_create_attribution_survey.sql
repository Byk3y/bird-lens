CREATE TABLE public.attribution_survey (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  source text NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- One response per user
ALTER TABLE public.attribution_survey
  ADD CONSTRAINT attribution_survey_user_unique UNIQUE (user_id);

-- RLS
ALTER TABLE public.attribution_survey ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own survey response"
  ON public.attribution_survey FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read their own survey response"
  ON public.attribution_survey FOR SELECT
  USING (auth.uid() = user_id);
