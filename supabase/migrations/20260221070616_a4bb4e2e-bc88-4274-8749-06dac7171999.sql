
-- 1. Enum 타입 생성
CREATE TYPE public.goal_status AS ENUM ('not_started', 'active', 'completed', 'on_hold');
CREATE TYPE public.initiative_status AS ENUM ('not_started', 'in_progress', 'completed', 'blocked');
CREATE TYPE public.bsc_perspective AS ENUM ('financial', 'customer', 'process', 'learning');

-- 2. performance_goals 테이블
CREATE TABLE public.performance_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  parent_id uuid REFERENCES public.performance_goals(id) ON DELETE SET NULL,
  owner_id uuid,
  owner_name text,
  title text NOT NULL,
  description text,
  perspective public.bsc_perspective,
  status public.goal_status NOT NULL DEFAULT 'not_started',
  start_date date,
  target_date date,
  actual_end_date date,
  overall_score numeric DEFAULT 0,
  department_id uuid REFERENCES public.departments(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.performance_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view goals in their org"
  ON public.performance_goals FOR SELECT
  USING (is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Managers can create goals"
  ON public.performance_goals FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

CREATE POLICY "Managers or owners can update goals"
  ON public.performance_goals FOR UPDATE
  USING (is_member_of_org(auth.uid(), org_id) AND (is_cos_pmo_or_above(auth.uid()) OR owner_id = auth.uid()));

CREATE POLICY "Managers can delete goals"
  ON public.performance_goals FOR DELETE
  USING (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

CREATE TRIGGER update_performance_goals_updated_at
  BEFORE UPDATE ON public.performance_goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. initiatives 테이블
CREATE TABLE public.initiatives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_id uuid NOT NULL REFERENCES public.performance_goals(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id),
  title text NOT NULL,
  description text,
  owner_id uuid,
  owner_name text,
  status public.initiative_status NOT NULL DEFAULT 'not_started',
  weight numeric NOT NULL DEFAULT 1.0,
  target_value numeric,
  current_value numeric,
  unit text DEFAULT '%',
  score numeric DEFAULT 0,
  data_source text DEFAULT 'manual',
  dashboard_url text,
  start_date date,
  target_date date,
  department_id uuid REFERENCES public.departments(id),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.initiatives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view initiatives in their org"
  ON public.initiatives FOR SELECT
  USING (is_member_of_org(auth.uid(), org_id));

CREATE POLICY "Managers or goal owners can create initiatives"
  ON public.initiatives FOR INSERT
  WITH CHECK (is_member_of_org(auth.uid(), org_id) AND (is_cos_pmo_or_above(auth.uid()) OR owner_id = auth.uid()));

CREATE POLICY "Managers or owners can update initiatives"
  ON public.initiatives FOR UPDATE
  USING (is_member_of_org(auth.uid(), org_id) AND (is_cos_pmo_or_above(auth.uid()) OR owner_id = auth.uid()));

CREATE POLICY "Managers can delete initiatives"
  ON public.initiatives FOR DELETE
  USING (is_member_of_org(auth.uid(), org_id) AND is_cos_pmo_or_above(auth.uid()));

CREATE TRIGGER update_initiatives_updated_at
  BEFORE UPDATE ON public.initiatives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. metric_snapshots 테이블
CREATE TABLE public.metric_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  initiative_id uuid NOT NULL REFERENCES public.initiatives(id) ON DELETE CASCADE,
  recorded_at date NOT NULL,
  value numeric,
  score numeric,
  source text DEFAULT 'manual',
  notes text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.metric_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view snapshots via initiative org"
  ON public.metric_snapshots FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.initiatives i
    WHERE i.id = metric_snapshots.initiative_id
    AND is_member_of_org(auth.uid(), i.org_id)
  ));

CREATE POLICY "Org members can create snapshots"
  ON public.metric_snapshots FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.initiatives i
      WHERE i.id = metric_snapshots.initiative_id
      AND is_member_of_org(auth.uid(), i.org_id)
    ) AND created_by = auth.uid()
  );

CREATE POLICY "Users can update their own snapshots"
  ON public.metric_snapshots FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "Managers can delete snapshots"
  ON public.metric_snapshots FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.initiatives i
    WHERE i.id = metric_snapshots.initiative_id
    AND is_member_of_org(auth.uid(), i.org_id)
    AND is_cos_pmo_or_above(auth.uid())
  ));
