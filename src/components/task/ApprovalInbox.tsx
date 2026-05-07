import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TASK_STATUS_CONFIG } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  RotateCcw, 
  UserPlus, 
  Inbox,
  Clock,
  Loader2,
  AlertTriangle,
  CalendarDays,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface ApprovalInboxProps {
  onTaskClick?: (task: Task) => void;
}

export function ApprovalInbox({ onTaskClick }: ApprovalInboxProps) {
  const { user } = useAuth();
  const { canApprove, isManager } = useUserProfile();
  const navigate = useNavigate();

  // Approval tasks
  const { tasks: approvalTasks, isLoading: approvalLoading, approveTask, updateTask } = useTasks({
    status: ['executive_review', 'done'],
  });

  // My active tasks
  const { tasks: allActiveTasks, isLoading: myTasksLoading } = useTasks({
    status: ['not_started', 'in_progress', 'blocked'],
  });

  const { data: members = [] } = useOrgMembers();
  
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [delegateToUser, setDelegateToUser] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const pendingTasks = approvalTasks.filter(
    t => t.status === 'executive_review' || t.status === 'done'
  );

  const myTasks = allActiveTasks
    .filter(t => t.owner_id === user?.id)
    .sort((a, b) => {
      // Overdue first, then by due date
      const aDays = a.due_date ? differenceInDays(new Date(a.due_date), new Date()) : 999;
      const bDays = b.due_date ? differenceInDays(new Date(b.due_date), new Date()) : 999;
      return aDays - bDays;
    });

  const handleApprove = async (task: Task) => {
    if (!canApprove) return;
    setIsProcessing(true);
    try {
      await approveTask({ taskId: task.id, action: 'approve' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReopen = async (task: Task) => {
    if (!isManager) return;
    setIsProcessing(true);
    try {
      await approveTask({ taskId: task.id, action: 'reopen' });
    } finally {
      setIsProcessing(false);
    }
  };

  const openDelegateDialog = (task: Task) => {
    setSelectedTask(task);
    setDelegateToUser('');
    setDelegateDialogOpen(true);
  };

  const handleDelegate = async () => {
    if (!selectedTask || !delegateToUser) return;
    setIsProcessing(true);
    try {
      await updateTask({
        id: selectedTask.id,
        owner_id: delegateToUser,
        status: 'in_progress',
      });
      setDelegateDialogOpen(false);
      setSelectedTask(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task);
    } else {
      navigate(`/tasks/${task.id}`);
    }
  };

  const isLoading = approvalLoading || myTasksLoading;

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            To-Do
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Inbox className="h-5 w-5 text-primary" />
            To-Do
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate('/todos')}>
            전체 보기
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="my-tasks" className="w-full">
            <div className="px-4 pb-2">
              <TabsList className="w-full">
                <TabsTrigger value="my-tasks" className="flex-1">
                  내 과제 {myTasks.length > 0 && <Badge variant="secondary" className="ml-1">{myTasks.length}</Badge>}
                </TabsTrigger>
                <TabsTrigger value="approvals" className="flex-1">
                  승인 대기 {pendingTasks.length > 0 && <Badge variant="secondary" className="ml-1">{pendingTasks.length}</Badge>}
                </TabsTrigger>
              </TabsList>
            </div>

            {/* My Tasks Tab */}
            <TabsContent value="my-tasks" className="m-0">
              {myTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <span className="text-3xl mb-2">✅</span>
                  <p className="text-muted-foreground text-sm">할당된 진행중 과제가 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {myTasks.slice(0, 5).map((task) => {
                    const daysUntilDue = task.due_date
                      ? differenceInDays(new Date(task.due_date), new Date())
                      : null;
                    const isOverdue = daysUntilDue !== null && daysUntilDue < 0;

                    return (
                      <div
                        key={task.id}
                        className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm truncate flex-1">{task.title}</p>
                          <Badge
                            variant={task.status === 'blocked' ? 'destructive' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {TASK_STATUS_CONFIG[task.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.due_date && (
                            <div className="flex items-center gap-1">
                              {isOverdue ? (
                                <AlertTriangle className="h-3 w-3 text-destructive" />
                              ) : (
                                <CalendarDays className="h-3 w-3" />
                              )}
                              <span className={isOverdue ? 'text-destructive font-medium' : ''}>
                                {isOverdue
                                  ? `지연 D+${Math.abs(daysUntilDue!)}`
                                  : format(new Date(task.due_date), 'M/d', { locale: ko })}
                              </span>
                            </div>
                          )}
                          <span>{task.progress_percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* Approvals Tab */}
            <TabsContent value="approvals" className="m-0">
              {pendingTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                  <span className="text-3xl mb-2">📭</span>
                  <p className="text-muted-foreground text-sm">승인 대기 항목이 없습니다</p>
                </div>
              ) : (
                <div className="divide-y">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div
                        className="cursor-pointer mb-3"
                        onClick={() => handleTaskClick(task)}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-medium text-sm truncate flex-1">{task.title}</p>
                          <Badge
                            variant={task.status === 'executive_review' ? 'default' : 'secondary'}
                            className="text-xs shrink-0"
                          >
                            {TASK_STATUS_CONFIG[task.status].label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          {task.owner && (
                            <div className="flex items-center gap-1">
                              <Avatar className="h-4 w-4">
                                <AvatarImage src={task.owner.avatar_url || ''} />
                                <AvatarFallback className="text-[8px]">
                                  {task.owner.full_name?.slice(0, 2) || task.owner.email.slice(0, 2)}
                                </AvatarFallback>
                              </Avatar>
                              <span>{task.owner.full_name || task.owner.email.split('@')[0]}</span>
                            </div>
                          )}
                          {task.last_checkin_at && (
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {formatDistanceToNow(new Date(task.last_checkin_at), {
                                  addSuffix: true,
                                  locale: ko,
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {canApprove && (
                          <Button
                            size="sm"
                            variant="default"
                            className="flex-1"
                            onClick={() => handleApprove(task)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-1" />
                                승인
                              </>
                            )}
                          </Button>
                        )}
                        {isManager && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleReopen(task)}
                              disabled={isProcessing}
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              재요청
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDelegateDialog(task)}
                              disabled={isProcessing}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              재할당
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Delegate Dialog */}
      <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>과제 재할당</DialogTitle>
            <DialogDescription>
              새로운 담당자를 선택하여 과제를 재할당합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm font-medium mb-2">과제: {selectedTask?.title}</p>
            <p className="text-xs text-muted-foreground mb-4">
              현재 담당자: {selectedTask?.owner?.full_name || selectedTask?.owner?.email}
            </p>
            <Select value={delegateToUser} onValueChange={setDelegateToUser}>
              <SelectTrigger>
                <SelectValue placeholder="새 담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(m => m.id !== selectedTask?.owner_id)
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-[8px]">
                            {member.full_name?.slice(0, 2) || member.email.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {member.full_name || member.email}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelegateDialogOpen(false)} disabled={isProcessing}>
              취소
            </Button>
            <Button onClick={handleDelegate} disabled={!delegateToUser || isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              재할당
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
