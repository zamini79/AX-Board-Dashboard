import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { MetricSnapshot } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateSnapshotInput {
  initiative_id: string;
  recorded_at: string;
  value?: number | null;
  score?: number | null;
  source?: string;
  notes?: string;
}

interface UpdateSnapshotInput {
  id: string;
  value?: number | null;
  score?: number | null;
  notes?: string;
  recorded_at?: string;
}

export function useMetricSnapshots(initiativeId?: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['metric_snapshots', initiativeId],
    queryFn: async () => {
      if (!initiativeId) return [];
      const { data, error } = await supabase
        .from('metric_snapshots')
        .select('*')
        .eq('initiative_id', initiativeId)
        .order('recorded_at', { ascending: true });
      if (error) throw error;
      return (data || []) as MetricSnapshot[];
    },
    enabled: !!initiativeId,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateSnapshotInput) => {
      if (!user?.id) throw new Error('로그인이 필요합니다.');
      const { data, error } = await supabase
        .from('metric_snapshots')
        .insert({ ...input, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      toast({ title: '측정값 기록 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '기록 실패', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateSnapshotInput) => {
      const { data, error } = await supabase
        .from('metric_snapshots')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      toast({ title: '측정값 수정 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '수정 실패', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('metric_snapshots').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['metric_snapshots'] });
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      toast({ title: '측정값 삭제 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
    },
  });

  return {
    snapshots: query.data || [],
    isLoading: query.isLoading,
    createSnapshot: createMutation.mutateAsync,
    updateSnapshot: updateMutation.mutateAsync,
    deleteSnapshot: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
