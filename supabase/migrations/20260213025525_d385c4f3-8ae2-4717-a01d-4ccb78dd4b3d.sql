
-- Add owner_name text column to kpis table
ALTER TABLE public.kpis ADD COLUMN owner_name text;

-- Add owner_name text column to tasks table
ALTER TABLE public.tasks ADD COLUMN owner_name text;

-- Make tasks.owner_id nullable so free-text assignees can be used
ALTER TABLE public.tasks ALTER COLUMN owner_id DROP NOT NULL;
