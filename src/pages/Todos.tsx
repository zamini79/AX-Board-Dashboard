import { useState, useMemo } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useDepartments } from '@/hooks/useDepartments';
import { TodoStatsCards } from '@/components/todo/TodoStatsCards';
import { TodoKanbanBoard } from '@/components/todo/TodoKanbanBoard';
import { TodoAssignedByMe } from '@/components/todo/TodoAssignedByMe';
import { TaskDialog } from '@/components/task/TaskDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus } from 'lucide-react';
import { Task, TaskStatus, TaskPriority } from '@/types/database';

type SortKey = 'due_date' | 'priority' | 'created_at';

const PRIORITY_ORDER: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export default function Todos() {
  const { isOwnerOrAbove } = useUserProfile();
  const { tasks, isLoading } = useTasks({ type: 'todo' });
  const orgMembersQuery = useOrgMembers();
  const members = orgMembersQuery.data || [];
  const { departments } = useDepartments();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [assignerFilter, setAssignerFilter] = useState<string>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('due_date');

  const filtered = useMemo(() => {
    let result = tasks.filter(t => t.status !== 'cancelled');
    if (statusFilter !== 'all') result = result.filter(t => t.status === statusFilter);
    if (ownerFilter !== 'all') result = result.filter(t => t.owner_id === ownerFilter);
    if (assignerFilter !== 'all') result = result.filter(t => t.assigner_id === assignerFilter);
    if (deptFilter !== 'all') result = result.filter(t => t.department_id === deptFilter);
    if (priorityFilter !== 'all') result = result.filter(t => t.priority === priorityFilter);

    result.sort((a, b) => {
      if (sortKey === 'due_date') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (sortKey === 'priority') {
        return (PRIORITY_ORDER[a.priority] ?? 1) - (PRIORITY_ORDER[b.priority] ?? 1);
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    return result;
  }, [tasks, statusFilter, ownerFilter, assignerFilter, deptFilter, priorityFilter, sortKey]);

  const actionButtons = isOwnerOrAbove && (
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      To-Do 추가
    </Button>
  );

  return (
    <AppLayout title="To-Do 관리" description="지시 업무의 할당, 진척, 승인 현황을 관리합니다." actions={actionButtons}>
      <div className="space-y-6">
        {/* Stats */}
        <TodoStatsCards tasks={tasks} />

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 상태</SelectItem>
              <SelectItem value="not_started">미시작</SelectItem>
              <SelectItem value="in_progress">진행중</SelectItem>
              <SelectItem value="blocked">Blocked</SelectItem>
              <SelectItem value="done">완료</SelectItem>
              <SelectItem value="executive_review">승인대기</SelectItem>
              <SelectItem value="closed">종료</SelectItem>
            </SelectContent>
          </Select>

          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="담당자" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 담당자</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={assignerFilter} onValueChange={setAssignerFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="지시자" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 지시자</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>
                  {m.full_name || m.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs">
              <SelectValue placeholder="부서" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {departments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="우선순위" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="high">높음</SelectItem>
              <SelectItem value="medium">중간</SelectItem>
              <SelectItem value="low">낮음</SelectItem>
            </SelectContent>
          </Select>

          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="w-[120px] h-9 text-xs">
              <SelectValue placeholder="정렬" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_date">마감일순</SelectItem>
              <SelectItem value="priority">우선순위순</SelectItem>
              <SelectItem value="created_at">생성일순</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Tabs: Kanban / Assigned by me */}
        <Tabs defaultValue="kanban">
          <TabsList>
            <TabsTrigger value="kanban">칸반 보드</TabsTrigger>
            <TabsTrigger value="assigned">내가 할당한 To-Do</TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">로딩 중...</p>
            ) : (
              <TodoKanbanBoard tasks={filtered} />
            )}
          </TabsContent>
          <TabsContent value="assigned" className="mt-4">
            <TodoAssignedByMe tasks={tasks} />
          </TabsContent>
        </Tabs>
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultType="todo" />
    </AppLayout>
  );
}
