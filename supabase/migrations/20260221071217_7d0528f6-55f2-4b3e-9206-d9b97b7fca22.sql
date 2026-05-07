
-- Junction table for tasks <-> initiatives (many-to-many)
CREATE TABLE public.task_initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(task_id, initiative_id)
);

ALTER TABLE public.task_initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view task_initiatives in their org"
  ON public.task_initiatives FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_initiatives.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
  ));

CREATE POLICY "Managers or owners can insert task_initiatives"
  ON public.task_initiatives FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_initiatives.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR t.owner_id = auth.uid() OR t.created_by = auth.uid())
  ));

CREATE POLICY "Managers or owners can delete task_initiatives"
  ON public.task_initiatives FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_initiatives.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR t.owner_id = auth.uid() OR t.created_by = auth.uid())
  ));
