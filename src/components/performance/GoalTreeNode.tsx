import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PerformanceGoal, GOAL_STATUS_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, ExternalLink } from 'lucide-react';

interface GoalTreeNodeProps {
  goal: PerformanceGoal;
  depth?: number;
  defaultOpen?: boolean;
  isLast?: boolean;
}

export function GoalTreeNode({ goal, depth = 0, defaultOpen = false, isLast = false }: GoalTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const hasChildren = goal.children && goal.children.length > 0;
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const score = goal.computed_score ?? goal.overall_score ?? 0;

  return (
    <div className={`relative ${depth === 0 ? 'border rounded-lg' : ''}`}>
      {depth > 0 && (
        <>
          <div className="absolute border-t border-border" style={{ left: '-1rem', top: '1.25rem', width: '1rem' }} />
          {!isLast && (
            <div className="absolute border-l border-border" style={{ left: '-1rem', top: '1.25rem', bottom: 0 }} />
          )}
        </>
      )}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{goal.title}</span>
              <Badge variant="outline" className={`${statusConfig.color} shrink-0 text-xs`}>
                {statusConfig.emoji} {statusConfig.label}
              </Badge>
              {hasChildren && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  하위 {goal.children!.length}개
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Progress value={score} className="h-1.5 flex-1 max-w-[200px]" />
              <span className="text-xs text-muted-foreground">{score.toFixed(0)}%</span>
              {goal.owner && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={goal.owner.avatar_url || ''} />
                    <AvatarFallback className="text-[8px]">
                      {goal.owner.full_name?.slice(0, 1) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {goal.owner.full_name || goal.owner_name}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => navigate(`/performance/${goal.id}`)}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="relative pl-4 pr-3 pb-3 ml-3">
              <div className="absolute border-l border-border" style={{ left: '0rem', top: 0, bottom: '1.25rem' }} />
              <div className="space-y-1">
                {goal.children!.map((child, idx) => (
                  <GoalTreeNode
                    key={child.id}
                    goal={child}
                    depth={depth + 1}
                    defaultOpen={depth === 0}
                    isLast={idx === goal.children!.length - 1}
                  />
                ))}
              </div>
            </div>
          </CollapsibleContent>
        )}
      </Collapsible>
    </div>
  );
}
