import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTask, useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { TaskDialog } from '@/components/task/TaskDialog';
import { TaskApprovalActions } from '@/components/task/TaskApprovalActions';
import { TaskCheckinForm } from '@/components/task/TaskCheckinForm';
import { TaskCheckinList } from '@/components/task/TaskCheckinList';
import { TaskAttachments } from '@/components/task/TaskAttachments';
import { TaskComments } from '@/components/task/TaskComments';
import { ItemEditorManager } from '@/components/editors/ItemEditorManager';
import { TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, INITIATIVE_STATUS_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  CalendarDays,
  Edit,
  Trash2,
  Target,
  User,
  Loader2,
  Activity,
  MoreHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isOwnerOrAbove } = useUserProfile();
  const { data: task, isLoading } = useTask(id);
  const { deleteTask, isDeleting } = useTasks();

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!task) return;
    await deleteTask(task.id);
    navigate('/tasks');
  };

  if (isLoading) {
    return (
      <AppLayout title="과제 상세">
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40" />
          <Skeleton className="h-60" />
        </div>
      </AppLayout>
    );
  }

  if (!task) {
    return (
      <AppLayout title="과제 상세">
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-muted-foreground">과제를 찾을 수 없습니다.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록으로
          </Button>
        </div>
      </AppLayout>
    );
  }

  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
  const isActive = !['done', 'closed', 'cancelled'].includes(task.status);

  return (
    <AppLayout
      title={task.title}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/tasks')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            목록
          </Button>
          {isOwnerOrAbove && (
            <>
              <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4 mr-2" />
                수정
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    과제 삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Task info + checkin form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={task.status === 'blocked' ? 'destructive' : 'secondary'} className={statusConfig.color}>
                  {statusConfig.label}
                </Badge>
                <Badge variant="outline" className={priorityConfig.color}>
                  {priorityConfig.label}
                </Badge>
                <Badge variant="outline">
                  {task.type === 'kpi_action' ? 'KPI 과제' : 'To-Do'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{task.description}</p>
              )}

              {task.external_url && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">외부 링크</span>
                  <a
                    href={task.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline truncate max-w-[300px]"
                  >
                    {task.external_url}
                  </a>
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">진척도</span>
                  <span className="text-sm font-medium">{task.progress_percent}%</span>
                </div>
                <Progress value={task.progress_percent} className="h-3" />
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                {task.owner && (
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <Avatar className="h-5 w-5">
                      <AvatarImage src={task.owner.avatar_url || ''} />
                      <AvatarFallback className="text-[8px]">
                        {task.owner.full_name?.slice(0, 2) || task.owner.email.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                    <span>{task.owner.full_name || task.owner.email}</span>
                  </div>
                )}

                {task.kpis && task.kpis.length > 0 && (
                  <div className="flex flex-col gap-2 col-span-2">
                    <div className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-muted-foreground">연결 KPI</span>
                    </div>
                    <div className="space-y-2 ml-6">
                      {task.kpis.map(kpi => {
                        const achievement = kpi.target_value && kpi.target_value > 0
                          ? Math.min(100, ((kpi.current_value ?? 0) / kpi.target_value) * 100)
                          : 0;
                        return (
                          <div
                            key={kpi.id}
                            className="flex items-center gap-3 cursor-pointer hover:bg-accent/50 rounded-md p-2 -ml-2 transition-colors"
                            onClick={() => navigate(`/kpi/${kpi.id}`)}
                          >
                            <span className="text-sm font-medium truncate flex-1 min-w-0">{kpi.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              목표 {kpi.target_value ?? '-'}{kpi.unit || ''}
                            </span>
                            <span className="text-xs text-muted-foreground shrink-0">
                              현재 {kpi.current_value ?? '-'}{kpi.unit || ''}
                            </span>
                            <Badge variant="secondary" className="shrink-0 text-xs tabular-nums">
                              {achievement.toFixed(0)}%
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {task.initiatives && task.initiatives.length > 0 && (
                  <div className="flex items-center gap-2 col-span-2">
                    <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div className="flex flex-wrap gap-1">
                      {task.initiatives.map(init => {
                        const initStatus = INITIATIVE_STATUS_CONFIG[init.status];
                        return (
                          <Badge
                            key={init.id}
                            variant="outline"
                            className={`cursor-pointer hover:bg-accent transition-colors ${initStatus.color}`}
                            onClick={() => navigate(`/performance/${init.goal_id}`)}
                          >
                            {initStatus.emoji} {init.title}
                          </Badge>
                        );
                      })}
                    </div>
                  </div>
                )}

                {task.start_date && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>시작: {format(new Date(task.start_date), 'yyyy.M.d', { locale: ko })}</span>
                  </div>
                )}

                {task.due_date && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span>마감: {format(new Date(task.due_date), 'yyyy.M.d', { locale: ko })}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Attachments */}
          <TaskAttachments taskId={task.id} readonly={!isActive} />

          {/* Approval Actions */}
          {(task.status === 'done' || task.status === 'executive_review') && (
            <TaskApprovalActions task={task} />
          )}

          {/* Checkin Form (only for active tasks) */}
          {isActive && (
            <TaskCheckinForm taskId={task.id} currentProgress={task.progress_percent} />
          )}

          {/* Comments */}
          <TaskComments taskId={task.id} />

          {/* Editor Management */}
          {isOwnerOrAbove && (
            <ItemEditorManager itemType="task" itemId={task.id} />
          )}
        </div>

      {/* Right: Checkin History */}
        <div>
          <TaskCheckinList taskId={task.id} />
        </div>
      </div>

      {/* Edit Dialog */}
      <TaskDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        task={task}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>과제를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task.title}" 과제와 관련 체크인 이력이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}
