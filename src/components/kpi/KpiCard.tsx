import { Kpi, KPI_STATUS_CONFIG } from '@/types/database';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TrendingUp, TrendingDown, Minus, ListTodo, Clock, GitBranch } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface KpiCardProps {
  kpi: Kpi;
  onClick?: () => void;
  showChildren?: boolean;
}

export function KpiCard({ kpi, onClick, showChildren = false }: KpiCardProps) {
  const statusConfig = KPI_STATUS_CONFIG[kpi.status] ?? KPI_STATUS_CONFIG['na'];
  const hasChildren = kpi.children && kpi.children.length > 0;
  
  const progressPercent = kpi.computed_progress ?? (
    kpi.target_value && kpi.current_value 
      ? Math.min(100, (kpi.current_value / kpi.target_value) * 100)
      : 0
  );

  const getTrendIcon = () => {
    if (!kpi.target_value || !kpi.current_value) return <Minus className="h-4 w-4 text-muted-foreground" />;
    
    const ratio = kpi.current_value / kpi.target_value;
    if (ratio >= 1) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (ratio >= 0.8) return <Minus className="h-4 w-4 text-yellow-500" />;
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  };

  const formatValue = (value: number | null, unit: string | null) => {
    if (value === null) return '-';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === '원' || unit === 'KRW') return `₩${value.toLocaleString()}`;
    return `${value.toLocaleString()}${unit || ''}`;
  };

  return (
    <Card 
      className={`cursor-pointer hover:shadow-md transition-shadow border-l-4`}
      style={{ borderLeftColor: `hsl(var(--${kpi.status === 'on_track' ? 'chart-2' : kpi.status === 'at_risk' ? 'chart-4' : kpi.status === 'off_track' ? 'destructive' : 'muted'}))` }}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardDescription className="text-sm font-medium truncate flex-1">
            {kpi.name}
          </CardDescription>
          <Badge 
            variant="outline" 
            className={`${statusConfig.color} shrink-0 ml-2`}
          >
            {statusConfig.emoji} {statusConfig.label}
          </Badge>
        </div>
        <CardTitle className="text-2xl flex items-center gap-2">
          {formatValue(kpi.current_value, kpi.unit)}
          {getTrendIcon()}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>진행률</span>
            <span>{progressPercent.toFixed(0)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={`h-full ${statusConfig.bgColor} transition-all`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <span>목표: {formatValue(kpi.target_value, kpi.unit)}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasChildren && (
              <div className="flex items-center gap-1">
                <GitBranch className="h-3 w-3" />
                <span>하위 {kpi.children!.length}개</span>
              </div>
            )}
            {kpi.tasks_count !== undefined && kpi.tasks_count > 0 && (
              <div className="flex items-center gap-1">
                <ListTodo className="h-3 w-3" />
                <span>과제 {kpi.tasks_count}개</span>
              </div>
            )}
          </div>
        </div>

        {/* Owner & Update info */}
        <div className="flex items-center justify-between pt-2 border-t">
          {kpi.owner ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={kpi.owner.avatar_url || ''} />
                <AvatarFallback className="text-[10px]">
                  {kpi.owner.full_name?.slice(0, 2) || kpi.owner.email.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                {kpi.owner.full_name || kpi.owner.email}
              </span>
            </div>
          ) : (
            <span className="text-xs text-muted-foreground">담당자 미지정</span>
          )}
          
          {kpi.last_updated_at && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span>
                {formatDistanceToNow(new Date(kpi.last_updated_at), { 
                  addSuffix: true, 
                  locale: ko 
                })}
              </span>
            </div>
          )}
        </div>
      </CardContent>

      {/* Children KPI list */}
      {showChildren && hasChildren && (
        <div className="border-t px-6 py-3 space-y-2">
          {kpi.children!.map((child, idx) => {
            const childStatus = KPI_STATUS_CONFIG[child.status] ?? KPI_STATUS_CONFIG['na'];
            const childProgress = child.computed_progress ?? 0;
            const isLast = idx === kpi.children!.length - 1;
            return (
              <div key={child.id} className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground text-xs w-4 text-center shrink-0">
                  {isLast ? '└' : '├'}
                </span>
                <span className="truncate flex-1 min-w-0">{child.name}</span>
                {child.weight !== undefined && child.weight !== 100 && (
                  <span className="text-[10px] text-muted-foreground shrink-0">{child.weight}%</span>
                )}
                <Badge variant="outline" className={`${childStatus.color} shrink-0 text-xs px-1.5 py-0`}>
                  {childStatus.emoji}
                </Badge>
                <div className="w-16 shrink-0">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${childStatus.bgColor} transition-all`}
                      style={{ width: `${childProgress}%` }}
                    />
                  </div>
                </div>
                <span className="text-xs text-muted-foreground w-8 text-right shrink-0">{childProgress.toFixed(0)}%</span>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
