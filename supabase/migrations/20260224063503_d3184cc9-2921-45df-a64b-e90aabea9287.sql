ALTER TABLE public.kpis ADD COLUMN year integer NOT NULL DEFAULT 2026;
UPDATE public.kpis SET year = EXTRACT(YEAR FROM created_at)::integer;
CREATE INDEX idx_kpis_year ON public.kpis(year);