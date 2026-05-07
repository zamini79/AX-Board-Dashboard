import { useNavigate } from 'react-router-dom';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, MessageSquare, ClipboardCheck, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

export function ActivityTimeline() {
  const navigate = useNavigate();
  const { data: items = [], isLoading } = useRecentActivity();

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 flex-none">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            최근 활동
            <span className="text-xs text-muted-foreground font-normal">(7일)</span>
          </CardTitle>
          {items.length > 0 && (
            <Badge variant="secondary" className="text-xs tabular-nums">{items.length}</Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex-1">
        {isLoading ? (
          <div className="px-4 pb-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center px-4">
            <Activity className="h-8 w-8 text-muted-foreground mb-2 opacity-40" />
            <p className="text-sm text-muted-foreground">최근 7일간 활동이 없습니다</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="px-4 pb-4">
              <ol className="relative border-l border-border ml-3.5 space-y-0">
                {items.map((item) => {
                  const isCheckin = item.type === 'checkin';
                  const initials = item.authorName.slice(0, 2);
                  return (
                    <li key={item.id} className="ml-4 py-3 group">
                      {/* Timeline dot */}
                      <span className={`absolute -left-[9px] flex h-[18px] w-[18px] items-center justify-center rounded-full ring-2 ring-background
                        ${isCheckin ? 'bg-primary/10' : 'bg-secondary'}`}>
                        {isCheckin
                          ? <ClipboardCheck className="h-3 w-3 text-primary" />
                          : <MessageSquare className="h-3 w-3 text-muted-foreground" />}
                      </span>

                      <button
                        className="w-full text-left rounded-md p-2 -mx-2 hover:bg-muted/50 transition-colors"
                        onClick={() => navigate(`/tasks/${item.taskId}`)}
                      >
                        <div className="flex items-start gap-2.5">
                          <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                            <AvatarImage src={item.authorAvatar || ''} />
                            <AvatarFallback className="text-[9px] font-medium bg-primary/10 text-primary">
                              {initials}
                            </AvatarFallback>
                          </Avatar>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-semibold text-foreground truncate max-w-[80px]">
                                {item.authorName}
                              </span>
                              <Badge variant="outline" className={`text-[10px] py-0 px-1.5 h-4 shrink-0
                                ${isCheckin ? 'border-primary/30 text-primary' : 'border-border text-muted-foreground'}`}>
                                {isCheckin ? '체크인' : '댓글'}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                                {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true, locale: ko })}
                              </span>
                            </div>

                            <p className="text-xs font-medium text-foreground/80 truncate flex items-center gap-1">
                              <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                              {item.taskTitle}
                            </p>

                            {item.content && (
                              <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                {item.content}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
