import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTasks } from '@/hooks/useTasks';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CalendarClock, Clock, Ban, Hourglass } from 'lucide-react';

interface CategoryConfig {
  key: string;
  label: string;
  icon: typeof AlertTriangle;
  badgeClass: string;
  iconClass: string;
}

const CATEGORIES: CategoryConfig[] = [
  { key: 'blocked', label: 'Blocked', icon: Ban, badgeClass: 'bg-destructive text-destructive-foreground', iconClass: 'text-destructive' },
  { key: 'deadline', label: '마감 임박', icon: CalendarClock, badgeClass: 'bg-orange-500 text-white', iconClass: 'text-orange-500' },
  { key: 'checkin', label: '체크인 누락', icon: Clock, badgeClass: 'bg-yellow-500 text-white', iconClass: 'text-yellow-500' },
  { key: 'approval', label: '승인 대기', icon: Hourglass, badgeClass: 'bg-violet-500 text-white', iconClass: 'text-violet-500' },
];

export function AttentionWidget() {
  const navigate = useNavigate();
  const { tasks } = useTasks({
    status: ['not_started', 'in_progress', 'blocked', 'executive_review'],
  });

  const now = useMemo(() => new Date(), []);

  const categorized = useMemo(() => {
    const result: Record<string, typeof tasks> = {
      blocked: [],
      deadline: [],
      checkin: [],
      approval: [],
    };

    for (const task of tasks) {
      if (task.status === 'blocked') {
        result.blocked.push(task);
      }
      if (task.status === 'executive_review') {
        const hours = Math.floor((now.getTime() - new Date(task.updated_at).getTime()) / (1000 * 60 * 60));
        if (hours >= 48) result.approval.push(task);
      }
      if (task.due_date && task.status !== 'blocked' && task.status !== 'executive_review') {
        const days = Math.ceil((new Date(task.due_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (days <= 3 && days >= 0) result.deadline.push(task);
      }
      if (task.status === 'in_progress') {
        const lastCheckin = task.last_checkin_at ? new Date(task.last_checkin_at) : null;
        const daysSince = lastCheckin
          ? Math.floor((now.getTime() - lastCheckin.getTime()) / (1000 * 60 * 60 * 24))
          : 999;
        if (daysSince >= 7) result.checkin.push(task);
      }
    }
    return result;
  }, [tasks, now]);

  const totalCount = Object.values(categorized).reduce((s, arr) => s + arr.length, 0);

  if (totalCount === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            주의 필요
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center py-4 text-center">
            <span className="text-3xl mb-2">✅</span>
            <p className="text-sm text-muted-foreground">모든 과제가 정상입니다!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          주의 필요
          <Badge variant="destructive" className="text-xs">{totalCount}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {CATEGORIES.map((cat) => {
          const items = categorized[cat.key];
          if (!items || items.length === 0) return null;
          const Icon = cat.icon;
          return (
            <div key={cat.key}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${cat.iconClass}`} />
                <span className="text-sm font-medium">{cat.label}</span>
                <Badge className={`text-[10px] px-1.5 py-0 ${cat.badgeClass}`}>
                  {items.length}
                </Badge>
              </div>
              <div className="space-y-1 pl-6">
                {items.slice(0, 3).map((task) => (
                  <button
                    key={task.id}
                    className="w-full text-left text-xs text-muted-foreground hover:text-foreground truncate block transition-colors"
                    onClick={() => navigate(`/tasks/${task.id}`)}
                  >
                    • {task.title}
                  </button>
                ))}
                {items.length > 3 && (
                  <p className="text-[10px] text-muted-foreground pl-2">
                    +{items.length - 3}건 더
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
