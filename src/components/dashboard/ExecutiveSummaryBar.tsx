import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, CheckSquare, DollarSign } from 'lucide-react';
import { Kpi, Task } from '@/types/database';
import { useBudgets } from '@/hooks/useBudgets';

interface ExecutiveSummaryBarProps {
  kpis: Kpi[];
  tasks: Task[];
}

export function ExecutiveSummaryBar({ kpis, tasks }: ExecutiveSummaryBarProps) {
  const { budgets } = useBudgets();

  const onTrack = kpis.filter(k => k.status === 'on_track').length;
  const atRisk = kpis.filter(k => k.status === 'at_risk').length;
  const offTrack = kpis.filter(k => k.status === 'off_track').length;

  const inProgressTasks = tasks.filter(t => t.status === 'in_progress' || t.status === 'not_started').length;

  const totalBudget = budgets.reduce((sum, b) => sum + (Number(b.budget_amount) || 0), 0);
  const totalActual = budgets.reduce((sum, b) => sum + (Number(b.actual_amount) || 0), 0);
  const executionRate = totalBudget > 0 ? ((totalActual / totalBudget) * 100).toFixed(1) : '0.0';

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* KPI Signals */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <TrendingUp className="h-4 w-4" />
              KPI
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 font-bold text-xs px-2 py-0.5">
                🟢 {onTrack}
              </Badge>
              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400 font-bold text-xs px-2 py-0.5">
                🟡 {atRisk}
              </Badge>
              <Badge variant="outline" className="bg-red-500/10 text-red-600 border-red-500/30 dark:text-red-400 font-bold text-xs px-2 py-0.5">
                🔴 {offTrack}
              </Badge>
            </div>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Task Count */}
          <div className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium text-muted-foreground">진행 과제</span>{' '}
              <span className="font-bold text-foreground">{inProgressTasks}건</span>
            </span>
          </div>

          {/* Separator */}
          <div className="h-5 w-px bg-border hidden sm:block" />

          {/* Budget Execution Rate */}
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-medium text-muted-foreground">예산 집행률</span>{' '}
              <span className="font-bold text-foreground">{executionRate}%</span>
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
