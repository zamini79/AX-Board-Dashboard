import { useState, useMemo } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useDepartments } from '@/hooks/useDepartments';
import { useSearchParams } from 'react-router-dom';
import { Task, TASK_STATUS_CONFIG, TaskStatus, TaskType, TaskPriority, TASK_PRIORITY_CONFIG } from '@/types/database';
import { TaskItem } from './TaskItem';
import { TaskDialog } from './TaskDialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckSquare, Plus, Filter, Building2, ArrowUpDown } from 'lucide-react';
import { getTaskSignal } from '@/lib/taskSignal';
import type { ExternalFilter } from './TaskExecutiveDashboard';

type SortOption = 'created_at' | 'due_date' | 'priority';

interface TaskListProps {
  kpiId?: string;
  type?: TaskType;
  title?: string;
  showFilters?: boolean;
  limit?: number;
  showKpi?: boolean;
  onTaskSelect?: (task: Task) => void;
  externalFilter?: ExternalFilter;
}

const PRIORITY_ORDER: Record<string, number> = { high: 0, medium: 1, low: 2 };

export function TaskList({ 
  kpiId, 
  type, 
  title = '과제 목록',
  showFilters = true,
  limit,
  showKpi = true,
  onTaskSelect,
  externalFilter,
}: TaskListProps) {
  const { profile, isOwnerOrAbove } = useUserProfile();
  const { data: members = [] } = useOrgMembers();
  const { flatTreeDepartments } = useDepartments();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL-synced filters (L2: persist filter state across navigation)
  const statusFilter = (searchParams.get('status') as TaskStatus | 'all' | 'active') || 'all';
  const typeFilter = (searchParams.get('type') as TaskType | 'all') || 'all';
  const priorityFilter = (searchParams.get('priority') as TaskPriority | 'all') || 'all';
  const ownerFilter = searchParams.get('owner') || 'all';
  const deptFilter = searchParams.get('dept') || 'all';
  const sortBy = (searchParams.get('sort') as SortOption) || 'created_at';

  const DEFAULT_VALUES: Record<string, string> = { sort: 'created_at' };
  const setFilter = (key: string, value: string) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (value === 'all' || value === DEFAULT_VALUES[key]) next.delete(key);
      else next.set(key, value);
      return next;
    }, { replace: true });
  };

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const activeStatuses: TaskStatus[] = ['not_started', 'in_progress', 'blocked', 'done', 'executive_review'];
  
  const { tasks, isLoading } = useTasks({
    kpiId,
    type: type || (typeFilter !== 'all' ? typeFilter : undefined),
    status: statusFilter === 'all' 
      ? undefined 
      : statusFilter === 'active'
        ? activeStatuses
        : [statusFilter],
  });

  const filteredAndSorted = useMemo(() => {
    let result = [...tasks];

    // External dashboard filters (signal / deptId)
    if (externalFilter?.signal) {
      result = result.filter(t => getTaskSignal(t) === externalFilter.signal);
    }
    if (externalFilter?.deptId !== undefined && externalFilter.deptId !== null) {
      result = result.filter(t => t.department_id === externalFilter.deptId);
    }

    // Client-side filters
    if (priorityFilter !== 'all') {
      result = result.filter(t => t.priority === priorityFilter);
    }
    if (ownerFilter !== 'all') {
      result = result.filter(t => t.owner_id === ownerFilter);
    }
    if (deptFilter !== 'all') {
      result = result.filter(t => t.department_id === deptFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'due_date') {
        if (!a.due_date && !b.due_date) return 0;
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortBy === 'priority') {
        return (PRIORITY_ORDER[a.priority] ?? 2) - (PRIORITY_ORDER[b.priority] ?? 2);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return limit ? result.slice(0, limit) : result;
  }, [tasks, priorityFilter, ownerFilter, deptFilter, sortBy, limit, externalFilter]);

  const handleCreateTask = () => {
    setSelectedTask(null);
    setDialogOpen(true);
  };

  const handleEditTask = (task: Task) => {
    if (onTaskSelect) {
      onTaskSelect(task);
    } else {
      setSelectedTask(task);
      setDialogOpen(true);
    }
  };

  if (!profile?.org_id) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground text-sm">
          조직에 소속되면 과제를 확인할 수 있습니다.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">{title}</h2>
          <span className="text-sm text-muted-foreground">({filteredAndSorted.length})</span>
        </div>
        
        <div className="flex items-center gap-2">
          {isOwnerOrAbove && (
            <Button onClick={handleCreateTask} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              추가
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="flex flex-wrap gap-2">
          <Select value={statusFilter} onValueChange={(v) => setFilter('status', v)}>
            <SelectTrigger className="w-[120px]">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">진행중</SelectItem>
              <SelectItem value="all">전체</SelectItem>
              {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {!type && (
            <Select value={typeFilter} onValueChange={(v) => setFilter('type', v)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 유형</SelectItem>
                <SelectItem value="kpi_action">KPI 과제</SelectItem>
                <SelectItem value="todo">To-Do</SelectItem>
              </SelectContent>
            </Select>
          )}

          <Select value={priorityFilter} onValueChange={(v) => setFilter('priority', v)}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 순위</SelectItem>
              {Object.entries(TASK_PRIORITY_CONFIG).map(([key, config]) => (
                <SelectItem key={key} value={key}>{config.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={(v) => setFilter('owner', v)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="담당자" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 담당자</SelectItem>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email.split('@')[0]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {flatTreeDepartments.length > 0 && (
            <Select value={deptFilter} onValueChange={(v) => setFilter('dept', v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="부서" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 부서</SelectItem>
                {flatTreeDepartments.map(d => (
                  <SelectItem key={d.id} value={d.id}>
                    {'　'.repeat(d.depth || 0)}{d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          <Select value={sortBy} onValueChange={(v) => setFilter('sort', v)}>
            <SelectTrigger className="w-[130px]">
              <ArrowUpDown className="h-3 w-3 mr-1" />
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="created_at">생성일순</SelectItem>
              <SelectItem value="due_date">마감일순</SelectItem>
              <SelectItem value="priority">우선순위순</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Task List */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredAndSorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">과제가 없습니다</h3>
              <p className="text-muted-foreground text-sm mb-4">
                {statusFilter !== 'all' && statusFilter !== 'active'
                  ? '해당 상태의 과제가 없습니다.'
                  : '첫 번째 과제를 추가하세요.'}
              </p>
              {isOwnerOrAbove && (
                <Button onClick={handleCreateTask} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  과제 추가
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y">
              {filteredAndSorted.map((task) => (
                <TaskItem 
                  key={task.id} 
                  task={task} 
                  onClick={() => handleEditTask(task)}
                  showKpi={showKpi && !kpiId}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog */}
      <TaskDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        task={selectedTask}
        defaultKpiId={kpiId}
        defaultType={type || (kpiId ? 'kpi_action' : 'todo')}
      />
    </div>
  );
}
