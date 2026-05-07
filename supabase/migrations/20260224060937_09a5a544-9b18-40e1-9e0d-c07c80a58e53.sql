
-- 2. 기존 데이터 마이그레이션: executive -> ceo, cos_pmo -> admin, viewer -> editor
UPDATE public.user_roles SET role = 'ceo' WHERE role = 'executive';
UPDATE public.user_roles SET role = 'admin' WHERE role = 'cos_pmo';
UPDATE public.user_roles SET role = 'editor' WHERE role = 'viewer';

-- 3. item_editors 테이블 생성
CREATE TABLE public.item_editors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('kpi', 'task', 'goal', 'initiative')),
  item_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  granted_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(item_type, item_id, user_id)
);

ALTER TABLE public.item_editors ENABLE ROW LEVEL SECURITY;

-- 4. 새 DB 함수들 생성

-- is_admin_or_ceo: admin 또는 ceo 역할 확인
CREATE OR REPLACE FUNCTION public.is_admin_or_ceo(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'ceo')
  )
$$;

-- is_owner_or_above: admin, ceo, owner 역할 확인
CREATE OR REPLACE FUNCTION public.is_owner_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'ceo', 'owner')
  )
$$;

-- is_item_editor: 특정 항목의 Editor 여부 확인
CREATE OR REPLACE FUNCTION public.is_item_editor(_user_id uuid, _item_type text, _item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.item_editors
    WHERE user_id = _user_id AND item_type = _item_type AND item_id = _item_id
  )
$$;

-- can_manage_department: 사용자가 해당 부서 또는 하위 부서에 속하는지 확인
CREATE OR REPLACE FUNCTION public.can_manage_department(_user_id uuid, _dept_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _dept_id IN (SELECT get_user_visible_departments(_user_id))
$$;

-- 기존 함수를 새 역할 체계에 맞게 업데이트
-- is_executive -> admin 또는 ceo 체크로 변경
CREATE OR REPLACE FUNCTION public.is_executive(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'ceo')
  )
$$;

-- is_cos_pmo_or_above -> admin 또는 ceo 체크로 변경
CREATE OR REPLACE FUNCTION public.is_cos_pmo_or_above(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin', 'ceo')
  )
$$;

-- 5. item_editors RLS 정책
-- Admin/CEO/Owner(본인 항목)가 Editor를 지정할 수 있음
CREATE POLICY "item_editors_select" ON public.item_editors
FOR SELECT USING (
  is_member_of_org(auth.uid(), org_id)
);

CREATE POLICY "item_editors_insert" ON public.item_editors
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND
  is_owner_or_above(auth.uid()) AND
  granted_by = auth.uid()
);

CREATE POLICY "item_editors_delete" ON public.item_editors
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND
  (is_admin_or_ceo(auth.uid()) OR granted_by = auth.uid())
);

-- 6. profiles 업데이트 정책 변경: Admin만 다른 사용자 프로필 수정 가능
DROP POLICY IF EXISTS "Managers can approve users" ON public.profiles;
CREATE POLICY "Admin can approve users" ON public.profiles
FOR UPDATE
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- 7. user_roles 정책 변경: Admin만 역할 관리
DROP POLICY IF EXISTS "Managers can assign roles" ON public.user_roles;
CREATE POLICY "Admin can assign roles" ON public.user_roles
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Managers can delete roles" ON public.user_roles;
CREATE POLICY "Admin can delete roles" ON public.user_roles
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Managers can update roles" ON public.user_roles;
CREATE POLICY "Admin can update roles" ON public.user_roles
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
) WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

-- 8. departments 정책 변경: Admin만 관리
DROP POLICY IF EXISTS "Managers can create departments" ON public.departments;
CREATE POLICY "Admin can create departments" ON public.departments
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Managers can delete departments" ON public.departments;
CREATE POLICY "Admin can delete departments" ON public.departments
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

DROP POLICY IF EXISTS "Managers can update departments" ON public.departments;
CREATE POLICY "Admin can update departments" ON public.departments
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
) WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND has_role(auth.uid(), 'admin')
);

-- 9. KPI 정책 업데이트: Owner도 생성/수정/삭제 가능
DROP POLICY IF EXISTS "Managers can create KPIs" ON public.kpis;
CREATE POLICY "Authorized users can create KPIs" ON public.kpis
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND is_owner_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete KPIs" ON public.kpis;
CREATE POLICY "Authorized users can delete KPIs" ON public.kpis
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id))
  )
);

