import { useNavigate } from 'react-router-dom';
import { Task, TaskStatus, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { CalendarDays } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';

const KANBAN_COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'not_started', label: '미시작' },
  { status: 'in_progress', label: '진행중' },
  { status: 'blocked', label: 'Blocked' },
  { status: 'done', label: '완료' },
  { status: 'executive_review', label: '승인대기' },
  { status: 'closed', label: '종료' },
];

interface TodoKanbanBoardProps {
  tasks: Task[];
}

function KanbanCard({ task }: { task: Task }) {
  const navigate = useNavigate();
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];
  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && !['done', 'closed', 'cancelled'].includes(task.status);

  return (
    <div
      className="p-3 rounded-lg border border-border/50 bg-card hover:shadow-md transition-shadow cursor-pointer space-y-2"
      onClick={() => navigate(`/tasks/${task.id}`)}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium line-clamp-2 flex-1">{task.title}</p>
        {task.priority === 'high' && (
          <Badge variant="outline" className={`text-[10px] shrink-0 ${priorityConfig.color}`}>
            높음
          </Badge>
        )}
      </div>

      <Progress value={task.progress_percent} className="h-1.5" />

      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          {task.owner && (
            <Avatar className="h-5 w-5">
              <AvatarImage src={task.owner.avatar_url || ''} />
              <AvatarFallback className="text-[8px]">
                {task.owner.full_name?.slice(0, 2) || '?'}
              </AvatarFallback>
            </Avatar>
          )}
          <span className="truncate max-w-[60px]">
            {task.owner?.full_name || task.owner_name || '미지정'}
          </span>
        </div>
        {task.due_date && (
          <div className={`flex items-center gap-1 ${isOverdue ? 'text-destructive font-medium' : ''}`}>
            <CalendarDays className="h-3 w-3" />
            {format(new Date(task.due_date), 'M/d', { locale: ko })}
          </div>
        )}
      </div>
    </div>
  );
}

export function TodoKanbanBoard({ tasks }: TodoKanbanBoardProps) {
  const grouped = KANBAN_COLUMNS.map(col => ({
    ...col,
    tasks: tasks.filter(t => t.status === col.status),
  }));

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-w-max">
        {grouped.map((col) => {
          const config = TASK_STATUS_CONFIG[col.status];
          return (
            <div key={col.status} className="w-64 shrink-0">
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className={`h-2.5 w-2.5 rounded-full ${config.bgColor}`} />
                <span className="text-sm font-medium">{col.label}</span>
                <Badge variant="secondary" className="text-[10px] px-1.5 h-5 ml-auto">
                  {col.tasks.length}
                </Badge>
              </div>
              <div className="space-y-2 min-h-[100px] rounded-lg bg-muted/30 p-2">
                {col.tasks.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">없음</p>
                ) : (
                  col.tasks.map(task => <KanbanCard key={task.id} task={task} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
