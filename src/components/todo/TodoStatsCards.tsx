import { Task } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { ListTodo, CircleDot, Play, CheckCircle, AlertTriangle } from 'lucide-react';

interface TodoStatsCardsProps {
  tasks: Task[];
}

export function TodoStatsCards({ tasks }: TodoStatsCardsProps) {
  const activeTasks = tasks.filter(t => t.status !== 'cancelled');
  const notStarted = activeTasks.filter(t => t.status === 'not_started').length;
  const inProgress = activeTasks.filter(t => t.status === 'in_progress').length;
  const doneOrReview = activeTasks.filter(t => t.status === 'done' || t.status === 'executive_review').length;
  const overdue = activeTasks.filter(t => 
    t.due_date && new Date(t.due_date) < new Date() && 
    !['done', 'closed', 'cancelled'].includes(t.status)
  ).length;

  const stats = [
    { label: '전체', value: activeTasks.length, icon: ListTodo, color: 'text-foreground' },
    { label: '미시작', value: notStarted, icon: CircleDot, color: 'text-muted-foreground' },
    { label: '진행중', value: inProgress, icon: Play, color: 'text-blue-600' },
    { label: '완료/승인대기', value: doneOrReview, icon: CheckCircle, color: 'text-green-600' },
    { label: '지연', value: overdue, icon: AlertTriangle, color: 'text-destructive' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <stat.icon className={`h-5 w-5 shrink-0 ${stat.color}`} />
            <div className="min-w-0">
              <p className="text-2xl font-bold tabular-nums">{stat.value}</p>
              <p className="text-xs text-muted-foreground truncate">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
