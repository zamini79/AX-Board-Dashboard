
-- Add approval status to profiles
ALTER TABLE public.profiles ADD COLUMN is_approved boolean NOT NULL DEFAULT false;

-- Create a function to check if user is approved
CREATE OR REPLACE FUNCTION public.is_user_approved(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_approved FROM public.profiles WHERE id = _user_id),
    false
  )
$$;

-- Allow cos_pmo_or_above to update is_approved on other profiles
CREATE POLICY "Managers can approve users"
ON public.profiles
FOR UPDATE
USING (is_cos_pmo_or_above(auth.uid()))
WITH CHECK (is_cos_pmo_or_above(auth.uid()));
