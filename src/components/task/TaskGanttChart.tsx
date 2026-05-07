import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Task } from '@/types/database';
import { getTaskSignal } from '@/lib/taskSignal';
import { format, addDays, differenceInDays, startOfDay, subDays, isSameDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const TOTAL_RENDER_DAYS = 365;
const DEFAULT_PAST_DAYS = 20;
const STEP_DAYS = 14;
const COL_WIDTH = 26;
const NAME_COL = 120;

interface Props {
  tasks: Task[];
}

function signalBarClass(signal: 'red' | 'yellow' | 'green') {
  if (signal === 'red') return 'bg-destructive';
  if (signal === 'yellow') return 'bg-[hsl(var(--chart-4))]';
  return 'bg-primary';
}

export function TaskGanttChart({ tasks: allTasks }: Props) {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isAtDefault, setIsAtDefault] = useState(true);
  const [showNoDates, setShowNoDates] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const canvasStart = useMemo(() => subDays(today, Math.floor(TOTAL_RENDER_DAYS / 2)), [today]);
  const todayColIndex = useMemo(() => differenceInDays(today, canvasStart), [today, canvasStart]);
  const totalCanvasWidth = TOTAL_RENDER_DAYS * COL_WIDTH;
  const defaultScrollLeft = useMemo(
    () => todayColIndex * COL_WIDTH - DEFAULT_PAST_DAYS * COL_WIDTH,
    [todayColIndex],
  );

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollLeft = Math.max(0, defaultScrollLeft);
  }, [defaultScrollLeft]);

  const scrollByDays = useCallback((days: number) => {
    const el = scrollRef.current;
    if (el) el.scrollBy({ left: days * COL_WIDTH, behavior: 'smooth' });
  }, []);

  const scrollToToday = useCallback(() => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: Math.max(0, defaultScrollLeft), behavior: 'smooth' });
  }, [defaultScrollLeft]);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setIsAtDefault(Math.abs(el.scrollLeft - defaultScrollLeft) < COL_WIDTH * 2);
  }, [defaultScrollLeft]);

  const weekTicks: { date: Date; col: number }[] = [];
  for (let i = 0; i < TOTAL_RENDER_DAYS; i += 7) {
    weekTicks.push({ date: addDays(canvasStart, i), col: i });
  }

  const monthMarkers: { date: Date; col: number }[] = [];
  for (let m = -7; m <= 7; m++) {
    const d = new Date(today.getFullYear(), today.getMonth() + m, 1);
    const col = differenceInDays(startOfDay(d), canvasStart);
    if (col >= 0 && col < TOTAL_RENDER_DAYS) {
      monthMarkers.push({ date: d, col });
    }
  }

  // Split tasks: with dates vs without dates
  const tasksWithDates = [...allTasks]
    .filter(t => t.start_date || t.due_date)
    .sort((a, b) => {
      const aDate = a.start_date || a.due_date || '';
      const bDate = b.start_date || b.due_date || '';
      return aDate.localeCompare(bDate);
    });
  const tasksWithoutDates = [...allTasks].filter(t => !t.start_date && !t.due_date);

  // Tasks to render: always show dated tasks, optionally append undated ones
  const tasks = showNoDates ? [...tasksWithDates, ...tasksWithoutDates] : tasksWithDates;

  function getBarStyle(task: Task) {
    const start = task.start_date ? startOfDay(new Date(task.start_date)) : null;
    const end = task.due_date ? startOfDay(new Date(task.due_date)) : null;
    if (!end) return null;
    const startCol = start ? differenceInDays(start, canvasStart) : differenceInDays(end, canvasStart);
    const endCol = differenceInDays(end, canvasStart);
    if (endCol < 0 || startCol > TOTAL_RENDER_DAYS) return null;
    const clampedStart = Math.max(0, startCol);
    const clampedEnd = Math.min(TOTAL_RENDER_DAYS, endCol);
    const widthPx = Math.max(COL_WIDTH * 0.6, (clampedEnd - clampedStart) * COL_WIDTH);
    return {
      left: `${clampedStart * COL_WIDTH}px`,
      width: `${widthPx}px`,
    };
  }

  if (allTasks.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-4 flex items-center justify-center min-h-[120px]">
        <p className="text-sm text-muted-foreground">일정이 등록된 과제가 없습니다</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="rounded-lg border bg-card p-4 space-y-2 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between gap-2 shrink-0">
          <h3 className="text-sm font-semibold">
            일정 타임라인 ({tasksWithDates.length}건
            {tasksWithoutDates.length > 0 && <span className="text-muted-foreground"> / 전체 {allTasks.length}건</span>})
          </h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scrollByDays(-STEP_DAYS)} title="이전">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => scrollByDays(STEP_DAYS)} title="다음">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            {!isAtDefault && (
              <Button variant="outline" size="sm" className="h-6 text-xs px-2" onClick={scrollToToday}>
                <RotateCcw className="h-3 w-3 mr-1" />오늘
              </Button>
            )}
          </div>
        </div>

        {/* Body: frozen name col + scrollable chart */}
        <div className="flex min-h-0 overflow-hidden rounded border border-border">

          {/* Frozen task names */}
          <div className="shrink-0 bg-card border-r border-border z-10" style={{ width: `${NAME_COL}px` }}>
            <div className="h-8 border-b border-border bg-muted/40 flex items-end pb-1 px-2">
              <span className="text-[10px] text-muted-foreground">과제명</span>
            </div>
            {tasks.map(task => (
              <div
                key={task.id}
                className="h-7 flex items-center px-2 border-b border-border/40 last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors"
                onClick={() => navigate(`/tasks/${task.id}`)}
                title={task.title}
              >
                <span className="text-xs text-foreground truncate w-full">{task.title}</span>
              </div>
            ))}
          </div>

          {/* Scrollable chart */}
          <div
            ref={scrollRef}
            onScroll={handleScroll}
            className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing"
            style={{ scrollbarWidth: 'thin' }}
          >
            <div style={{ width: `${totalCanvasWidth}px`, position: 'relative' }}>

              {/* Date header */}
              <div className="relative h-8 border-b border-border bg-muted/40" style={{ width: `${totalCanvasWidth}px` }}>
                {monthMarkers.map((m, i) => (
                  <span
                    key={`m-${i}`}
                    className="absolute bottom-0.5 text-[9px] text-muted-foreground/70 font-medium pl-1"
                    style={{ left: `${m.col * COL_WIDTH}px` }}
                  >
                    {format(m.date, 'M월', { locale: ko })}
                  </span>
                ))}
                {weekTicks.map((w, i) => (
                  <span
                    key={`w-${i}`}
                    className={cn(
                      'absolute top-0.5 text-[10px]',
                      isSameDay(w.date, today) ? 'text-destructive font-bold' : 'text-muted-foreground'
                    )}
                    style={{ left: `${w.col * COL_WIDTH}px` }}
                  >
                    {format(w.date, 'M/d')}
                  </span>
                ))}
              </div>

              {/* Rows */}
              <div className="relative" style={{ width: `${totalCanvasWidth}px` }}>
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-destructive/70 z-10 pointer-events-none"
                  style={{ left: `${todayColIndex * COL_WIDTH}px` }}
                />

                {tasks.map(task => {
                  const signal = getTaskSignal(task);
                  const barStyle = getBarStyle(task);
                  return (
                    <div
                      key={task.id}
                      className="relative h-7 border-b border-border/30 last:border-b-0 flex items-center"
                    >
                      {barStyle ? (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={cn(
                                'absolute top-1 bottom-1 rounded cursor-pointer opacity-80 hover:opacity-100 flex items-center px-1 overflow-hidden',
                                signalBarClass(signal)
                              )}
                              style={barStyle}
                              onClick={() => navigate(`/tasks/${task.id}`)}
                            >
                              <span className="text-[10px] text-white truncate leading-none select-none">
                                {task.title}
                              </span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs max-w-[220px]">
                            <p className="font-semibold">{task.title}</p>
                            <p>담당: {task.owner_name || '미지정'}</p>
                            <p>진행률: {task.progress_percent ?? 0}%</p>
                            {task.start_date && <p>시작: {format(new Date(task.start_date), 'yy.M.d')}</p>}
                            {task.due_date && <p>마감: {format(new Date(task.due_date), 'yy.M.d')}</p>}
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        /* No-date tasks: show faint placeholder */
                        <span className="absolute left-2 text-[10px] text-muted-foreground/50 italic select-none truncate max-w-[200px]">
                          일정 미등록
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-between gap-2 shrink-0 flex-wrap">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-destructive inline-block" />위험</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[hsl(var(--chart-4))] inline-block" />주의</span>
            <span className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-primary inline-block" />정상</span>
            <span className="flex items-center gap-1"><span className="w-px h-3 bg-destructive inline-block" />오늘</span>
          </div>
          {tasksWithoutDates.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs px-2 text-muted-foreground"
              onClick={() => setShowNoDates(v => !v)}
            >
              {showNoDates ? (
                <><ChevronUp className="h-3 w-3 mr-1" />일정 없는 과제 숨기기 ({tasksWithoutDates.length}건)</>
              ) : (
                <><ChevronDown className="h-3 w-3 mr-1" />일정 없는 과제 보기 ({tasksWithoutDates.length}건)</>
              )}
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
