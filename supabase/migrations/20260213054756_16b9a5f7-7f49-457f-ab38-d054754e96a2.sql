
-- Drop existing SELECT policy on profiles
DROP POLICY IF EXISTS "Users can view profiles in their org" ON public.profiles;

-- Recreate with approval check: users can view their own profile OR approved users can view org profiles
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles
  FOR SELECT
  USING (
    (id = auth.uid())
    OR
    (auth.uid() IS NOT NULL AND is_member_of_org(auth.uid(), org_id) AND is_user_approved(auth.uid()))
  );
