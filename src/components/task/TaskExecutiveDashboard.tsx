import { useRef } from 'react';
import { Task, Department } from '@/types/database';
import { TaskSignal } from '@/lib/taskSignal';
import { TaskHeadlineSummary } from './TaskHeadlineSummary';
import { TaskTrafficLight } from './TaskTrafficLight';
import { TaskGanttChart } from './TaskGanttChart';
import { TaskDeptHeatmap } from './TaskDeptHeatmap';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export interface ExternalFilter {
  signal?: TaskSignal | null;
  deptId?: string | null;
}

interface Props {
  tasks: Task[];
  departments: Department[];
  filter: ExternalFilter;
  onFilterChange: (f: ExternalFilter) => void;
}

async function exportDashboardAsImage(element: HTMLElement | null) {
  if (!element) return;
  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    backgroundColor: null,
    scale: 2,
    useCORS: true,
    logging: false,
  });
  const link = document.createElement('a');
  link.download = `과제현황_${new Date().toISOString().slice(0, 10)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function TaskExecutiveDashboard({ tasks, departments, filter, onFilterChange }: Props) {
  const dashboardRef = useRef<HTMLDivElement>(null);

  return (
    <div className="space-y-3">
      {/* Export button */}
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="h-7 text-xs px-3 gap-1.5"
          onClick={() => exportDashboardAsImage(dashboardRef.current)}
        >
          <Download className="h-3.5 w-3.5" />
          이미지 저장
        </Button>
      </div>

      <div ref={dashboardRef} className="space-y-3">
        {/* Zone 1: Headline */}
        <TaskHeadlineSummary
          tasks={tasks}
          activeSignal={filter.signal ?? null}
          onFilterSignal={signal => onFilterChange({ ...filter, signal })}
        />

        {/* Zone 2: 3-panel grid — stacks on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)_200px] gap-3 items-start">
          <TaskTrafficLight
            tasks={tasks}
            activeSignal={filter.signal ?? null}
            onSignalClick={signal => onFilterChange({ ...filter, signal })}
          />
          {/* Gantt: hidden on small screens, shown from md up */}
          <div className="hidden md:block min-w-0 overflow-hidden">
            <TaskGanttChart tasks={tasks} />
          </div>
          <TaskDeptHeatmap
            tasks={tasks}
            departments={departments}
            activeDeptId={filter.deptId ?? null}
            onDeptClick={deptId => onFilterChange({ ...filter, deptId })}
          />
        </div>

        {/* Gantt on mobile: full width below the two panels */}
        <div className="md:hidden overflow-hidden">
          <TaskGanttChart tasks={tasks} />
        </div>
      </div>
    </div>
  );
}
