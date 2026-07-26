
CREATE TABLE public.matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  external_id TEXT NOT NULL,
  league TEXT,
  season TEXT,
  match_date TIMESTAMPTZ NOT NULL,
  home_team TEXT NOT NULL,
  away_team TEXT NOT NULL,
  home_score INT,
  away_score INT,
  ht_home_score INT,
  ht_away_score INT,
  status TEXT,
  stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (provider, external_id)
);
CREATE INDEX matches_league_date_idx ON public.matches (league, match_date DESC);
CREATE INDEX matches_teams_idx ON public.matches (home_team, away_team);
GRANT SELECT ON public.matches TO anon, authenticated;
GRANT ALL ON public.matches TO service_role;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
CREATE POLICY "matches_public_read" ON public.matches FOR SELECT USING (true);

CREATE TABLE public.match_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  minute INT NOT NULL,
  event_type TEXT NOT NULL,
  team TEXT,
  player TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX match_events_match_idx ON public.match_events (match_id, minute);
GRANT SELECT ON public.match_events TO anon, authenticated;
GRANT ALL ON public.match_events TO service_role;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_events_public_read" ON public.match_events FOR SELECT USING (true);

CREATE TABLE public.match_odds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  bookmaker TEXT,
  market TEXT NOT NULL,
  home_open NUMERIC,
  draw_open NUMERIC,
  away_open NUMERIC,
  home_close NUMERIC,
  draw_close NUMERIC,
  away_close NUMERIC,
  over_line NUMERIC,
  over_open NUMERIC,
  under_open NUMERIC,
  over_close NUMERIC,
  under_close NUMERIC,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX match_odds_match_idx ON public.match_odds (match_id);
GRANT SELECT ON public.match_odds TO anon, authenticated;
GRANT ALL ON public.match_odds TO service_role;
ALTER TABLE public.match_odds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "match_odds_public_read" ON public.match_odds FOR SELECT USING (true);

CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  overall_score NUMERIC NOT NULL,
  verdict TEXT NOT NULL,
  confidence NUMERIC NOT NULL,
  evidences JSONB NOT NULL DEFAULT '[]'::jsonb,
  data_completeness NUMERIC NOT NULL DEFAULT 0,
  providers_used TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX analyses_match_idx ON public.analyses (match_id, created_at DESC);
CREATE INDEX analyses_score_idx ON public.analyses (overall_score DESC);
GRANT SELECT ON public.analyses TO anon, authenticated;
GRANT ALL ON public.analyses TO service_role;
ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "analyses_public_read" ON public.analyses FOR SELECT USING (true);

CREATE TABLE public.detector_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_id UUID NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  detector TEXT NOT NULL,
  score NUMERIC NOT NULL,
  weight NUMERIC NOT NULL,
  reasons JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX detector_scores_analysis_idx ON public.detector_scores (analysis_id);
GRANT SELECT ON public.detector_scores TO anon, authenticated;
GRANT ALL ON public.detector_scores TO service_role;
ALTER TABLE public.detector_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "detector_scores_public_read" ON public.detector_scores FOR SELECT USING (true);