DROP POLICY IF EXISTS "Managers can update KPIs" ON public.kpis;
CREATE POLICY "Authorized users can update KPIs" ON public.kpis
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id)) OR
    is_item_editor(auth.uid(), 'kpi', id)
  )
);

-- 10. Tasks 정책 업데이트
DROP POLICY IF EXISTS "Managers can delete tasks" ON public.tasks;
CREATE POLICY "Authorized users can delete tasks" ON public.tasks
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (created_by = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id))
  )
);

DROP POLICY IF EXISTS "Users can update tasks" ON public.tasks;
CREATE POLICY "Authorized users can update tasks" ON public.tasks
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id)) OR
    is_item_editor(auth.uid(), 'task', id)
  )
);

-- 11. Performance goals 정책 업데이트
DROP POLICY IF EXISTS "Managers can create goals" ON public.performance_goals;
CREATE POLICY "Authorized users can create goals" ON public.performance_goals
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND is_owner_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete goals" ON public.performance_goals;
CREATE POLICY "Authorized users can delete goals" ON public.performance_goals
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id))
  )
);

DROP POLICY IF EXISTS "Managers or owners can update goals" ON public.performance_goals;
CREATE POLICY "Authorized users can update goals" ON public.performance_goals
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id)) OR
    is_item_editor(auth.uid(), 'goal', id)
  )
);

-- 12. Initiatives 정책 업데이트
DROP POLICY IF EXISTS "Managers can delete initiatives" ON public.initiatives;
CREATE POLICY "Authorized users can delete initiatives" ON public.initiatives
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id))
  )
);

DROP POLICY IF EXISTS "Managers or goal owners can create initiatives" ON public.initiatives;
CREATE POLICY "Authorized users can create initiatives" ON public.initiatives
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND is_owner_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Managers or owners can update initiatives" ON public.initiatives;
CREATE POLICY "Authorized users can update initiatives" ON public.initiatives
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND (
    is_admin_or_ceo(auth.uid()) OR
    (owner_id = auth.uid()) OR
    (department_id IS NOT NULL AND can_manage_department(auth.uid(), department_id)) OR
    is_item_editor(auth.uid(), 'initiative', id)
  )
);

-- 13. Budgets 정책 업데이트: Admin/CEO 전사 + Owner 본인 부서
DROP POLICY IF EXISTS "Managers can create budgets" ON public.budgets;
CREATE POLICY "Authorized users can create budgets" ON public.budgets
FOR INSERT WITH CHECK (
  is_member_of_org(auth.uid(), org_id) AND is_owner_or_above(auth.uid())
);

DROP POLICY IF EXISTS "Managers can delete budgets" ON public.budgets;
CREATE POLICY "Authorized users can delete budgets" ON public.budgets
FOR DELETE USING (
  is_member_of_org(auth.uid(), org_id) AND is_admin_or_ceo(auth.uid())
);

DROP POLICY IF EXISTS "Managers can update budgets" ON public.budgets;
CREATE POLICY "Authorized users can update budgets" ON public.budgets
FOR UPDATE USING (
  is_member_of_org(auth.uid(), org_id) AND is_admin_or_ceo(auth.uid())
);

-- 14. Audit logs 정책 업데이트
DROP POLICY IF EXISTS "Managers can view audit logs in their org" ON public.audit_logs;
CREATE POLICY "Admin and CEO can view audit logs" ON public.audit_logs
FOR SELECT USING (
  auth.uid() IS NOT NULL AND is_member_of_org(auth.uid(), org_id) AND is_admin_or_ceo(auth.uid())
);

-- 15. metric_snapshots 삭제 정책 업데이트
DROP POLICY IF EXISTS "Managers can delete snapshots" ON public.metric_snapshots;
CREATE POLICY "Admin CEO can delete snapshots" ON public.metric_snapshots
FOR DELETE USING (
  EXISTS (
    SELECT 1 FROM initiatives i
    WHERE i.id = metric_snapshots.initiative_id
    AND is_member_of_org(auth.uid(), i.org_id)
    AND is_admin_or_ceo(auth.uid())
  )
);
