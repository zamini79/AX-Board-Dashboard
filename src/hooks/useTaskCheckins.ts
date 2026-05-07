import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TaskCheckin, TaskStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateCheckinInput {
  task_id: string;
  week_start_date: string;
  summary_this_week?: string;
  plan_next_week?: string;
  blockers?: string;
  progress_percent?: number;
  status?: TaskStatus;
}

interface UpdateCheckinInput {
  id: string;
  summary_this_week?: string;
  plan_next_week?: string;
  blockers?: string;
  progress_percent?: number;
  status?: TaskStatus;
}

export function useTaskCheckins(taskId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const checkinsQuery = useQuery({
    queryKey: ['task-checkins', taskId],
    queryFn: async () => {
      if (!taskId) return [];

      const { data, error } = await supabase
        .from('task_checkins')
        .select('*')
        .eq('task_id', taskId)
        .order('week_start_date', { ascending: false });

      if (error) throw error;
      return data as TaskCheckin[];
    },
    enabled: !!taskId,
  });

  const createCheckinMutation = useMutation({
    mutationFn: async (input: CreateCheckinInput) => {
      if (!user?.id) throw new Error('로그인이 필요합니다.');

      const insertData = {
        task_id: input.task_id,
        week_start_date: input.week_start_date,
        summary_this_week: input.summary_this_week ?? null,
        plan_next_week: input.plan_next_week ?? null,
        blockers: input.blockers ?? null,
        progress_percent: input.progress_percent ?? null,
        status: input.status ?? null,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('task_checkins')
        .insert([insertData])
        .select()
        .single();

      if (error) throw error;

      // Update task progress if provided
      if (input.progress_percent !== undefined) {
        await supabase
          .from('tasks')
          .update({
            progress_percent: input.progress_percent,
            last_checkin_at: new Date().toISOString(),
          })
          .eq('id', input.task_id);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checkins', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast({ title: '체크인 완료', description: '주간 체크인이 등록되었습니다.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '체크인 실패', description: error.message });
    },
  });

  const updateCheckinMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateCheckinInput) => {
      const { data, error } = await supabase
        .from('task_checkins')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;

      // Update task progress if provided
      if (input.progress_percent !== undefined && taskId) {
        await supabase
          .from('tasks')
          .update({
            progress_percent: input.progress_percent,
            last_checkin_at: new Date().toISOString(),
          })
          .eq('id', taskId);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checkins', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['task', taskId] });
      toast({ title: '체크인 수정 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '체크인 수정 실패', description: error.message });
    },
  });

  const deleteCheckinMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('task_checkins').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-checkins', taskId] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: '체크인 삭제 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '체크인 삭제 실패', description: error.message });
    },
  });

  return {
    checkins: checkinsQuery.data || [],
    isLoading: checkinsQuery.isLoading,
    createCheckin: createCheckinMutation.mutateAsync,
    updateCheckin: updateCheckinMutation.mutateAsync,
    deleteCheckin: deleteCheckinMutation.mutateAsync,
    isCreating: createCheckinMutation.isPending,
    isUpdating: updateCheckinMutation.isPending,
    isDeleting: deleteCheckinMutation.isPending,
  };
}
