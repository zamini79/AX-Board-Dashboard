
-- Create storage bucket for task files
INSERT INTO storage.buckets (id, name, public) VALUES ('task-files', 'task-files', true);

-- Storage policies
CREATE POLICY "Users can view task files"
ON storage.objects FOR SELECT
USING (bucket_id = 'task-files');

CREATE POLICY "Authenticated users can upload task files"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can delete their own task files"
ON storage.objects FOR DELETE
USING (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);

-- Create task_attachments table
CREATE TABLE public.task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  description text,
  file_name text,
  file_url text,
  file_size bigint,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for their org tasks"
ON public.task_attachments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
  )
);

CREATE POLICY "Org members can insert attachments"
ON public.task_attachments FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
  )
  AND created_by = auth.uid()
);

CREATE POLICY "Managers or creators can delete attachments"
ON public.task_attachments FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    WHERE t.id = task_attachments.task_id
    AND is_member_of_org(auth.uid(), t.org_id)
    AND (is_cos_pmo_or_above(auth.uid()) OR task_attachments.created_by = auth.uid())
  )
);

-- Remove old detail_info column (replaced by attachments)
ALTER TABLE public.tasks DROP COLUMN IF EXISTS detail_info;
