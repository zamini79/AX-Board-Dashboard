
ALTER TABLE public.kpis
  ADD COLUMN parent_id uuid REFERENCES public.kpis(id) ON DELETE SET NULL;

CREATE INDEX idx_kpis_parent_id ON public.kpis(parent_id);
