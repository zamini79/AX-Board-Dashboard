
-- Fix storage policies: add organization-level isolation for task-files bucket

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete task files" ON storage.objects;

-- SELECT: only users in the same org as the task can view files
CREATE POLICY "Users can view task files in their org" ON storage.objects
FOR SELECT USING (
  bucket_id = 'task-files' AND auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.task_attachments ta
    JOIN public.tasks t ON t.id = ta.task_id
    WHERE ta.file_url LIKE '%' || storage.objects.name
    AND public.is_member_of_org(auth.uid(), t.org_id)
  )
);

-- INSERT: org membership checked via task_attachments RLS on insert, keep permissive for upload flow
CREATE POLICY "Authenticated users can upload task files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'task-files' AND auth.uid() IS NOT NULL
);

-- DELETE: only managers or file creators in the same org
CREATE POLICY "Users can delete task files in their org" ON storage.objects
FOR DELETE USING (
  bucket_id = 'task-files' AND auth.uid() IS NOT NULL AND
  EXISTS (
    SELECT 1 FROM public.task_attachments ta
    JOIN public.tasks t ON t.id = ta.task_id
    WHERE ta.file_url LIKE '%' || storage.objects.name
    AND public.is_member_of_org(auth.uid(), t.org_id)
    AND (public.is_cos_pmo_or_above(auth.uid()) OR ta.created_by = auth.uid())
  )
);
