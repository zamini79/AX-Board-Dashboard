import { useState, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useKpi, useKpis } from '@/hooks/useKpis';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { KPI_STATUS_CONFIG, Kpi } from '@/types/database';
import { AppLayout } from '@/components/layout/AppLayout';
import { KpiDialog } from '@/components/kpi/KpiDialog';
import { KpiTreeNode } from '@/components/kpi/KpiTreeNode';
import { TaskList } from '@/components/task/TaskList';
import { ItemEditorManager } from '@/components/editors/ItemEditorManager';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
  Edit,
  Trash2,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  User,
  Calendar,
  Target,
  Activity,
  GitBranch,
  AlertTriangle,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import React from 'react';

export default function KpiDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: kpiData, isLoading, error } = useKpi(id);
  const { deleteKpi, isDeleting } = useKpis();
  const { tasks: linkedTasks } = useTasks({ kpiId: id });
  const { isOwnerOrAbove } = useUserProfile();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Cast to include ancestors
  const kpi = kpiData as (Kpi & { ancestors?: Kpi[] }) | null | undefined;

  const hasChildren = kpi?.children && kpi.children.length > 0;
  const hasLinkedTasks = linkedTasks.length > 0;
  const hasDependencies = hasChildren || hasLinkedTasks;

  const handleDelete = async () => {
    if (!kpiData || hasDependencies) return;
    await deleteKpi(kpiData.id);
    navigate('/kpis');
  };

  if (isLoading) {
    return (
      <AppLayout title="KPI 상세">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-[200px]" />
          <Skeleton className="h-[300px]" />
        </div>
      </AppLayout>
    );
  }

  if (error || !kpi) {
    return (
      <AppLayout title="KPI 상세">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h3 className="font-semibold mb-2">KPI를 찾을 수 없습니다</h3>
          <p className="text-muted-foreground text-sm mb-4">
            요청하신 KPI가 존재하지 않거나 접근 권한이 없습니다.
          </p>
          <Button onClick={() => navigate('/')}>돌아가기</Button>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = KPI_STATUS_CONFIG[kpi.status];
  
  const progressPercent = kpi.computed_progress ?? (
    kpi.target_value && kpi.current_value
      ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
      : 0
  );

  const getTrendIcon = () => {
    if (!kpi.target_value || !kpi.current_value) return <Minus className="h-5 w-5 text-muted-foreground" />;
    const ratio = kpi.current_value / kpi.target_value;
    if (ratio >= 1) return <TrendingUp className="h-5 w-5 text-primary" />;
    if (ratio >= 0.8) return <Minus className="h-5 w-5 text-muted-foreground" />;
    return <TrendingDown className="h-5 w-5 text-destructive" />;
  };

  const formatValue = (value: number | null, unit: string | null) => {
    if (value === null) return '-';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === '원' || unit === 'KRW') return `₩${value.toLocaleString()}`;
    return `${value.toLocaleString()}${unit || ''}`;
  };

  const actionButtons = isOwnerOrAbove && (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
        <Edit className="h-4 w-4 mr-2" />
        수정
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
        <Trash2 className="h-4 w-4 mr-2" />
        삭제
      </Button>
    </div>
  );

  const ancestors = kpi.ancestors || [];

  return (
    <AppLayout 
      title={kpi.name} 
      description={kpi.description || undefined}
      actions={actionButtons}
    >
      <div className="space-y-6">
        {/* Breadcrumb navigation */}
        {ancestors.length > 0 && (
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/kpis">KPI</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              {ancestors.map((ancestor) => (
                <React.Fragment key={ancestor.id}>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to={`/kpi/${ancestor.id}`}>{ancestor.name}</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{kpi.name}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}

        {/* KPI Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">KPI 현황</CardTitle>
              <div className="flex items-center gap-2">
                {hasChildren && (
                  <Badge variant="secondary">
                    <GitBranch className="h-3 w-3 mr-1" />
                    하위 KPI {kpi.children!.length}개
                  </Badge>
                )}
                <Badge 
                  variant="outline" 
                  className={`${statusConfig.color}`}
                >
                  {statusConfig.emoji} {statusConfig.label}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Main metrics */}
            <div className="grid gap-6 sm:grid-cols-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="h-4 w-4" />
                  목표값
                </div>
                <span className="text-3xl font-bold">
                  {hasChildren ? '-' : formatValue(kpi.target_value, kpi.unit)}
                </span>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  현재값
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold">
                    {hasChildren ? '-' : formatValue(kpi.current_value, kpi.unit)}
                  </span>
                  {!hasChildren && getTrendIcon()}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  달성률 {hasChildren && <span className="text-xs">(하위 KPI 집계)</span>}
                </div>
                <span className="text-3xl font-bold">
                  {progressPercent.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>진행률</span>
                <span>{progressPercent.toFixed(0)}%</span>
              </div>
              <Progress value={progressPercent} className="h-3" />
            </div>

            {/* Meta info */}
            <div className="grid gap-4 sm:grid-cols-2 pt-4 border-t">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">담당자</p>
                  {kpi.owner ? (
                    <div className="flex items-center gap-2 mt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={kpi.owner.avatar_url || ''} />
                        <AvatarFallback className="text-xs">
                          {kpi.owner.full_name?.slice(0, 2) || kpi.owner.email.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">
                        {kpi.owner.full_name || kpi.owner.email}
                      </span>
                    </div>
                  ) : (
                    <span className="text-sm">미지정</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">최근 업데이트</p>
                  <span className="text-sm font-medium">
                    {kpi.last_updated_at
                      ? formatDistanceToNow(new Date(kpi.last_updated_at), { 
                          addSuffix: true, 
                          locale: ko 
                        })
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Child KPIs section */}
        {hasChildren && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-primary" />
                하위 KPI
                <Badge variant="secondary">{kpi.children!.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {kpi.children!.map(child => (
                <KpiTreeNode key={child.id} kpi={child} />
              ))}
            </CardContent>
          </Card>
        )}

        {/* Tasks connected to this KPI */}
        <TaskList 
          kpiId={kpi.id}
          type="kpi_action"
          title={`연결된 과제`}
          showKpi={false}
        />

        {/* Editor Management */}
        {isOwnerOrAbove && (
          <ItemEditorManager itemType="kpi" itemId={kpi.id} />
        )}

        {/* Edit Dialog */}
        <KpiDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          kpi={kpi}
        />

        {/* Delete Confirmation */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              {hasDependencies ? (
                <>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    삭제할 수 없습니다
                  </AlertDialogTitle>
                  <AlertDialogDescription asChild>
                    <div className="space-y-3">
                      <p>"{kpi.name}" KPI에 연결된 하위 항목이 있어 바로 삭제할 수 없습니다. 먼저 아래 항목들을 정리해 주세요.</p>
                      <ul className="list-disc pl-5 space-y-1 text-sm">
                        {hasChildren && (
                          <li>
                            <span className="font-medium">하위 KPI {kpi.children!.length}개</span> — 하위 KPI를 먼저 삭제하거나 다른 상위 KPI로 이동해 주세요.
                          </li>
                        )}
                        {hasLinkedTasks && (
                          <li>
                            <span className="font-medium">연결된 과제 {linkedTasks.length}개</span> — 연결된 과제를 먼저 삭제하거나 KPI 연결을 해제해 주세요.
                          </li>
                        )}
                      </ul>
                    </div>
                  </AlertDialogDescription>
                </>
              ) : (
                <>
                  <AlertDialogTitle>KPI를 삭제하시겠습니까?</AlertDialogTitle>
                  <AlertDialogDescription>
                    "{kpi.name}" KPI와 관련 데이터가 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
                  </AlertDialogDescription>
                </>
              )}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{hasDependencies ? '확인' : '취소'}</AlertDialogCancel>
              {!hasDependencies && (
                <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
                  {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  삭제
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppLayout>
  );
}
