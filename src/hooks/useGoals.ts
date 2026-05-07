import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PerformanceGoal, GoalStatus, Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateGoalInput {
  title: string;
  description?: string;
  department_id?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  parent_id?: string | null;
  perspective?: string | null;
  status?: GoalStatus;
  start_date?: string | null;
  target_date?: string | null;
}

interface UpdateGoalInput extends Partial<CreateGoalInput> {
  id: string;
  overall_score?: number;
  actual_end_date?: string | null;
}

function computeGoalScore(goal: PerformanceGoal): number {
  if (goal.children && goal.children.length > 0) {
    const childScores = goal.children.map(c => computeGoalScore(c));
    return childScores.reduce((a, b) => a + b, 0) / childScores.length;
  }
  return goal.overall_score ?? 0;
}

function buildGoalTree(flatGoals: PerformanceGoal[]): PerformanceGoal[] {
  const map = new Map<string, PerformanceGoal>();
  flatGoals.forEach(g => map.set(g.id, { ...g, children: [] }));

  const roots: PerformanceGoal[] = [];
  map.forEach(goal => {
    if (goal.parent_id && map.has(goal.parent_id)) {
      map.get(goal.parent_id)!.children!.push(goal);
    } else {
      roots.push(goal);
    }
  });

  function setDepthAndScore(goal: PerformanceGoal, depth: number) {
    goal.depth = depth;
    goal.children?.forEach(c => setDepthAndScore(c, depth + 1));
    goal.computed_score = computeGoalScore(goal);
  }
  roots.forEach(r => setDepthAndScore(r, 0));

  return roots;
}

function getDescendantIds(goal: PerformanceGoal): string[] {
  const ids: string[] = [];
  goal.children?.forEach(child => {
    ids.push(child.id);
    ids.push(...getDescendantIds(child));
  });
  return ids;
}

function getAncestors(flatGoals: PerformanceGoal[], goalId: string): PerformanceGoal[] {
  const map = new Map<string, PerformanceGoal>();
  flatGoals.forEach(g => map.set(g.id, g));

  const ancestors: PerformanceGoal[] = [];
  let current = map.get(goalId);
  while (current?.parent_id) {
    const parent = map.get(current.parent_id);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else break;
  }
  return ancestors;
}

export function useGoals() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const goalsQuery = useQuery({
    queryKey: ['goals', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      const { data, error } = await supabase
        .from('performance_goals')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Fetch owners
      const ownerIds = [...new Set(data.map(g => g.owner_id).filter(Boolean))];
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

      // Get initiative counts
      const goalIds = data.map(g => g.id);
      const { data: initiatives } = await supabase
        .from('initiatives')
        .select('goal_id')
        .in('goal_id', goalIds);

      const countMap: Record<string, number> = {};
      initiatives?.forEach(i => {
        countMap[i.goal_id] = (countMap[i.goal_id] || 0) + 1;
      });

      return data.map(goal => ({
        ...goal,
        status: goal.status as GoalStatus,
        owner: goal.owner_id ? ownersMap[goal.owner_id] : undefined,
        initiatives_count: countMap[goal.id] || 0,
      })) as PerformanceGoal[];
    },
    enabled: !!profile?.org_id,
    staleTime: Infinity,
  });

  const flatGoals = goalsQuery.data || [];
  const goalTree = flatGoals.length > 0 ? buildGoalTree(flatGoals) : [];

  const createGoalMutation = useMutation({
    mutationFn: async (input: CreateGoalInput) => {
      if (!profile?.org_id || !user?.id) {
        throw new Error('조직에 소속되어야 성과 목표를 생성할 수 있습니다.');
      }
      const { data, error } = await supabase
        .from('performance_goals')
        .insert({
          title: input.title,
          description: input.description,
          department_id: input.department_id,
          owner_id: input.owner_id,
          owner_name: input.owner_name,
          parent_id: input.parent_id,
          perspective: input.perspective as any,
          status: input.status as any,
          start_date: input.start_date,
          target_date: input.target_date,
          org_id: profile.org_id,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '성과 목표 생성 완료', description: '새 성과 목표가 추가되었습니다.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '성과 목표 생성 실패', description: error.message });
    },
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateGoalInput) => {
      const updateData: Record<string, any> = {};
      if (input.title !== undefined) updateData.title = input.title;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.department_id !== undefined) updateData.department_id = input.department_id;
      if (input.owner_id !== undefined) updateData.owner_id = input.owner_id;
      if (input.owner_name !== undefined) updateData.owner_name = input.owner_name;
      if (input.parent_id !== undefined) updateData.parent_id = input.parent_id;
      if (input.perspective !== undefined) updateData.perspective = input.perspective;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.start_date !== undefined) updateData.start_date = input.start_date;
      if (input.target_date !== undefined) updateData.target_date = input.target_date;
      if (input.overall_score !== undefined) updateData.overall_score = input.overall_score;
      if (input.actual_end_date !== undefined) updateData.actual_end_date = input.actual_end_date;

      const { data, error } = await supabase
        .from('performance_goals')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '성과 목표 수정 완료', description: '성과 목표가 업데이트되었습니다.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '성과 목표 수정 실패', description: error.message });
    },
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('performance_goals')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      toast({ title: '성과 목표 삭제 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
    },
  });

  return {
    goals: flatGoals,
    goalTree,
    flatGoals,
    isLoading: goalsQuery.isLoading,
    error: goalsQuery.error,
    createGoal: createGoalMutation.mutateAsync,
    updateGoal: updateGoalMutation.mutateAsync,
    deleteGoal: deleteGoalMutation.mutateAsync,
    isCreating: createGoalMutation.isPending,
    isUpdating: updateGoalMutation.isPending,
    getDescendantIds: (goalId: string) => {
      const tree = flatGoals.length > 0 ? buildGoalTree(flatGoals) : [];
      function findGoal(nodes: PerformanceGoal[]): PerformanceGoal | undefined {
        for (const n of nodes) {
          if (n.id === goalId) return n;
          const found = findGoal(n.children || []);
          if (found) return found;
        }
      }
      const goal = findGoal(tree);
      return goal ? getDescendantIds(goal) : [];
    },
    getAncestors: (goalId: string) => getAncestors(flatGoals, goalId),
  };
}

export function useGoal(goalId: string | undefined) {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['goal', goalId],
    queryFn: async () => {
      if (!goalId) return null;

      const { data: allGoals, error } = await supabase
        .from('performance_goals')
        .select('*')
        .eq('org_id', profile!.org_id!);

      if (error) throw error;
      if (!allGoals) return null;

      const target = allGoals.find(g => g.id === goalId);
      if (!target) return null;

      const ownerIds = [...new Set(allGoals.map(g => g.owner_id).filter(Boolean))];
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

      const enriched = allGoals.map(g => ({
        ...g,
        status: g.status as GoalStatus,
        owner: g.owner_id ? ownersMap[g.owner_id] : undefined,
      })) as PerformanceGoal[];

      const tree = buildGoalTree(enriched);
      function findGoal(nodes: PerformanceGoal[]): PerformanceGoal | undefined {
        for (const n of nodes) {
          if (n.id === goalId) return n;
          const found = findGoal(n.children || []);
          if (found) return found;
        }
      }

      const goalNode = findGoal(tree);
      if (!goalNode) return null;

      const ancestors = getAncestors(enriched, goalId);
      return { ...goalNode, ancestors } as PerformanceGoal & { ancestors: PerformanceGoal[] };
    },
    enabled: !!goalId && !!profile?.org_id,
  });
}
