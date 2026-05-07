-- ExecHQ Phase 1: 기반 구축 - 데이터베이스 스키마 및 보안 정책

-- 1. ENUM 타입 생성
CREATE TYPE public.app_role AS ENUM ('executive', 'cos_pmo', 'owner', 'viewer');
CREATE TYPE public.kpi_status AS ENUM ('on_track', 'at_risk', 'off_track', 'na');
CREATE TYPE public.task_type AS ENUM ('kpi_action', 'todo');
CREATE TYPE public.task_status AS ENUM ('not_started', 'in_progress', 'blocked', 'done', 'executive_review', 'closed', 'cancelled');
CREATE TYPE public.task_priority AS ENUM ('high', 'medium', 'low');
CREATE TYPE public.budget_type AS ENUM ('opex', 'capex');
CREATE TYPE public.notification_type AS ENUM ('checkin_reminder', 'deadline_approaching', 'task_blocked', 'approval_pending', 'task_approved', 'task_reopened', 'escalation');

-- 2. Organizations 테이블
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Profiles 테이블 (사용자 프로필)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  title TEXT,
  department TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. User Roles 테이블 (역할 관리 - 별도 테이블로 분리)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'viewer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, org_id)
);

-- 5. KPIs 테이블
CREATE TABLE public.kpis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  unit TEXT DEFAULT '%',
  target_value NUMERIC,
  current_value NUMERIC,
  status kpi_status DEFAULT 'na',
  cadence TEXT DEFAULT 'monthly',
  last_updated_at TIMESTAMPTZ DEFAULT now(),
  next_update_due_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Tasks 테이블 (KPI 과제 + To-Do 통합)
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  kpi_id UUID REFERENCES public.kpis(id) ON DELETE SET NULL,
  type task_type NOT NULL DEFAULT 'todo',
  title TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  status task_status DEFAULT 'not_started',
  progress_percent INTEGER DEFAULT 0 CHECK (progress_percent >= 0 AND progress_percent <= 100),
  priority task_priority DEFAULT 'medium',
  start_date DATE,
  due_date DATE,
  requires_exec_approval BOOLEAN DEFAULT true,
  approver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  last_checkin_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 7. Task Checkins 테이블 (주간 체크인)
CREATE TABLE public.task_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL NOT NULL,
  week_start_date DATE NOT NULL,
  summary_this_week TEXT,
  plan_next_week TEXT,
  blockers TEXT,
  progress_percent INTEGER CHECK (progress_percent >= 0 AND progress_percent <= 100),
  status task_status,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8. Budgets 테이블
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  year INTEGER NOT NULL,
  budget_type budget_type NOT NULL,
  category TEXT,
  department TEXT,
  budget_amount NUMERIC DEFAULT 0,
  actual_amount NUMERIC DEFAULT 0,
  forecast_amount NUMERIC DEFAULT 0,
  currency TEXT DEFAULT 'KRW',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 9. Notifications 테이블
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 10. Audit Logs 테이블
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 11. 인덱스 생성
CREATE INDEX idx_profiles_org_id ON public.profiles(org_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);
CREATE INDEX idx_user_roles_org_id ON public.user_roles(org_id);
CREATE INDEX idx_kpis_org_id ON public.kpis(org_id);
CREATE INDEX idx_kpis_owner_id ON public.kpis(owner_id);
CREATE INDEX idx_tasks_org_id ON public.tasks(org_id);
CREATE INDEX idx_tasks_kpi_id ON public.tasks(kpi_id);
CREATE INDEX idx_tasks_owner_id ON public.tasks(owner_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_task_checkins_task_id ON public.task_checkins(task_id);
CREATE INDEX idx_budgets_org_id ON public.budgets(org_id);
CREATE INDEX idx_budgets_year ON public.budgets(year);
CREATE INDEX idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX idx_audit_logs_org_id ON public.audit_logs(org_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at);

-- 12. Helper Functions (SECURITY DEFINER로 RLS 재귀 방지)

-- 사용자의 조직 ID 가져오기
CREATE OR REPLACE FUNCTION public.get_user_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT org_id FROM public.profiles WHERE id = _user_id
$$;

-- 사용자가 해당 조직에 속하는지 확인
CREATE OR REPLACE FUNCTION public.is_member_of_org(_user_id UUID, _org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = _user_id AND org_id = _org_id
  )
$$;

-- 사용자의 역할 확인
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID, _org_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.user_roles 
  WHERE user_id = _user_id AND org_id = _org_id
  LIMIT 1
$$;

-- 사용자가 특정 역할을 가지고 있는지 확인
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 사용자가 Executive인지 확인
CREATE OR REPLACE FUNCTION public.is_executive(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'executive'
  )
$$;

-- 사용자가 CoS/PMO 이상인지 확인
CREATE OR REPLACE FUNCTION public.is_cos_pmo_or_above(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('executive', 'cos_pmo')
  )
$$;

-- 13. RLS 활성화
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 14. RLS Policies

-- Organizations: 같은 조직 멤버만 조회 가능
CREATE POLICY "Users can view their organization"
  ON public.organizations FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), id));

