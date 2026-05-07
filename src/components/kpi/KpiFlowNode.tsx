import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useNavigate } from 'react-router-dom';
import { Kpi, KPI_STATUS_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { GitBranch, ListTodo, Building2, Weight, ChevronDown, ChevronUp } from 'lucide-react';

type KpiNodeData = {
  kpi: Kpi;
  hasParent: boolean;
  hasChildren: boolean;
  departmentName?: string;
  isExpanded: boolean;
  childCount: number;
  onToggle: () => void;
};

function KpiFlowNodeComponent({ data }: NodeProps) {
  const navigate = useNavigate();
  const { kpi, hasParent, hasChildren, departmentName, isExpanded, childCount, onToggle } = data as unknown as KpiNodeData;
  const statusConfig = KPI_STATUS_CONFIG[kpi.status] ?? KPI_STATUS_CONFIG['na'];

  const progressPercent = kpi.computed_progress ?? (
    kpi.target_value && kpi.current_value
      ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
      : 0
  );

  const borderColor =
    kpi.status === 'on_track' ? 'hsl(142 71% 45%)' :
    kpi.status === 'at_risk' ? 'hsl(38 92% 50%)' :
    kpi.status === 'off_track' ? 'hsl(0 72% 51%)' :
    'hsl(var(--muted))';

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle();
  };

  return (
    <div
      className="bg-card border border-border rounded-lg shadow-md w-[260px] cursor-pointer hover:shadow-lg transition-shadow"
      style={{ borderLeftWidth: 4, borderLeftColor: borderColor }}
      onClick={() => navigate(`/kpi/${kpi.id}`)}
    >
      {hasParent && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-primary !w-2 !h-2 !border-none"
        />
      )}
      {(hasChildren && isExpanded) && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!bg-primary !w-2 !h-2 !border-none"
        />
      )}

      <div className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-foreground truncate block">
              {kpi.name}
            </span>
          {departmentName && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <Building2 className="h-2.5 w-2.5" />
                {departmentName}
              </span>
            )}
            {kpi.parent_id && kpi.weight !== undefined && kpi.weight !== 100 && (
              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                <Weight className="h-2.5 w-2.5" />
                비중 {kpi.weight}%
              </span>
            )}
          </div>
          <Badge variant="outline" className={`${statusConfig.color} shrink-0 text-[10px] px-1.5 py-0`}>
            {statusConfig.emoji} {statusConfig.label}
          </Badge>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
            <span>진행률</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full ${statusConfig.bgColor} transition-all`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
          {kpi.owner ? (
            <div className="flex items-center gap-1">
              <Avatar className="h-4 w-4">
                <AvatarImage src={kpi.owner.avatar_url || ''} />
                <AvatarFallback className="text-[8px]">
                  {kpi.owner.full_name?.slice(0, 2) || kpi.owner.email.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="truncate max-w-[80px]">
                {kpi.owner.full_name || kpi.owner.email}
              </span>
            </div>
          ) : (
            <span>담당자 미지정</span>
          )}
          <div className="flex items-center gap-2">
            {kpi.tasks_count !== undefined && kpi.tasks_count > 0 && (
              <div className="flex items-center gap-0.5">
                <ListTodo className="h-3 w-3" />
                <span>{kpi.tasks_count}</span>
              </div>
            )}
          </div>
        </div>

        {/* Expand / Collapse button */}
        {childCount > 0 && (
          <button
            onClick={handleToggle}
            className="w-full mt-1 flex items-center justify-center gap-1 rounded-md border border-border bg-muted/50 hover:bg-muted text-[10px] text-muted-foreground hover:text-foreground transition-colors py-1 px-2"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="h-3 w-3" />
                <span>접기</span>
              </>
            ) : (
              <>
                <ChevronDown className="h-3 w-3" />
                <span>하위 {childCount}개 펼치기</span>
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export const KpiFlowNode = memo(KpiFlowNodeComponent);
