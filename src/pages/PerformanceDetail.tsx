import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useGoal } from '@/hooks/useGoals';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useMetricSnapshots } from '@/hooks/useMetricSnapshots';
import { useUserProfile } from '@/hooks/useUserProfile';
import { GOAL_STATUS_CONFIG, BSC_PERSPECTIVE_CONFIG, PerformanceGoal, Initiative } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { GoalDialog } from '@/components/performance/GoalDialog';
import { GoalTreeNode } from '@/components/performance/GoalTreeNode';
import { InitiativeCard } from '@/components/performance/InitiativeCard';
import { InitiativeDialog } from '@/components/performance/InitiativeDialog';
import { PerformanceTrendChart } from '@/components/performance/PerformanceTrendChart';
import { MetricSnapshotForm } from '@/components/performance/MetricSnapshotForm';
import { ItemEditorManager } from '@/components/editors/ItemEditorManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Edit, User, Calendar, Target, Activity, GitBranch, Plus, Trophy } from 'lucide-react';
import React from 'react';

export default function PerformanceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: goalData, isLoading, error } = useGoal(id);
  const { initiatives, isLoading: initLoading } = useInitiatives(id);
  const { isOwnerOrAbove } = useUserProfile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [initDialogOpen, setInitDialogOpen] = useState(false);
  const [selectedInit, setSelectedInit] = useState<Initiative | null>(null);
  const [selectedInitForChart, setSelectedInitForChart] = useState<string | undefined>();

  const { snapshots } = useMetricSnapshots(selectedInitForChart);

  const goal = goalData as (PerformanceGoal & { ancestors?: PerformanceGoal[] }) | null | undefined;

  if (isLoading) {
    return (
      <AppLayout title="성과 목표 상세">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !goal) {
    return (
      <AppLayout title="성과 목표 상세">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="font-semibold mb-2">성과 목표를 찾을 수 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">요청하신 항목이 존재하지 않거나 접근 권한이 없습니다.</p>
          <Button onClick={() => navigate('/performance')}>돌아가기</Button>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const hasChildren = goal.children && goal.children.length > 0;
  const score = goal.computed_score ?? goal.overall_score ?? 0;
  const ancestors = goal.ancestors || [];

  const actionButtons = isOwnerOrAbove && (
    <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
      <Edit className="h-4 w-4 mr-2" />수정
    </Button>
  );

  return (
    <AppLayout title={goal.title} description={goal.description || undefined} actions={actionButtons}>
      <div className="space-y-6">
        {ancestors.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/performance">성과 관리</Link></BreadcrumbLink></BreadcrumbItem>
              {ancestors.map(a => (
                <React.Fragment key={a.id}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem><BreadcrumbLink asChild><Link to={`/performance/${a.id}`}>{a.title}</Link></BreadcrumbLink></BreadcrumbItem>
                </React.Fragment>
              ))}
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>{goal.title}</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* Overview */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">성과 현황</CardTitle>
              <div className="flex items-center gap-2">
                {goal.perspective && (
                  <Badge variant="secondary">
                    {BSC_PERSPECTIVE_CONFIG[goal.perspective].emoji} {BSC_PERSPECTIVE_CONFIG[goal.perspective].label}
                  </Badge>
                )}
                {hasChildren && <Badge variant="secondary"><GitBranch className="h-3 w-3 mr-1" />하위 {goal.children!.length}개</Badge>}
                <Badge variant="outline" className={statusConfig.color}>{statusConfig.emoji} {statusConfig.label}</Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Activity className="h-4 w-4" />달성률</div>
                <span className="text-3xl font-bold">{score.toFixed(1)}%</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground"><Target className="h-4 w-4" />이니셔티브</div>
                <span className="text-3xl font-bold">{initiatives.length}개</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground"><span>진행률</span><span>{score.toFixed(0)}%</span></div>
              <Progress value={score} className="h-3" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">담당자</p>
                  {goal.owner ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6"><AvatarImage src={goal.owner.avatar_url || ''} /><AvatarFallback className="text-xs">{goal.owner.full_name?.slice(0, 2) || '?'}</AvatarFallback></Avatar>
                      <span className="text-sm font-medium">{goal.owner.full_name || goal.owner.email}</span>
                    </div>
                  ) : <span className="text-sm">{goal.owner_name || '미지정'}</span>}
                </div>
              </div>
              {goal.target_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div><p className="text-sm text-muted-foreground">목표일</p><span className="text-sm font-medium">{goal.target_date}</span></div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Children */}
        {hasChildren && (
          <Card>
            <CardHeader><CardTitle className="text-lg flex items-center gap-2"><GitBranch className="h-5 w-5 text-primary" />하위 성과 목표<Badge variant="secondary">{goal.children!.length}</Badge></CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {goal.children!.map(child => <GoalTreeNode key={child.id} goal={child} />)}
            </CardContent>
          </Card>
        )}

        {/* Initiatives */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" />이니셔티브<Badge variant="secondary">{initiatives.length}</Badge></CardTitle>
              {isOwnerOrAbove && (
                <Button size="sm" onClick={() => { setSelectedInit(null); setInitDialogOpen(true); }}>
                  <Plus className="h-4 w-4 mr-2" />추가
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {initLoading ? (
              <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-[120px]" />)}</div>
            ) : initiatives.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">이니셔티브가 없습니다.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {initiatives.map(init => (
                  <InitiativeCard
                    key={init.id}
                    initiative={init}
                    onClick={() => {
                      setSelectedInit(init);
                      setSelectedInitForChart(init.id);
                      if (isOwnerOrAbove) setInitDialogOpen(true);
                    }}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trend chart for selected initiative */}
        {selectedInitForChart && (
          <>
            <PerformanceTrendChart
              snapshots={snapshots}
              unit={initiatives.find(i => i.id === selectedInitForChart)?.unit}
            />
            <MetricSnapshotForm
              initiativeId={selectedInitForChart}
              targetValue={initiatives.find(i => i.id === selectedInitForChart)?.target_value}
            />
          </>
        )}

        {/* Editor Management */}
        {isOwnerOrAbove && (
          <ItemEditorManager itemType="goal" itemId={goal.id} />
        )}

        <GoalDialog open={editDialogOpen} onOpenChange={setEditDialogOpen} goal={goal} />
        {id && <InitiativeDialog open={initDialogOpen} onOpenChange={setInitDialogOpen} goalId={id} initiative={selectedInit} />}
      </div>
    </AppLayout>
  );
}