-- Profiles: 같은 조직 멤버 조회, 본인만 수정
CREATE POLICY "Users can view profiles in their org"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id) OR id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- User Roles: 같은 조직만 조회, INSERT/UPDATE/DELETE는 제한
CREATE POLICY "Users can view roles in their org"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id));

-- KPIs: 조직 멤버 조회, Executive/CoS만 생성/수정
CREATE POLICY "Users can view KPIs in their org"
  ON public.kpis FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Managers can create KPIs"
  ON public.kpis FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_member_of_org(auth.uid(), org_id) 
    AND public.is_cos_pmo_or_above(auth.uid())
  );

CREATE POLICY "Managers can update KPIs"
  ON public.kpis FOR UPDATE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id) 
    AND (public.is_cos_pmo_or_above(auth.uid()) OR owner_id = auth.uid())
  );

CREATE POLICY "Managers can delete KPIs"
  ON public.kpis FOR DELETE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id) 
    AND public.is_cos_pmo_or_above(auth.uid())
  );

-- Tasks: 조직 멤버 조회, 역할별 생성/수정 권한
CREATE POLICY "Users can view tasks in their org"
  ON public.tasks FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Users can create tasks"
  ON public.tasks FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Users can update tasks"
  ON public.tasks FOR UPDATE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id)
    AND (public.is_cos_pmo_or_above(auth.uid()) OR owner_id = auth.uid())
  );

CREATE POLICY "Managers can delete tasks"
  ON public.tasks FOR DELETE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id)
    AND public.is_cos_pmo_or_above(auth.uid())
  );

-- Task Checkins: 과제 소속 조직 멤버만 접근
CREATE POLICY "Users can view checkins for their org tasks"
  ON public.task_checkins FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id 
      AND public.is_member_of_org(auth.uid(), t.org_id)
    )
  );

CREATE POLICY "Users can create checkins"
  ON public.task_checkins FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id 
      AND public.is_member_of_org(auth.uid(), t.org_id)
    )
    AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own checkins"
  ON public.task_checkins FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Budgets: 조직 멤버 조회, Manager만 생성/수정
CREATE POLICY "Users can view budgets in their org"
  ON public.budgets FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Managers can create budgets"
  ON public.budgets FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_member_of_org(auth.uid(), org_id)
    AND public.is_cos_pmo_or_above(auth.uid())
  );

CREATE POLICY "Managers can update budgets"
  ON public.budgets FOR UPDATE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id)
    AND public.is_cos_pmo_or_above(auth.uid())
  );

CREATE POLICY "Managers can delete budgets"
  ON public.budgets FOR DELETE
  TO authenticated
  USING (
    public.is_member_of_org(auth.uid(), org_id)
    AND public.is_cos_pmo_or_above(auth.uid())
  );

-- Notifications: 본인 알림만 조회/수정
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (public.is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Audit Logs: 조직 멤버 조회만 가능 (INSERT는 트리거/함수로)
CREATE POLICY "Users can view audit logs in their org"
  ON public.audit_logs FOR SELECT
  TO authenticated
  USING (public.is_member_of_org(auth.uid(), org_id));

-- 15. Updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kpis_updated_at
  BEFORE UPDATE ON public.kpis
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. 새 사용자 가입 시 프로필 자동 생성 트리거
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();