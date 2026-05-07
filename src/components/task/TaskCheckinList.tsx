import { useTaskCheckins } from '@/hooks/useTaskCheckins';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { History, AlertTriangle } from 'lucide-react';

interface TaskCheckinListProps {
  taskId: string;
}

export function TaskCheckinList({ taskId }: TaskCheckinListProps) {
  const { checkins, isLoading } = useTaskCheckins(taskId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            체크인 이력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" />
            체크인 이력
          </CardTitle>
          <Badge variant="secondary">{checkins.length}</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {checkins.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            아직 체크인 이력이 없습니다.
          </p>
        ) : (
          <div className="space-y-4">
            {checkins.map((checkin) => (
              <div
                key={checkin.id}
                className="border rounded-lg p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {format(new Date(checkin.week_start_date), 'M월 d일', { locale: ko })} 주차
                  </span>
                  <div className="flex items-center gap-2">
                    {checkin.progress_percent !== null && (
                      <div className="flex items-center gap-1">
                        <Progress value={checkin.progress_percent} className="w-12 h-2" />
                        <span className="text-xs text-muted-foreground">{checkin.progress_percent}%</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(checkin.created_at), 'M/d HH:mm', { locale: ko })}
                    </span>
                  </div>
                </div>

                {checkin.summary_this_week && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">이번 주 요약</p>
                    <p className="text-sm whitespace-pre-wrap">{checkin.summary_this_week}</p>
                  </div>
                )}

                {checkin.plan_next_week && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">다음 주 계획</p>
                    <p className="text-sm whitespace-pre-wrap">{checkin.plan_next_week}</p>
                  </div>
                )}

                {checkin.blockers && (
                  <div className="flex items-start gap-1">
                    <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">블로커</p>
                      <p className="text-sm whitespace-pre-wrap">{checkin.blockers}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
