
-- Allow managers to delete roles (needed for role reassignment and approval revocation)
CREATE POLICY "Managers can delete roles"
ON public.user_roles
FOR DELETE
USING (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));
