import { useNavigate } from 'react-router-dom';
import { useNotifications } from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Bell,
  CalendarClock,
  Clock,
  AlertTriangle,
  Hourglass,
  CheckCircle2,
  RotateCcw,
  ShieldAlert,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';
import type { NotificationType } from '@/types/database';

const TYPE_CONFIG: Record<NotificationType, { icon: typeof Bell; className: string }> = {
  deadline_approaching: { icon: CalendarClock, className: 'text-orange-500' },
  checkin_reminder: { icon: Clock, className: 'text-yellow-500' },
  task_blocked: { icon: AlertTriangle, className: 'text-destructive' },
  approval_pending: { icon: Hourglass, className: 'text-violet-500' },
  task_approved: { icon: CheckCircle2, className: 'text-green-500' },
  task_reopened: { icon: RotateCcw, className: 'text-blue-500' },
  escalation: { icon: ShieldAlert, className: 'text-destructive' },
};

export function NotificationPanel() {
  const navigate = useNavigate();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();

  const handleClick = (notif: (typeof notifications)[0]) => {
    if (!notif.read_at) markAsRead.mutate(notif.id);
    const payload = notif.payload as any;
    if (payload?.task_id) {
      navigate(`/tasks/${payload.task_id}`);
    } else if (payload?.kpi_id) {
      navigate(`/kpi/${payload.kpi_id}`);
    } else if (payload?.goal_id) {
      navigate(`/performance/${payload.goal_id}`);
    }
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteNotification.mutate(id);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="text-sm font-semibold">알림</h4>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => markAllAsRead.mutate()}
            >
              모두 읽음
            </Button>
          )}
        </div>
        <ScrollArea className="h-80 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground text-sm">
              <Bell className="h-8 w-8 mb-2 opacity-40" />
              알림이 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notif) => {
                const config = TYPE_CONFIG[notif.type as NotificationType] || { icon: Bell, className: '' };
                const Icon = config.icon;
                return (
                  <div
                    key={notif.id}
                    className={`group relative flex gap-3 px-4 py-3 hover:bg-accent/50 transition-colors cursor-pointer ${
                      !notif.read_at ? 'bg-primary/5' : ''
                    }`}
                    onClick={() => handleClick(notif)}
                  >
                    <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${config.className}`} />
                    <div className="min-w-0 flex-1 pr-5">
                      <p className="text-sm font-medium truncate">{notif.title}</p>
                      {notif.message && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                      )}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(notif.created_at), { addSuffix: true, locale: ko })}
                      </p>
                    </div>
                    {!notif.read_at && (
                      <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5 group-hover:opacity-0 transition-opacity" />
                    )}
                    <button
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                      onClick={(e) => handleDelete(e, notif.id)}
                      aria-label="알림 삭제"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
