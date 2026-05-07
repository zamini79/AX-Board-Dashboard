import { Task } from '@/types/database';
import { getTaskSignal, getSignalColor, TaskSignal } from '@/lib/taskSignal';
import { cn } from '@/lib/utils';

interface Props {
  tasks: Task[];
  activeSignal: TaskSignal | null;
  onSignalClick: (signal: TaskSignal | null) => void;
}

const SIGNAL_CONFIG: Record<TaskSignal, { label: string; emoji: string; desc: string }> = {
  red: { label: '위험', emoji: '🔴', desc: 'Blocked · 지연' },
  yellow: { label: '주의', emoji: '🟡', desc: '마감임박 · 승인대기' },
  green: { label: '정상', emoji: '🟢', desc: '진행중 · 완료' },
};

export function TaskTrafficLight({ tasks, activeSignal, onSignalClick }: Props) {
  const groups: Record<TaskSignal, Task[]> = { red: [], yellow: [], green: [] };
  tasks.forEach(t => {
    const sig = getTaskSignal(t);
    groups[sig].push(t);
  });

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">신호등 현황</h3>
      <div className="space-y-2">
        {(['red', 'yellow', 'green'] as TaskSignal[]).map(signal => {
          const cfg = SIGNAL_CONFIG[signal];
          const col = getSignalColor(signal);
          const items = groups[signal];
          const isActive = activeSignal === signal;

          return (
            <button
              key={signal}
              onClick={() => onSignalClick(isActive ? null : signal)}
              className={cn(
                'w-full rounded-md border p-3 text-left transition-all hover:bg-muted/40',
                col.light, col.border,
                isActive && 'ring-2 ring-primary'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span>{cfg.emoji}</span>
                  <span className={cn('text-sm font-semibold', col.text)}>{cfg.label}</span>
                </div>
                <span className={cn('text-lg font-bold', col.text)}>{items.length}</span>
              </div>
              <div className="text-xs text-muted-foreground mb-1">{cfg.desc}</div>
              {items.length > 0 && (
                <ul className="space-y-0.5">
                  {items.slice(0, 3).map(t => (
                    <li key={t.id} className="text-xs text-muted-foreground truncate">
                      • {t.title}
                    </li>
                  ))}
                  {items.length > 3 && (
                    <li className="text-xs text-muted-foreground">외 {items.length - 3}건 더</li>
                  )}
                </ul>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
