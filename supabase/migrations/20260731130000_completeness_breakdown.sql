-- Persist the per-match "which variables did we actually have" breakdown so
-- the match detail page can show it without recomputing (and so it survives
-- reloads of an already-analyzed match).
ALTER TABLE public.analyses
  ADD COLUMN completeness_breakdown JSONB NOT NULL DEFAULT '[]'::jsonb;
