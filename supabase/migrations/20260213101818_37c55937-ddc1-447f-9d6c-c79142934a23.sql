
-- Managers can assign roles to org members
CREATE POLICY "Managers can assign roles"
ON public.user_roles FOR INSERT
WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid())
);

-- Managers can update roles of org members
CREATE POLICY "Managers can update roles"
ON public.user_roles FOR UPDATE
USING (
  is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid())
);
