
-- Add detail_info and external_url columns to tasks
ALTER TABLE public.tasks ADD COLUMN detail_info text;
ALTER TABLE public.tasks ADD COLUMN external_url text;
