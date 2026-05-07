// Database types for AXBoard

export type KpiStatus = 'on_track' | 'at_risk' | 'off_track' | 'na';
export type TaskType = 'kpi_action' | 'todo';
export type TaskStatus = 'not_started' | 'in_progress' | 'blocked' | 'done' | 'executive_review' | 'closed' | 'cancelled';
export type TaskPriority = 'high' | 'medium' | 'low';
export type BudgetType = 'opex' | 'capex';
export type AppRole = 'admin' | 'ceo' | 'owner' | 'editor';

export interface Organization {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  head_user_id: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  org_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  department: string | null;
  department_id: string | null;
  is_approved: boolean | null;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  org_id: string;
  role: AppRole;
  created_at: string;
}

export interface Kpi {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  owner_name: string | null;
  parent_id: string | null;
  unit: string | null;
  target_value: number | null;
  current_value: number | null;
  department_id: string | null;
  status: KpiStatus;
  cadence: string | null;
  last_updated_at: string | null;
  next_update_due_at: string | null;
  archived_at: string | null;
  created_by: string | null;
  year: number;
  sort_order: number;
  weight: number;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
  tasks_count?: number;
  children?: Kpi[];
  depth?: number;
  computed_progress?: number;
}

export interface Task {
  id: string;
  org_id: string;
  type: TaskType;
  title: string;
  description: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: TaskStatus;
  progress_percent: number;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  requires_exec_approval: boolean;
  approver_id: string | null;
  approved_at: string | null;
  closed_at: string | null;
  last_checkin_at: string | null;
  created_by: string | null;
  department_id: string | null;
  external_url: string | null;
  assigner_id: string | null;
  assigner_name: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
  assigner?: Profile;
  kpis?: Kpi[];
  /** @deprecated use kpis[] instead */
  kpi?: Kpi;
  initiatives?: Initiative[];
}

export interface TaskCheckin {
  id: string;
  task_id: string;
  user_id: string;
  week_start_date: string;
  summary_this_week: string | null;
  plan_next_week: string | null;
  blockers: string | null;
  progress_percent: number | null;
  status: TaskStatus | null;
  created_at: string;
}

export interface Budget {
  id: string;
  org_id: string;
  year: number;
  budget_type: BudgetType;
  category: string | null;
  department: string | null;
  budget_amount: number;
  actual_amount: number;
  forecast_amount: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// Performance Management types
export type GoalStatus = 'not_started' | 'active' | 'completed' | 'on_hold';
export type InitiativeStatus = 'not_started' | 'in_progress' | 'completed' | 'blocked';
export type BscPerspective = 'financial' | 'customer' | 'process' | 'learning';

export interface PerformanceGoal {
  id: string;
  org_id: string;
  parent_id: string | null;
  owner_id: string | null;
  owner_name: string | null;
  title: string;
  description: string | null;
  perspective: BscPerspective | null;
  status: GoalStatus;
  start_date: string | null;
  target_date: string | null;
  actual_end_date: string | null;
  overall_score: number | null;
  department_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
  children?: PerformanceGoal[];
  depth?: number;
  computed_score?: number;
  initiatives_count?: number;
}

export interface Initiative {
  id: string;
  goal_id: string;
  org_id: string;
  title: string;
  description: string | null;
  owner_id: string | null;
  owner_name: string | null;
  status: InitiativeStatus;
  weight: number;
  target_value: number | null;
  current_value: number | null;
  unit: string | null;
  score: number | null;
  data_source: string | null;
  dashboard_url: string | null;
  start_date: string | null;
  target_date: string | null;
  department_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields
  owner?: Profile;
}

export interface MetricSnapshot {
  id: string;
  initiative_id: string;
  recorded_at: string;
  value: number | null;
  score: number | null;
  source: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export const GOAL_STATUS_CONFIG: Record<GoalStatus, { label: string; color: string; emoji: string; bgColor: string }> = {
  not_started: { label: '미시작', color: 'text-muted-foreground', emoji: '⚪', bgColor: 'bg-muted' },
  active: { label: '진행중', color: 'text-blue-600', emoji: '🔵', bgColor: 'bg-blue-500' },
  completed: { label: '완료', color: 'text-green-600', emoji: '🟢', bgColor: 'bg-green-500' },
  on_hold: { label: '보류', color: 'text-yellow-600', emoji: '🟡', bgColor: 'bg-yellow-500' },
};

export const INITIATIVE_STATUS_CONFIG: Record<InitiativeStatus, { label: string; color: string; emoji: string; bgColor: string }> = {
  not_started: { label: '미시작', color: 'text-muted-foreground', emoji: '⚪', bgColor: 'bg-muted' },
  in_progress: { label: '진행중', color: 'text-blue-600', emoji: '🔵', bgColor: 'bg-blue-500' },
  completed: { label: '완료', color: 'text-green-600', emoji: '🟢', bgColor: 'bg-green-500' },
  blocked: { label: '차단', color: 'text-red-600', emoji: '🔴', bgColor: 'bg-red-500' },
};

export const BSC_PERSPECTIVE_CONFIG: Record<BscPerspective, { label: string; emoji: string }> = {
  financial: { label: '재무', emoji: '💰' },
  customer: { label: '고객', emoji: '👥' },
  process: { label: '프로세스', emoji: '⚙️' },
  learning: { label: '학습/성장', emoji: '📚' },
};

// Notification types
export type NotificationType = 'checkin_reminder' | 'deadline_approaching' | 'task_blocked' | 'approval_pending' | 'task_approved' | 'task_reopened' | 'escalation';

export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  payload: Record<string, any> | null;
  read_at: string | null;
  created_at: string;
}

// UI Helper types
export const KPI_STATUS_CONFIG: Record<KpiStatus, { label: string; color: string; emoji: string; bgColor: string }> = {
  on_track: { label: 'On Track', color: 'text-green-600', emoji: '🟢', bgColor: 'bg-green-500' },
  at_risk: { label: 'At Risk', color: 'text-yellow-600', emoji: '🟡', bgColor: 'bg-yellow-500' },
  off_track: { label: 'Off Track', color: 'text-red-600', emoji: '🔴', bgColor: 'bg-red-500' },
  na: { label: 'N/A', color: 'text-muted-foreground', emoji: '⚪', bgColor: 'bg-muted' },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, { label: string; color: string; bgColor: string }> = {
  not_started: { label: '미시작', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  in_progress: { label: '진행중', color: 'text-blue-600', bgColor: 'bg-blue-500' },
  blocked: { label: 'Blocked', color: 'text-red-600', bgColor: 'bg-red-500' },
  done: { label: '완료', color: 'text-green-600', bgColor: 'bg-green-500' },
  executive_review: { label: '승인대기', color: 'text-yellow-600', bgColor: 'bg-yellow-500' },
  closed: { label: '종료', color: 'text-muted-foreground', bgColor: 'bg-muted' },
  cancelled: { label: '취소', color: 'text-muted-foreground', bgColor: 'bg-muted' },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, { label: string; color: string }> = {
  high: { label: '높음', color: 'text-red-600' },
  medium: { label: '중간', color: 'text-yellow-600' },
  low: { label: '낮음', color: 'text-muted-foreground' },
};
