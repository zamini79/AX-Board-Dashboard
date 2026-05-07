ALTER TABLE public.tasks ADD COLUMN assigner_id uuid DEFAULT NULL;
ALTER TABLE public.tasks ADD COLUMN assigner_name text DEFAULT NULL;

-- Backfill: set assigner_id = created_by for existing tasks
UPDATE public.tasks SET assigner_id = created_by WHERE assigner_id IS NULL AND created_by IS NOT NULL;