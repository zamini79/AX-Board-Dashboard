import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { PerformanceGoal, GOAL_STATUS_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitBranch, Target, Building2 } from 'lucide-react';

type GoalNodeData = {
  goal: PerformanceGoal;
  hasParent: boolean;
  hasChildren: boolean;
  departmentName?: string;
};

function GoalFlowNodeComponent({ data }: NodeProps) {
  const navigate = useNavigate();
  const { goal, hasParent, hasChildren, departmentName } = data as unknown as GoalNodeData;
  const statusConfig = GOAL_STATUS_CONFIG[goal.status];
  const score = goal.computed_score ?? goal.overall_score ?? 0;

  const borderColor =
    goal.status === 'active' ? 'hsl(221 83% 53%)' :
    goal.status === 'completed' ? 'hsl(142 71% 45%)' :
    goal.status === 'on_hold' ? 'hsl(38 92% 50%)' :
    'hsl(var(--muted))';

  return (
    <div
      className="bg-card border border-border rounded-lg shadow-md w-[260px] cursor-pointer hover:shadow-lg transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      onClick={() => navigate(`/performance/${goal.id}`)}
    >
      {hasParent && (
        <Handle type="target" position={Position.Top} className="!bg-primary !w-2 !h-2 !border-none" />
      )}
      {hasChildren && (
        <Handle type="source" position={Position.Bottom} className="!bg-primary !w-2 !h-2 !border-none" />
      )}

      <div className="p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground truncate block">{goal.title}</span>
            {departmentName && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <Building2 className="h-2.5 w-2.5" />
                {departmentName}
              </span>
            )}
          </div>
          <Badge variant="outline" className={`${statusConfig.color} shrink-0 text-[10px] px-1.5 py-0`}>
            {statusConfig.emoji} {statusConfig.label}
          </Badge>
        </div>

        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>달성률</span>
            <span>{score.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={`h-full ${statusConfig.bgColor} transition-all`} style={{ width: `${score}%` }} />
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {goal.owner ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={goal.owner.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">
                  {goal.owner.full_name?.slice(0, 2) || '?'}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">{goal.owner.full_name || goal.owner_name}</span>
            </div>
          ) : (
            <span>{goal.owner_name || '담당자 미지정'}</span>
          )}
          <div className="flex items-center gap-2">
            {hasChildren && (
              <div className="flex items-center gap-0.5">
                <GitBranch className="h-3 w-3" />
                <span>{goal.children!.length}</span>
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
      </div>
    </div>
  );
}

export const GoalFlowNode = memo(GoalFlowNodeComponent);
