import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { subDays } from 'date-fns';

export type ActivityType = 'checkin' | 'comment';

export interface ActivityItem {
  id: string;
  type: ActivityType;
  taskId: string;
  taskTitle: string;
  authorName: string;
  authorAvatar: string | null;
  content: string;
  createdAt: string;
}

export function useRecentActivity() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user) return [];

      const since = subDays(new Date(), 7).toISOString();

      // Fetch org_id first
      const { data: profile } = await supabase
        .from('profiles')
        .select('org_id')
        .eq('id', user.id)
        .single();

      if (!profile?.org_id) return [];

      // Parallel fetch checkins + comments
      const [checkinsRes, commentsRes] = await Promise.all([
        supabase
          .from('task_checkins')
          .select(`
            id,
            created_at,
            summary_this_week,
            progress_percent,
            task_id,
            user_id,
            tasks!inner(id, title, org_id),
            profiles:user_id(full_name, avatar_url)
          `)
          .gte('created_at', since)
          .eq('tasks.org_id', profile.org_id)
          .order('created_at', { ascending: false })
          .limit(30),

        supabase
          .from('task_comments')
          .select(`
            id,
            created_at,
            content,
            task_id,
            user_id,
            tasks!inner(id, title, org_id),
            profiles:user_id(full_name, avatar_url)
          `)
          .gte('created_at', since)
          .eq('tasks.org_id', profile.org_id)
          .order('created_at', { ascending: false })
          .limit(30),
      ]);

      const items: ActivityItem[] = [];

      for (const c of checkinsRes.data ?? []) {
        const task = c.tasks as any;
        const author = c.profiles as any;
        items.push({
          id: `checkin-${c.id}`,
          type: 'checkin',
          taskId: c.task_id,
          taskTitle: task?.title ?? '(삭제된 과제)',
          authorName: author?.full_name ?? '알 수 없음',
          authorAvatar: author?.avatar_url ?? null,
          content: c.summary_this_week
            ? c.summary_this_week
            : `진척도 ${c.progress_percent ?? 0}% 체크인`,
          createdAt: c.created_at,
        });
      }

      for (const c of commentsRes.data ?? []) {
        const task = c.tasks as any;
        const author = c.profiles as any;
        items.push({
          id: `comment-${c.id}`,
          type: 'comment',
          taskId: c.task_id,
          taskTitle: task?.title ?? '(삭제된 과제)',
          authorName: author?.full_name ?? '알 수 없음',
          authorAvatar: author?.avatar_url ?? null,
          content: c.content,
          createdAt: c.created_at,
        });
      }

      // Sort by newest first
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      return items.slice(0, 30);
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
}
