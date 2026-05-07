
-- Make the task-files bucket private
UPDATE storage.buckets SET public = false WHERE id = 'task-files';

-- Drop existing insufficient policies
DROP POLICY IF EXISTS "Users can view task files" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload task files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own task files" ON storage.objects;

-- Authenticated users can view files in task-files bucket
CREATE POLICY "Authenticated users can view task files" ON storage.objects FOR SELECT
  USING (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);

-- Authenticated users can upload files
CREATE POLICY "Authenticated users can upload task files" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);

-- Authenticated users can delete files
CREATE POLICY "Authenticated users can delete task files" ON storage.objects FOR DELETE
  USING (bucket_id = 'task-files' AND auth.uid() IS NOT NULL);
