import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Task, TaskType, TaskStatus, TaskPriority, Profile, Kpi, Initiative, InitiativeStatus } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateTaskInput {
  title: string;
  description?: string;
  external_url?: string;
  type?: TaskType;
  kpi_ids?: string[];
  initiative_ids?: string[];
  department_id?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  assigner_id?: string | null;
  assigner_name?: string | null;
  priority?: TaskPriority;
  start_date?: string;
  due_date?: string;
  requires_exec_approval?: boolean;
}

interface UpdateTaskInput extends Partial<CreateTaskInput> {
  id: string;
  status?: TaskStatus;
  progress_percent?: number;
  approver_id?: string;
}

async function fetchTaskKpis(taskIds: string[]): Promise<Record<string, Kpi[]>> {
  if (taskIds.length === 0) return {};

  const { data: links } = await supabase
    .from('task_kpis')
    .select('task_id, kpi_id')
    .in('task_id', taskIds);

  if (!links || links.length === 0) return {};

  const kpiIds = [...new Set(links.map(l => l.kpi_id))];
  const { data: kpis } = await supabase
    .from('kpis')
    .select('*')
    .in('id', kpiIds);

  const kpisMap: Record<string, Kpi> = {};
  if (kpis) kpis.forEach(k => { kpisMap[k.id] = k as Kpi; });

  const result: Record<string, Kpi[]> = {};
  links.forEach(l => {
    if (!result[l.task_id]) result[l.task_id] = [];
    const kpi = kpisMap[l.kpi_id];
    if (kpi) result[l.task_id].push(kpi);
  });
  return result;
}

async function fetchTaskInitiatives(taskIds: string[]): Promise<Record<string, Initiative[]>> {
  if (taskIds.length === 0) return {};

  const { data: links } = await supabase
    .from('task_initiatives')
    .select('task_id, initiative_id')
    .in('task_id', taskIds);

  if (!links || links.length === 0) return {};

  const initIds = [...new Set(links.map(l => l.initiative_id))];
  const { data: inits } = await supabase
    .from('initiatives')
    .select('*')
    .in('id', initIds);

  const initsMap: Record<string, Initiative> = {};
  if (inits) inits.forEach(i => { initsMap[i.id] = { ...i, status: i.status as InitiativeStatus } as Initiative; });

  const result: Record<string, Initiative[]> = {};
  links.forEach(l => {
    if (!result[l.task_id]) result[l.task_id] = [];
    const init = initsMap[l.initiative_id];
    if (init) result[l.task_id].push(init);
  });
  return result;
}

async function syncTaskKpis(taskId: string, kpiIds: string[]) {
  await supabase.from('task_kpis').delete().eq('task_id', taskId);
  if (kpiIds.length > 0) {
    const rows = kpiIds.map(kpi_id => ({ task_id: taskId, kpi_id }));
    const { error } = await supabase.from('task_kpis').insert(rows);
    if (error) throw error;
  }
}

async function syncTaskInitiatives(taskId: string, initiativeIds: string[]) {
  await supabase.from('task_initiatives').delete().eq('task_id', taskId);
  if (initiativeIds.length > 0) {
    const rows = initiativeIds.map(initiative_id => ({ task_id: taskId, initiative_id }));
    const { error } = await supabase.from('task_initiatives').insert(rows);
    if (error) throw error;
  }
}

