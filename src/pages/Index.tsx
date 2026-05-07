import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useKpis } from '@/hooks/useKpis';
import { useTasks } from '@/hooks/useTasks';
import { Kpi } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { KpiCard } from '@/components/kpi/KpiCard';
import { KpiDialog } from '@/components/kpi/KpiDialog';
import { TaskItem } from '@/components/task/TaskItem';
import { TaskDialog } from '@/components/task/TaskDialog';
import { ApprovalInbox } from '@/components/task/ApprovalInbox';
import { BudgetChart } from '@/components/budget/BudgetChart';
import { AiBriefingCard, AiBriefingReopen } from '@/components/ai/AiBriefingCard';
import { AttentionWidget } from '@/components/dashboard/AttentionWidget';
import { ExecutiveSummaryBar } from '@/components/dashboard/ExecutiveSummaryBar';
import { TaskProgressDonut } from '@/components/dashboard/TaskProgressDonut';
import { ActivityTimeline } from '@/components/dashboard/ActivityTimeline';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  TrendingUp,
  CheckSquare,
  DollarSign,
  Calendar,
  Plus,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react';

export default function Index() {
  const navigate = useNavigate();
  const { profile, isOwnerOrAbove } = useUserProfile();
  const [dashboardYear, setDashboardYear] = useState(new Date().getFullYear());
  const { kpiTree, isLoading: kpisLoading } = useKpis(dashboardYear);

  const { tasks, isLoading: tasksLoading } = useTasks({ 
    status: ['not_started', 'in_progress', 'blocked', 'done', 'executive_review'] 
  });

  const [kpiDialogOpen, setKpiDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [briefingVisible, setBriefingVisible] = useState(true);

  const criticalTasks = tasks
    .filter(t => t.status === 'blocked' || (t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done' && t.status !== 'closed'))
    .slice(0, 5);

  const handleKpiClick = (kpi: Kpi) => navigate(`/kpi/${kpi.id}`);
  // Always navigate to detail page for consistent UX (MEDIUM fix)
  const handleTaskClick = (task: { id: string }) => navigate(`/tasks/${task.id}`);

  const actionButtons = isOwnerOrAbove && (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          새로 만들기
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setKpiDialogOpen(true)}>
          <TrendingUp className="h-4 w-4 mr-2" />
          KPI 추가
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTaskDialogOpen(true)}>
          <CheckSquare className="h-4 w-4 mr-2" />
          과제/To-Do 추가
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate('/budget')}>
          <DollarSign className="h-4 w-4 mr-2" />
          예산 추가
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <AppLayout 
      title="대시보드" 
      description="오늘의 핵심 지표와 업무를 확인하세요"
      actions={actionButtons}
    >
      {!profile?.org_id ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <Building2 className="h-16 w-16 text-muted-foreground mb-6" />
            <h3 className="text-xl font-semibold mb-2">조직에 소속되지 않았습니다</h3>
            <p className="text-muted-foreground mb-6">관리자에게 조직 초대를 요청하세요.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Executive Summary Bar */}
          <ExecutiveSummaryBar kpis={kpiTree} tasks={tasks} />

          {/* 3-Column Grid */}
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Left Column: AI Briefing + Attention + Task Donut */}
            <div className="lg:col-span-3 space-y-4">
              {briefingVisible ? (
                <AiBriefingCard onDismiss={() => setBriefingVisible(false)} />
              ) : (
                <AiBriefingReopen onReopen={() => setBriefingVisible(true)} />
              )}
              <AttentionWidget />
              <TaskProgressDonut tasks={tasks} />
            </div>

            {/* Center Column: KPI + Critical Tasks */}
            <div className="lg:col-span-5 space-y-4">
              {/* KPI Cards */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    KPI 현황
                    <Badge variant="secondary" className="text-xs">{kpiTree.length}</Badge>
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/kpis')}>
                    전체 보기
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                {kpisLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-[160px]" />
                    <Skeleton className="h-[160px]" />
                  </div>
                ) : kpiTree.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                      <TrendingUp className="h-10 w-10 text-muted-foreground mb-3" />
                      <h3 className="font-semibold mb-1">KPI가 없습니다</h3>
                      <p className="text-muted-foreground text-sm mb-3">첫 번째 KPI를 추가하여 시작하세요.</p>
                      {isOwnerOrAbove && (
                        <Button size="sm" onClick={() => setKpiDialogOpen(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          KPI 추가
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {kpiTree.slice(0, 4).map((kpi, index, arr) => {
                      const isLastOdd = arr.length % 2 !== 0 && index === arr.length - 1;
                      return (
                        <div key={kpi.id} className={isLastOdd ? 'sm:col-span-2' : ''}>
                          <KpiCard 
                            kpi={kpi} 
                            onClick={() => handleKpiClick(kpi)}
                            showChildren
                          />
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Critical Tasks */}
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    주의 필요 과제
                    {criticalTasks.length > 0 && (
                      <Badge variant="destructive" className="text-xs">{criticalTasks.length}</Badge>
                    )}
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/tasks')}>
                    전체 보기
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                
                <Card>
                  <CardContent className="p-0">
                    {tasksLoading ? (
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-16" />
                        <Skeleton className="h-16" />
                      </div>
                    ) : criticalTasks.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-6 text-center">
                        <span className="text-3xl mb-2">✅</span>
                        <p className="text-muted-foreground text-sm">주의가 필요한 과제가 없습니다!</p>
                      </div>
                    ) : (
                      <div className="divide-y">
                        {criticalTasks.map((task) => (
                          <TaskItem 
                            key={task.id} 
                            task={task} 
                            onClick={() => handleTaskClick(task)}
                            showKpi
                          />
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </section>
            </div>

            {/* Right Column: Approval + Budget + Activity Timeline */}
            <div className="lg:col-span-4 space-y-4">
              <ApprovalInbox onTaskClick={handleTaskClick} />

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span />
                  <Button variant="ghost" size="sm" onClick={() => navigate('/budget')}>
                    상세 보기
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
                <BudgetChart compact />
              </div>

              <ActivityTimeline />
            </div>
          </div>
        </div>
      )}

      <KpiDialog open={kpiDialogOpen} onOpenChange={setKpiDialogOpen} />
      <TaskDialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen} task={null} />
    </AppLayout>
  );
}
