import { Task } from '@/types/database';
import { getTaskSignal } from '@/lib/taskSignal';
import { format, isAfter, isBefore, addDays, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { CalendarDays, AlertCircle, Clock, CheckCircle2, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  onFilterSignal?: (signal: 'red' | 'yellow' | 'green' | null) => void;
  activeSignal?: 'red' | 'yellow' | 'green' | null;
}

export function TaskHeadlineSummary({ tasks, onFilterSignal, activeSignal }: Props) {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);

  const active = tasks.filter(t => t.status !== 'closed' && t.status !== 'cancelled');
  const completed = tasks.filter(t => t.status === 'done' || t.status === 'closed');
  const completionRate = tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0;

  const redCount = active.filter(t => getTaskSignal(t) === 'red').length;
  const yellowCount = active.filter(t => getTaskSignal(t) === 'yellow').length;
  const dueThisWeek = active.filter(t => {
    if (!t.due_date) return false;
    const due = startOfDay(new Date(t.due_date));
    return !isBefore(due, today) && isBefore(due, nextWeek);
  }).length;

  const stats = [
    {
      icon: <Activity className="h-4 w-4" />,
      label: '전체 과제',
      value: tasks.length,
      sub: `활성 ${active.length}건`,
      signal: null as null,
      onClick: () => onFilterSignal?.(null),
    },
    {
      icon: <AlertCircle className="h-4 w-4" />,
      label: '위험 (🔴)',
      value: redCount,
      sub: 'Blocked / 지연',
      signal: 'red' as const,
      onClick: () => onFilterSignal?.(activeSignal === 'red' ? null : 'red'),
    },
    {
      icon: <Clock className="h-4 w-4" />,
      label: '주의 (🟡)',
      value: yellowCount,
      sub: '마감임박 / 승인대기',
      signal: 'yellow' as const,
      onClick: () => onFilterSignal?.(activeSignal === 'yellow' ? null : 'yellow'),
    },
    {
      icon: <CheckCircle2 className="h-4 w-4" />,
      label: '완료',
      value: completed.length,
      sub: `완료율 ${completionRate}%`,
      signal: 'green' as const,
      onClick: () => onFilterSignal?.(activeSignal === 'green' ? null : 'green'),
    },
  ];

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* Date + Title row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CalendarDays className="h-4 w-4" />
          <span className="font-medium text-foreground">
            {format(today, 'yyyy년 M월 d일 (EEE)', { locale: ko })} 기준 과제 현황
          </span>
        </div>
        {dueThisWeek > 0 && (
          <Badge variant="outline" className="border-orange-300 text-orange-700 bg-orange-50 text-xs">
            이번 주 마감 {dueThisWeek}건
          </Badge>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map((stat) => {
          const isActive = stat.signal === activeSignal;
          return (
            <button
              key={stat.label}
              onClick={stat.onClick}
              className={cn(
                'flex items-center gap-3 rounded-md border p-3 text-left transition-all hover:bg-muted/50',
                isActive && 'ring-2 ring-primary bg-muted/60'
              )}
            >
              <div className={cn(
                'p-1.5 rounded-md',
                stat.signal === 'red' && 'bg-red-100 text-red-600',
                stat.signal === 'yellow' && 'bg-yellow-100 text-yellow-600',
                stat.signal === 'green' && 'bg-green-100 text-green-600',
                stat.signal === null && 'bg-primary/10 text-primary',
              )}>
                {stat.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold leading-none">{stat.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5 truncate">{stat.sub}</div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">전체 완료율</span>
        <Progress value={completionRate} className="flex-1 h-2" />
        <span className="text-xs font-semibold w-10 text-right">{completionRate}%</span>
      </div>
    </div>
  );
}
