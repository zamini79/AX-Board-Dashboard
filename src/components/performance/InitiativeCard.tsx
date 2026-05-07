import { Initiative, INITIATIVE_STATUS_CONFIG } from '@/types/database';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ExternalLink, Calendar } from 'lucide-react';

interface InitiativeCardProps {
  initiative: Initiative;
  onClick?: () => void;
}

export function InitiativeCard({ initiative, onClick }: InitiativeCardProps) {
  const statusConfig = INITIATIVE_STATUS_CONFIG[initiative.status];
  const score = initiative.score ?? 0;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium truncate block">{initiative.title}</span>
            {initiative.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{initiative.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Badge variant="outline" className={`${statusConfig.color} text-xs`}>
              {statusConfig.emoji} {statusConfig.label}
            </Badge>
            {initiative.weight !== 1 && (
              <Badge variant="secondary" className="text-xs">×{initiative.weight}</Badge>
            )}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>달성률</span>
            <span>{score.toFixed(0)}%</span>
          </div>
          <Progress value={score} className="h-1.5" />
        </div>

        {initiative.target_value != null && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>현재: {initiative.current_value ?? 0}{initiative.unit}</span>
            <span>/</span>
            <span>목표: {initiative.target_value}{initiative.unit}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {initiative.owner ? (
              <div className="flex items-center gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={initiative.owner.avatar_url || ''} />
                  <AvatarFallback className="text-[8px]">
                    {initiative.owner.full_name?.slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs text-muted-foreground">{initiative.owner.full_name || initiative.owner_name}</span>
              </div>
            ) : initiative.owner_name ? (
              <span className="text-xs text-muted-foreground">{initiative.owner_name}</span>
            ) : null}
            {initiative.target_date && (
              <div className="flex items-center gap-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{initiative.target_date}</span>
              </div>
            )}
          </div>

          {initiative.dashboard_url && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={(e) => {
                e.stopPropagation();
                window.open(initiative.dashboard_url!, '_blank', 'noopener,noreferrer');
              }}
            >
              <ExternalLink className="h-3 w-3" />
              대시보드
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