export function useTasks(options?: { kpiId?: string; type?: TaskType; status?: TaskStatus[] }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const tasksQuery = useQuery({
    queryKey: ['tasks', profile?.org_id, options],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      // If filtering by kpiId, first get task_ids from junction table
      let taskIdsForKpi: string[] | null = null;
      if (options?.kpiId) {
        const { data: links } = await supabase
          .from('task_kpis')
          .select('task_id')
          .eq('kpi_id', options.kpiId);
        taskIdsForKpi = links?.map(l => l.task_id) || [];
        if (taskIdsForKpi.length === 0) return [];
      }

      let query = supabase
        .from('tasks')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });

      if (taskIdsForKpi) {
        query = query.in('id', taskIdsForKpi);
      }

      if (options?.type) {
        query = query.eq('type', options.type);
      }

      if (options?.status && options.status.length > 0) {
        query = query.in('status', options.status);
      }

      const { data: tasksData, error } = await query;

      if (error) throw error;
      if (!tasksData || tasksData.length === 0) return [];

      // Fetch owners and assigners
      const ownerIds = [...new Set(tasksData.map(t => t.owner_id).filter(Boolean))];
      const assignerIds = [...new Set(tasksData.map(t => t.assigner_id).filter(Boolean))];
      const allProfileIds = [...new Set([...ownerIds, ...assignerIds])];
      let profilesMap: Record<string, Profile> = {};
      
      if (allProfileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', allProfileIds);
        
        if (profiles) {
          profilesMap = Object.fromEntries(profiles.map(o => [o.id, o]));
        }
      }

      // Fetch KPIs and Initiatives via junction tables
      const taskIds = tasksData.map(t => t.id);
      const [kpisMap, initiativesMap] = await Promise.all([
        fetchTaskKpis(taskIds),
        fetchTaskInitiatives(taskIds),
      ]);

      return tasksData.map(task => ({
        ...task,
        owner: task.owner_id ? profilesMap[task.owner_id] : undefined,
        assigner: task.assigner_id ? profilesMap[task.assigner_id] : undefined,
        kpis: kpisMap[task.id] || [],
        kpi: kpisMap[task.id]?.[0],
        initiatives: initiativesMap[task.id] || [],
      })) as Task[];
    },
    enabled: !!profile?.org_id,
    staleTime: 30_000,
  });

  const createTaskMutation = useMutation({
    mutationFn: async (input: CreateTaskInput) => {
      if (!profile?.org_id || !user?.id) {
        throw new Error('조직에 소속되어야 과제를 생성할 수 있습니다.');
      }

      const { kpi_ids, initiative_ids, ...taskInput } = input;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...taskInput,
          org_id: profile.org_id,
          created_by: user.id,
          assigner_id: taskInput.assigner_id || user.id,
          assigner_name: taskInput.assigner_name || null,
          type: taskInput.type || 'todo',
          status: 'not_started',
          progress_percent: 0,
        })
        .select()
        .single();

      if (error) throw error;

      // Sync KPI and Initiative links
      if (kpi_ids && kpi_ids.length > 0) {
        await syncTaskKpis(data.id, kpi_ids);
      }
      if (initiative_ids && initiative_ids.length > 0) {
        await syncTaskInitiatives(data.id, initiative_ids);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['kpis'] }),
      ]);
      toast({
        title: '과제 생성 완료',
        description: '새 과제가 추가되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '과제 생성 실패',
        description: error.message,
      });
    },
  });

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, kpi_ids, initiative_ids, ...input }: UpdateTaskInput) => {
      const updateData: Record<string, unknown> = { ...input };
      
      // Handle status transitions
      if (input.status === 'done') {
        updateData.last_checkin_at = new Date().toISOString();
      } else if (input.status === 'closed') {
        updateData.closed_at = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      // Sync KPI and Initiative links if provided
      if (kpi_ids !== undefined) {
        await syncTaskKpis(id, kpi_ids);
      }
      if (initiative_ids !== undefined) {
        await syncTaskInitiatives(id, initiative_ids);
      }

      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tasks'] }),
        queryClient.invalidateQueries({ queryKey: ['kpis'] }),
      ]);
      toast({
        title: '과제 수정 완료',
        description: '과제가 업데이트되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '과제 수정 실패',
        description: error.message,
      });
    },
  });

  const approveTaskMutation = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string; action: 'approve' | 'reopen' }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다.');

      const updateData: Record<string, unknown> = {};
      
      if (action === 'approve') {
        updateData.status = 'closed';
        updateData.approver_id = user.id;
        updateData.approved_at = new Date().toISOString();
        updateData.closed_at = new Date().toISOString();
      } else {
        updateData.status = 'in_progress';
        updateData.approver_id = null;
        updateData.approved_at = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', taskId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({
        title: variables.action === 'approve' ? '승인 완료' : '재오픈 완료',
        description: variables.action === 'approve' 
          ? '과제가 승인되어 종료되었습니다.' 
          : '과제가 다시 진행 상태로 변경되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '작업 실패',
        description: error.message,
      });
    },
  });

  const deleteTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      // Explicitly delete all related records before deleting the task
      await Promise.all([
        supabase.from('task_checkins').delete().eq('task_id', taskId),
        supabase.from('task_comments').delete().eq('task_id', taskId),
        supabase.from('task_attachments').delete().eq('task_id', taskId),
        supabase.from('task_kpis').delete().eq('task_id', taskId),
        supabase.from('task_initiatives').delete().eq('task_id', taskId),
      ]);
      const { error } = await supabase.from('tasks').delete().eq('id', taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast({ title: '과제 삭제 완료', description: '과제가 삭제되었습니다.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
    },
  });

  return {
    tasks: tasksQuery.data || [],
    isLoading: tasksQuery.isLoading,
    error: tasksQuery.error,
    createTask: createTaskMutation.mutateAsync,
    updateTask: updateTaskMutation.mutateAsync,
    approveTask: approveTaskMutation.mutateAsync,
    deleteTask: deleteTaskMutation.mutateAsync,
    isCreating: createTaskMutation.isPending,
    isUpdating: updateTaskMutation.isPending,
    isDeleting: deleteTaskMutation.isPending,
  };
}

export function useTask(taskId: string | undefined) {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['task', taskId],
    queryFn: async () => {
      if (!taskId) return null;

      const { data: task, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('id', taskId)
        .single();

      if (error) throw error;

      let owner: Profile | undefined;
      let assigner: Profile | undefined;
      
      const profileIds = [task.owner_id, task.assigner_id].filter(Boolean) as string[];
      if (profileIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('*')
          .in('id', [...new Set(profileIds)]);
        if (profiles) {
          const map = Object.fromEntries(profiles.map(p => [p.id, p]));
          owner = task.owner_id ? map[task.owner_id] : undefined;
          assigner = task.assigner_id ? map[task.assigner_id] : undefined;
        }
      }

      // Fetch KPIs and Initiatives via junction tables
      const [kpisMap, initiativesMap] = await Promise.all([
        fetchTaskKpis([taskId]),
        fetchTaskInitiatives([taskId]),
      ]);
      const kpis = kpisMap[taskId] || [];
      const initiatives = initiativesMap[taskId] || [];

      return { ...task, owner, assigner, kpis, kpi: kpis[0], initiatives } as Task;
    },
    enabled: !!taskId && !!profile?.org_id,
  });
}
