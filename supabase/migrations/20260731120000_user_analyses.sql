-- Per-user history of which analyses they've looked up. The underlying
-- matches/analyses stay shared/global (so the same match isn't re-fetched
-- and re-analyzed for every user — important once this sells to multiple
-- clubs/confederations), while each account only sees its own history.
CREATE TABLE public.user_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, analysis_id)
);
CREATE INDEX user_analyses_user_idx ON public.user_analyses (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.user_analyses TO authenticated;
GRANT ALL ON public.user_analyses TO service_role;
ALTER TABLE public.user_analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_analyses_own_read" ON public.user_analyses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "user_analyses_own_insert" ON public.user_analyses FOR INSERT WITH CHECK (auth.uid() = user_id);
