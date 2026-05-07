
-- Create kpi_attachments table
CREATE TABLE public.kpi_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
  description text,
  file_name text,
  file_url text,
  file_size bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.kpi_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: org members can view
CREATE POLICY "Users can view kpi attachments"
  ON public.kpi_attachments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM kpis k WHERE k.id = kpi_attachments.kpi_id AND is_member_of_org(auth.uid(), k.org_id)
  ));

-- INSERT: org members can add
CREATE POLICY "Org members can insert kpi attachments"
  ON public.kpi_attachments FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM kpis k WHERE k.id = kpi_attachments.kpi_id AND is_member_of_org(auth.uid(), k.org_id))
    AND created_by = auth.uid()
  );

-- DELETE: managers or creator can delete
CREATE POLICY "Managers or creators can delete kpi attachments"
  ON public.kpi_attachments FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM kpis k WHERE k.id = kpi_attachments.kpi_id AND is_member_of_org(auth.uid(), k.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR kpi_attachments.created_by = auth.uid())
  ));
