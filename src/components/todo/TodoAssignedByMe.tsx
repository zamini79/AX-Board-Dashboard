import { useNavigate } from 'react-router-dom';
import { Task, TASK_STATUS_CONFIG } from '@/types/database';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Send } from 'lucide-react';

interface TodoAssignedByMeProps {
  tasks: Task[];
}

export function TodoAssignedByMe({ tasks }: TodoAssignedByMeProps) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const myAssigned = tasks.filter(t => t.assigner_id === user?.id && t.status !== 'cancelled');

  // Group by owner
  const grouped = myAssigned.reduce<Record<string, Task[]>>((acc, task) => {
    const key = task.owner_id || 'unassigned';
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const pendingApproval = myAssigned.filter(t => t.status === 'executive_review' || t.status === 'done');

  if (myAssigned.length === 0) {
    return (
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Send className="h-4 w-4" />
            내가 할당한 To-Do
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">할당한 To-Do가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Send className="h-4 w-4" />
          내가 할당한 To-Do
          <Badge variant="secondary" className="ml-auto text-xs">{myAssigned.length}건</Badge>
        </CardTitle>
        {pendingApproval.length > 0 && (
          <p className="text-xs text-yellow-600">⚠ 승인 대기 {pendingApproval.length}건</p>
        )}
      </CardHeader>
      <CardContent className="space-y-1 p-0">
        {Object.entries(grouped).map(([ownerId, ownerTasks]) => {
          const owner = ownerTasks[0]?.owner;
          return (
            <div key={ownerId}>
              <div className="flex items-center gap-2 px-4 py-2 bg-muted/30">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={owner?.avatar_url || ''} />
                  <AvatarFallback className="text-[8px]">
                    {owner?.full_name?.slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">{owner?.full_name || '미지정'}</span>
                <span className="text-xs text-muted-foreground ml-auto">{ownerTasks.length}건</span>
              </div>
              {ownerTasks.map(task => {
                const statusConfig = TASK_STATUS_CONFIG[task.status];
                const isHighlight = task.status === 'executive_review' || task.status === 'done';
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/30 last:border-b-0 ${isHighlight ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="secondary" className={`text-[10px] ${statusConfig.color}`}>
                          {statusConfig.label}
                        </Badge>
                        {task.last_checkin_at && (
                          <span className="text-[10px] text-muted-foreground">
                            최근 업데이트: {formatDistanceToNow(new Date(task.last_checkin_at), { addSuffix: true, locale: ko })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-medium tabular-nums">{task.progress_percent}%</span>
                      <Progress value={task.progress_percent} className="w-16 h-1.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
