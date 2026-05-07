import { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useTasks } from '@/hooks/useTasks';
import { useDepartments } from '@/hooks/useDepartments';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskList } from '@/components/task/TaskList';
import { TaskDialog } from '@/components/task/TaskDialog';
import { TaskExecutiveDashboard, ExternalFilter } from '@/components/task/TaskExecutiveDashboard';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { getTaskSignal } from '@/lib/taskSignal';

export default function Tasks() {
  const { isOwnerOrAbove } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [externalFilter, setExternalFilter] = useState<ExternalFilter>({});

  // Load all active tasks for the dashboard (shared with TaskList via externalFilter)
  const { tasks, isLoading } = useTasks({
    status: ['not_started', 'in_progress', 'blocked', 'done', 'executive_review', 'closed'],
  });
  const { flatTreeDepartments } = useDepartments();

  const actionButtons = isOwnerOrAbove && (
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      과제 추가
    </Button>
  );

  return (
    <AppLayout
      title="과제 관리"
      description="KPI 과제와 To-Do를 관리합니다."
      actions={actionButtons}
    >
      <div className="space-y-6">
        {/* CEO Executive Dashboard */}
        {!isLoading && (
          <TaskExecutiveDashboard
            tasks={tasks}
            departments={flatTreeDepartments}
            filter={externalFilter}
            onFilterChange={setExternalFilter}
          />
        )}

        {/* Task List with external filter */}
        <TaskList
          showFilters
          title="전체 과제"
          externalFilter={externalFilter}
        />
      </div>

      <TaskDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
