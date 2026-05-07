import { PerformanceGoal, GOAL_STATUS_CONFIG } from '@/types/database';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { GitBranch, Target, Calendar } from 'lucide-react';

interface GoalCardProps {
  goal: PerformanceGoal;
  onClick?: () => void;
  showChildren?: boolean;
}

export function GoalCard({ goal, onClick, showChildren = false }: GoalCardProps) {
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const hasChildren = goal.children && goal.children.length > 0;
  const score = goal.computed_score ?? goal.overall_score ?? 0;

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-l-4"
      style={{
        borderLeftColor: `hsl(var(--${
          goal.status === 'active' ? 'chart-1' :
          goal.status === 'completed' ? 'chart-2' :
          goal.status === 'on_hold' ? 'chart-4' : 'muted'
        }))`,
      }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <span className="text-sm font-medium truncate flex-1">{goal.title}</span>
          <Badge variant="outline" className={`${statusConfig.color} shrink-0 ml-2`}>
            {statusConfig.emoji} {statusConfig.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>달성률</span>
            <span>{score.toFixed(0)}%</span>
          </div>
          <Progress value={score} className="h-2" />
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          {goal.owner ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={goal.owner.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">
                  {goal.owner.full_name?.slice(0, 2) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[100px]">{goal.owner.full_name || goal.owner_name || '미지정'}</span>
            </div>
          ) : (
            <span>{goal.owner_name || '담당자 미지정'}</span>
          )}
          <div className="flex items-center gap-2">
            {hasChildren && (
              <div className="flex items-center gap-0.5">
                <GitBranch className="h-3 w-3" />
                <span>하위 {goal.children!.length}</span>
              </div>
            )}
            {goal.initiatives_count !== undefined && goal.initiatives_count > 0 && (
              <div className="flex items-center gap-0.5">
                <Target className="h-3 w-3" />
                <span>{goal.initiatives_count}</span>
              </div>
            )}
          </div>
        </div>

        {goal.target_date && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground pt-1 border-t">
            <Calendar className="h-3 w-3" />
            <span>목표: {goal.target_date}</span>
          </div>
        )}
      </CardContent>

      {showChildren && hasChildren && (
        <div className="border-t px-6 py-3 space-y-2">
          {goal.children!.map((child, idx) => {
            const childStatus = GOAL_STATUS_CONFIG[child.status];
            const childScore = child.computed_score ?? child.overall_score ?? 0;
            const isLast = idx === goal.children!.length - 1;
            return (
              <div key={child.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs w-4 text-center shrink-0">
                  {isLast ? '└' : '├'}
                </span>
                <span className="truncate flex-1 min-w-0">{child.title}</span>
                <Badge variant="outline" className={`${childStatus.color} shrink-0 text-xs px-1.5 py-0`}>
                  {childStatus.emoji}
                </Badge>
                <div className="w-16 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full ${childStatus.bgColor} transition-all`} style={{ width: `${childScore}%` }} />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{childScore.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
