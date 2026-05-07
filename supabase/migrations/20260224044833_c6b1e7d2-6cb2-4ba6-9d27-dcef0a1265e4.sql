
-- Allow users to delete their own checkins
CREATE POLICY "Users can delete their own checkins"
ON public.task_checkins
FOR DELETE
USING (user_id = auth.uid());

-- Allow managers to delete any snapshots (already exists for managers, add owner delete)
-- Snapshots: allow creators to delete their own
CREATE POLICY "Users can delete their own snapshots"
ON public.metric_snapshots
FOR DELETE
USING (created_by = auth.uid());
