-- Fix: profiles table - require authentication for SELECT
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;
CREATE POLICY "Users can view profiles in their org" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND (
    is_member_of_org(auth.uid(), org_id) OR (id = auth.uid())
  )
);

-- Fix: audit_logs table - require authentication for SELECT
DROP POLICY IF EXISTS "Users can view audit logs in their org" ON public.audit_logs;
CREATE POLICY "Users can view audit logs in their org" 
ON public.audit_logs 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND is_member_of_org(auth.uid(), org_id)
);