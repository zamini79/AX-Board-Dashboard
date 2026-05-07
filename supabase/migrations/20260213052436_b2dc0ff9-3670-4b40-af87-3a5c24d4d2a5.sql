
-- 1. Create junction table
CREATE TABLE public.task_kpis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, kpi_id)
);

-- 2. Enable RLS
ALTER TABLE public.task_kpis ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view task_kpis in their org"
ON public.task_kpis FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_kpis.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
  )
);

CREATE POLICY "Managers or owners can insert task_kpis"
ON public.task_kpis FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_kpis.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR t.owner_id = auth.uid() OR t.created_by = auth.uid())
  )
);

CREATE POLICY "Managers or owners can delete task_kpis"
ON public.task_kpis FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_kpis.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR t.owner_id = auth.uid() OR t.created_by = auth.uid())
  )
);

-- 4. Migrate existing data
INSERT INTO public.task_kpis (task_id, kpi_id)
SELECT id, kpi_id FROM public.tasks WHERE kpi_id IS NOT NULL;

-- 5. Drop old column
ALTER TABLE public.tasks DROP COLUMN kpi_id;
