import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow, differenceInDays, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Clock, AlertTriangle, CalendarDays, ExternalLink, FileText, Pencil, Check, Loader2 } from 'lucide-react';

interface TaskItemProps {
  task: Task;
  onClick?: () => void;
  showKpi?: boolean;
}

export function TaskItem({ task, onClick, showKpi = false }: TaskItemProps) {
  const navigate = useNavigate();
  const { updateTask } = useTasks();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [sliderValue, setSliderValue] = useState(task.progress_percent ?? 0);
  const [isSaving, setIsSaving] = useState(false);

  const handleClick = () => {
    if (onClick) onClick();
    else navigate(`/tasks/${task.id}`);
  };

  const statusConfig = TASK_STATUS_CONFIG[task.status];
  const priorityConfig = TASK_PRIORITY_CONFIG[task.priority];

  const daysUntilDue = task.due_date
    ? differenceInDays(new Date(task.due_date), new Date())
    : null;

  const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
  const isUrgent = daysUntilDue !== null && daysUntilDue <= 3 && daysUntilDue >= 0;

  const isStale = task.last_checkin_at
    ? differenceInDays(new Date(), new Date(task.last_checkin_at)) > 7
    : differenceInDays(new Date(), new Date(task.created_at)) > 7;

  const hasExtraInfo = task.description || task.external_url;
  const isCompleted = task.status === 'done' || task.status === 'closed' || task.status === 'cancelled';

  const handleProgressOpen = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSliderValue(task.progress_percent ?? 0);
    setPopoverOpen(true);
  };

  const handleProgressSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await updateTask({ id: task.id, progress_percent: sliderValue });
      setPopoverOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="p-4 hover:bg-muted/50 transition-colors cursor-pointer border-b last:border-b-0"
      onClick={handleClick}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0 space-y-2">
          {/* Status & Priority badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={task.status === 'blocked' ? 'destructive' : 'secondary'}
              className={`text-xs ${statusConfig.color}`}
            >
              {task.status === 'blocked' ? '🔴' : isCompleted ? '✅' : ''} {statusConfig.label}
            </Badge>

            {task.priority === 'high' && (
              <Badge variant="outline" className={`text-xs ${priorityConfig.color}`}>
                {priorityConfig.label}
              </Badge>
            )}

            {isStale && !isCompleted && (
              <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                <AlertTriangle className="h-3 w-3 mr-1" />
                업데이트 필요
              </Badge>
            )}

            {isOverdue && !isCompleted && (
              <Badge variant="destructive" className="text-xs">
                지연 D+{Math.abs(daysUntilDue!)}
              </Badge>
            )}

            {isUrgent && !isOverdue && (
              <Badge variant="outline" className="text-xs text-yellow-600 border-yellow-300">
                D-{daysUntilDue}
              </Badge>
            )}
          </div>

          {/* Title */}
          <p className="font-medium truncate">{task.title}</p>

          {/* Extra info indicators */}
          {hasExtraInfo && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {task.description && (
                <span className="text-muted-foreground bg-muted rounded px-2 py-0.5 flex items-center gap-1">
                  <FileText className="h-3 w-3 shrink-0" />
                  <span className="line-clamp-2">{task.description}</span>
                </span>
              )}
              {task.external_url && (
                <span className="text-primary bg-primary/10 rounded px-2 py-0.5 flex items-center gap-1 truncate max-w-[200px]">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  외부 링크
                </span>
              )}
            </div>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {task.owner && (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={task.owner.avatar_url || ''} />
                  <AvatarFallback className="text-[8px]">
                    {task.owner.full_name?.slice(0, 2) || task.owner.email.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate max-w-[80px]">
                  {task.owner.full_name || task.owner.email.split('@')[0]}
                </span>
              </div>
            )}

            {task.due_date && (
              <div className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" />
                <span>{format(new Date(task.due_date), 'M/d', { locale: ko })}</span>
              </div>
            )}

            {showKpi && task.kpis && task.kpis.length > 0 && (
              <div className="flex items-center gap-1">
                {task.kpis.slice(0, 2).map(kpi => {
                  const achievement =
                    kpi.target_value && kpi.target_value > 0
                      ? Math.min(100, ((kpi.current_value ?? 0) / kpi.target_value) * 100)
                      : 0;
                  return (
                    <span key={kpi.id} className="text-primary truncate max-w-[120px]">
                      {kpi.name}{' '}
                      <span className="text-muted-foreground">({achievement.toFixed(0)}%)</span>
                    </span>
                  );
                })}
                {task.kpis.length > 2 && (
                  <span className="text-muted-foreground text-xs">+{task.kpis.length - 2}</span>
                )}
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

        {/* Progress + external link shortcut */}
        <div className="flex items-center gap-2 shrink-0">
          {task.external_url && (
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md border border-border text-muted-foreground hover:text-primary hover:border-primary transition-colors"
              title="외부 링크 열기"
              onClick={(e) => {
                e.stopPropagation();
                window.open(task.external_url!, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </button>
          )}

          {/* Inline progress editor — read-only for completed tasks */}
          {isCompleted ? (
            <div className="flex flex-col items-end gap-1.5 select-none">
              <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                {task.progress_percent}%
              </span>
              <Progress value={task.progress_percent} className="w-24 h-2.5 opacity-60" />
            </div>
          ) : (
            <Popover open={popoverOpen} onOpenChange={(o) => { if (!o) setPopoverOpen(false); }}>
              <PopoverTrigger asChild>
                <div
                  className="flex flex-col items-end gap-1.5 group cursor-pointer select-none"
                  onClick={handleProgressOpen}
                  title="진행률 수정"
                >
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-semibold tabular-nums">
                      {task.progress_percent}%
                    </span>
                    <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <Progress value={task.progress_percent} className="w-24 h-2.5" />
                </div>
              </PopoverTrigger>
              <PopoverContent
                className="w-64 p-4"
                side="left"
                align="center"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">진행률 수정</span>
                    <span className="text-lg font-bold tabular-nums text-primary">{sliderValue}%</span>
                  </div>
                  <Slider
                    value={[sliderValue]}
                    onValueChange={([v]) => setSliderValue(v)}
                    min={0}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={(e) => { e.stopPropagation(); setPopoverOpen(false); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-7 text-xs gap-1"
                      disabled={isSaving}
                      onClick={handleProgressSave}
                    >
                      {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Check className="h-3 w-3" />
                      )}
                      저장
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>
      </div>
    </div>
  );
}
