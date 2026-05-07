
-- 1. departments 테이블 생성
CREATE TABLE public.departments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name text NOT NULL,
  parent_id uuid REFERENCES public.departments(id) ON DELETE SET NULL,
  head_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  description text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_departments_org_id ON public.departments(org_id);
CREATE INDEX idx_departments_parent_id ON public.departments(parent_id);
CREATE INDEX idx_departments_head_user_id ON public.departments(head_user_id);

-- updated_at 트리거
CREATE TRIGGER update_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS 활성화
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- RLS 정책: 같은 org 소속이면 조회
CREATE POLICY "Users can view departments in their org"
  ON public.departments FOR SELECT
  USING (is_member_of_org(auth.uid(), org_id));

-- RLS 정책: 매니저만 CUD
CREATE POLICY "Managers can create departments"
  ON public.departments FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

CREATE POLICY "Managers can update departments"
  ON public.departments FOR UPDATE
  USING (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

CREATE POLICY "Managers can delete departments"
  ON public.departments FOR DELETE
  USING (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

-- 2. profiles에 department_id 추가
ALTER TABLE public.profiles
  ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX idx_profiles_department_id ON public.profiles(department_id);

-- 3. kpis에 department_id 추가
ALTER TABLE public.kpis
  ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX idx_kpis_department_id ON public.kpis(department_id);

-- 4. tasks에 department_id 추가
ALTER TABLE public.tasks
  ADD COLUMN department_id uuid REFERENCES public.departments(id) ON DELETE SET NULL;

CREATE INDEX idx_tasks_department_id ON public.tasks(department_id);

-- 5. 재귀 함수: 특정 부서와 모든 하위 부서 ID 반환
CREATE OR REPLACE FUNCTION public.get_department_subtree(_dept_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH RECURSIVE tree AS (
    SELECT id FROM departments WHERE id = _dept_id
    UNION ALL
    SELECT d.id FROM departments d JOIN tree t ON d.parent_id = t.id
  )
  SELECT id FROM tree
$$;

-- 6. 사용자 가시 부서: 자기 소속 부서 + head인 부서들의 서브트리
CREATE OR REPLACE FUNCTION public.get_user_visible_departments(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  -- 사용자 소속 부서의 서브트리
  SELECT dt.id FROM departments dt
  WHERE dt.id IN (
    SELECT get_department_subtree(p.department_id)
    FROM profiles p WHERE p.id = _user_id AND p.department_id IS NOT NULL
  )
  UNION
  -- 사용자가 부서장인 부서들의 서브트리
  SELECT dt2.id FROM departments dt2
  WHERE dt2.id IN (
    SELECT get_department_subtree(d.id)
    FROM departments d WHERE d.head_user_id = _user_id
  )
$$;
