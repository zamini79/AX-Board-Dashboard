import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Initiative, InitiativeStatus, Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateInitiativeInput {
  goal_id: string;
  title: string;
  description?: string;
  owner_id?: string | null;
  owner_name?: string | null;
  status?: InitiativeStatus;
  weight?: number;
  target_value?: number | null;
  current_value?: number | null;
  unit?: string;
  score?: number | null;
  data_source?: string;
  dashboard_url?: string | null;
  start_date?: string | null;
  target_date?: string | null;
  department_id?: string | null;
}

interface UpdateInitiativeInput extends Partial<CreateInitiativeInput> {
  id: string;
}

export function useInitiatives(goalId?: string) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['initiatives', goalId, profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      let q = supabase
        .from('initiatives')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('weight', { ascending: false });

      if (goalId) {
        q = q.eq('goal_id', goalId);
      }

      const { data, error } = await q;
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const ownerIds = [...new Set(data.map(i => i.owner_id).filter(Boolean))];
      let ownersMap: Record<string, Profile> = {};
      if (ownerIds.length > 0) {
        const { data: owners } = await supabase
          .from('profiles')
          .select('*')
          .in('id', ownerIds);
        if (owners) {
          ownersMap = Object.fromEntries(owners.map(o => [o.id, o]));
        }
      }

      return data.map(i => ({
        ...i,
        status: i.status as InitiativeStatus,
        owner: i.owner_id ? ownersMap[i.owner_id] : undefined,
      })) as Initiative[];
    },
    enabled: !!profile?.org_id,
    staleTime: Infinity,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreateInitiativeInput) => {
      if (!profile?.org_id || !user?.id) throw new Error('조직에 소속되어야 합니다.');
      const { data, error } = await supabase
        .from('initiatives')
        .insert({ ...input, org_id: profile.org_id, created_by: user.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '이니셔티브 생성 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '이니셔티브 생성 실패', description: error.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateInitiativeInput) => {
      const { data, error } = await supabase
        .from('initiatives')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '이니셔티브 수정 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '이니셔티브 수정 실패', description: error.message });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('initiatives').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['initiatives'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '이니셔티브 삭제 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
    },
  });

  return {
    initiatives: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    createInitiative: createMutation.mutateAsync,
    updateInitiative: updateMutation.mutateAsync,
    deleteInitiative: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
  };
}
