import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Kpi, KPI_STATUS_CONFIG } from '@/types/database';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronRight, ChevronDown, TrendingUp, ExternalLink } from 'lucide-react';

interface KpiTreeNodeProps {
  kpi: Kpi;
  depth?: number;
  defaultOpen?: boolean;
  isLast?: boolean;
}

export function KpiTreeNode({ kpi, depth = 0, defaultOpen = false, isLast = false }: KpiTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const navigate = useNavigate();
  const hasChildren = kpi.children && kpi.children.length > 0;
  const statusConfig = KPI_STATUS_CONFIG[kpi.status] ?? KPI_STATUS_CONFIG['na'];
  const progress = kpi.computed_progress ?? 0;

  return (
    <div className={`relative ${depth === 0 ? 'border rounded-lg' : ''}`}>
      {/* Connecting lines for child nodes */}
      {depth > 0 && (
        <>
          {/* Horizontal connector */}
          <div
            className="absolute border-t border-border"
            style={{ left: '-1rem', top: '1.25rem', width: '1rem' }}
          />
          {/* Vertical connector (extends down unless last) */}
          {!isLast && (
            <div
              className="absolute border-l border-border"
              style={{ left: '-1rem', top: '1.25rem', bottom: 0 }}
            />
          )}
        </>
      )}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors rounded-lg">
          {hasChildren ? (
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          ) : (
            <div className="w-6 shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm truncate">{kpi.name}</span>
              <Badge variant="outline" className={`${statusConfig.color} shrink-0 text-xs`}>
                {statusConfig.emoji} {statusConfig.label}
              </Badge>
              {hasChildren && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  하위 {kpi.children!.length}개
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Progress value={progress} className="h-1.5 flex-1 max-w-[200px]" />
              <span className="text-xs text-muted-foreground">{progress.toFixed(0)}%</span>
              {kpi.owner && (
                <div className="flex items-center gap-1">
                  <Avatar className="h-4 w-4">
                    <AvatarImage src={kpi.owner.avatar_url || ''} />
                    <AvatarFallback className="text-[8px]">
                      {kpi.owner.full_name?.slice(0, 1) || kpi.owner.email.slice(0, 1)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                    {kpi.owner.full_name || kpi.owner.email}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/kpi/${kpi.id}`);
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>

        {hasChildren && (
          <CollapsibleContent>
            <div className="relative pl-4 pr-3 pb-3 ml-3">
              {/* Vertical line connecting children */}
              <div
                className="absolute border-l border-border"
                style={{ left: '0rem', top: 0, bottom: '1.25rem' }}
              />
              <div className="space-y-1">
                {kpi.children!.map((child, idx) => (
                  <KpiTreeNode
                    key={child.id}
                    kpi={child}
                    depth={depth + 1}
                    defaultOpen={depth === 0}
                    isLast={idx === kpi.children!.length - 1}
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
