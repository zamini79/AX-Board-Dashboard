
-- Update is_executive to include admin
CREATE OR REPLACE FUNCTION public.is_executive(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('executive', 'admin')
  )
$$;

-- Update is_cos_pmo_or_above to include admin
CREATE OR REPLACE FUNCTION public.is_cos_pmo_or_above(_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('executive', 'cos_pmo', 'admin')
  )
$$;
