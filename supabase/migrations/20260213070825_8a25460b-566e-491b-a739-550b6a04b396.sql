
-- 1. Fix profiles SELECT policy: add explicit auth guard on first branch
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org"
ON public.profiles
FOR SELECT
USING (
  (auth.uid() IS NOT NULL AND id = auth.uid())
  OR
  (auth.uid() IS NOT NULL AND is_member_of_org(auth.uid(), org_id) AND is_user_approved(auth.uid()))
);

-- 2. Fix audit_logs SELECT policy: restrict to managers (cos_pmo or above) only
DROP POLICY IF EXISTS "Users can view audit logs in their org" ON public.audit_logs;
CREATE POLICY "Managers can view audit logs in their org"
ON public.audit_logs
FOR SELECT
USING (
  auth.uid() IS NOT NULL
  AND is_member_of_org(auth.uid(), org_id)
  AND is_cos_pmo_or_above(auth.uid())
);
