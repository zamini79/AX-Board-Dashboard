import { useState } from 'react';
import { Task } from '@/types/database';
import { Department } from '@/types/database';
import { getTaskSignal, TaskSignal } from '@/lib/taskSignal';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  tasks: Task[];
  departments: Department[];
  activeDeptId: string | null;
  onDeptClick: (deptId: string | null) => void;
}

function SignalDot({ signal, title }: { signal: TaskSignal; title: string }) {
  const cls = signal === 'red' ? 'bg-destructive' : signal === 'yellow' ? 'bg-[hsl(var(--chart-4))]' : 'bg-[hsl(var(--chart-2))]';
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className={cn('inline-block w-3 h-3 rounded-full cursor-default shrink-0', cls)} aria-label={title} />
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">{title}</TooltipContent>
    </Tooltip>
  );
}

export function TaskDeptHeatmap({ tasks, departments, activeDeptId, onDeptClick }: Props) {
  const deptMap = new Map(departments.map(d => [d.id, d]));

  const deptTasksMap = new Map<string, Task[]>();
  const noDeptTasks: Task[] = [];

  tasks.forEach(t => {
    if (t.department_id) {
      if (!deptTasksMap.has(t.department_id)) deptTasksMap.set(t.department_id, []);
      deptTasksMap.get(t.department_id)!.push(t);
    } else {
      noDeptTasks.push(t);
    }
  });

  const rows: { id: string | null; name: string; tasks: Task[] }[] = [];
  departments.forEach(d => {
    const dt = deptTasksMap.get(d.id);
    if (dt && dt.length > 0) rows.push({ id: d.id, name: d.name, tasks: dt });
  });
  deptTasksMap.forEach((dtasks, deptId) => {
    if (!deptMap.has(deptId)) rows.push({ id: deptId, name: '기타 부서', tasks: dtasks });
  });
  if (noDeptTasks.length > 0) rows.push({ id: null, name: '부서 미지정', tasks: noDeptTasks });

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-muted-foreground">부서별 과제 데이터가 없습니다</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card p-4 space-y-3">
        <h3 className="text-sm font-semibold">부서별 현황</h3>
        <div className="space-y-2">
          {rows.map(row => {
            const done = row.tasks.filter(t => t.status === 'done' || t.status === 'closed').length;
            const rate = row.tasks.length > 0 ? Math.round((done / row.tasks.length) * 100) : 0;
            const isActive = activeDeptId === row.id;

            return (
              <button
                key={row.id ?? '__none__'}
                onClick={() => onDeptClick(isActive ? null : row.id)}
                className={cn(
                  'w-full rounded-md border px-3 py-2 text-left transition-all hover:bg-muted/40',
                  isActive && 'ring-2 ring-primary bg-muted/40'
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-medium truncate max-w-[100px]">{row.name}</span>
                  <span className="text-xs text-muted-foreground">{rate}%</span>
                </div>
                <div className="flex items-center gap-1 flex-wrap mb-1.5">
                  {row.tasks.map(t => (
                    <SignalDot key={t.id} signal={getTaskSignal(t)} title={t.title} />
                  ))}
                </div>
                <Progress value={rate} className="h-1" />
              </button>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
