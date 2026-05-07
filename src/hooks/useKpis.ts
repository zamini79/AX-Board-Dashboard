import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Kpi, KpiStatus, Profile } from '@/types/database';
import { useToast } from '@/hooks/use-toast';

interface CreateKpiInput {
  name: string;
  description?: string;
  department_id?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  parent_id?: string | null;
  unit?: string;
  target_value?: number;
  current_value?: number;
  status?: KpiStatus;
  cadence?: string;
  year?: number;
  weight?: number;
}

interface UpdateKpiInput extends Partial<CreateKpiInput> {
  id: string;
}

// Recursively compute progress for a KPI tree node (weighted average)
function computeProgress(kpi: Kpi): number {
  if (kpi.children && kpi.children.length > 0) {
    const totalWeight = kpi.children.reduce((sum, c) => sum + (c.weight ?? 100), 0);
    if (totalWeight === 0) {
      // Fallback to simple average
      const childProgresses = kpi.children.map(c => computeProgress(c));
      return childProgresses.reduce((a, b) => a + b, 0) / childProgresses.length;
    }
    const weightedSum = kpi.children.reduce(
      (sum, c) => sum + computeProgress(c) * (c.weight ?? 100),
      0
    );
    return weightedSum / totalWeight;
  }
  if (kpi.target_value && kpi.current_value) {
    return Math.min(100, (kpi.current_value / kpi.target_value) * 100);
  }
  return 0;
}

// Build tree from flat list
function buildKpiTree(flatKpis: Kpi[]): Kpi[] {
  const map = new Map<string, Kpi>();
  flatKpis.forEach(kpi => map.set(kpi.id, { ...kpi, children: [] }));

  const roots: Kpi[] = [];
  map.forEach(kpi => {
    if (kpi.parent_id && map.has(kpi.parent_id)) {
      map.get(kpi.parent_id)!.children!.push(kpi);
    } else {
      roots.push(kpi);
    }
  });

  // Sort children by sort_order
  map.forEach(kpi => {
    if (kpi.children && kpi.children.length > 1) {
      kpi.children.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    }
  });
  roots.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  // Set depth and computed_progress recursively
  function setDepthAndProgress(kpi: Kpi, depth: number) {
    kpi.depth = depth;
    kpi.children?.forEach(c => setDepthAndProgress(c, depth + 1));
    kpi.computed_progress = computeProgress(kpi);
  }
  roots.forEach(r => setDepthAndProgress(r, 0));

  return roots;
}

// Get all descendant IDs of a KPI
function getDescendantIds(kpi: Kpi): string[] {
  const ids: string[] = [];
  kpi.children?.forEach(child => {
    ids.push(child.id);
    ids.push(...getDescendantIds(child));
  });
  return ids;
}

// Find ancestors by walking the flat list
function getAncestors(flatKpis: Kpi[], kpiId: string): Kpi[] {
  const map = new Map<string, Kpi>();
  flatKpis.forEach(k => map.set(k.id, k));
  
  const ancestors: Kpi[] = [];
  let current = map.get(kpiId);
  while (current?.parent_id) {
    const parent = map.get(current.parent_id);
    if (parent) {
      ancestors.unshift(parent);
      current = parent;
    } else break;
  }
  return ancestors;
}

export function useKpis(year?: number) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const kpisQuery = useQuery({
    queryKey: ['kpis', profile?.org_id, year],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from('kpis')
        .select('*')
        .eq('org_id', profile.org_id)
        .is('archived_at', null)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: false });

      if (year) {
        query = query.eq('year', year);
      }

      const { data: kpisData, error: kpisError } = await query;

      if (kpisError) throw kpisError;
      if (!kpisData || kpisData.length === 0) return [];

      // Fetch owners
      const ownerIds = [...new Set(kpisData.map(k => k.owner_id).filter(Boolean))];
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

      // Get task counts for each KPI via junction table
      const kpiIds = kpisData.map(k => k.id);
      const { data: taskKpiLinks } = await supabase
        .from('task_kpis')
        .select('kpi_id, task_id')
        .in('kpi_id', kpiIds);

      const countMap: Record<string, number> = {};
      if (taskKpiLinks) {
        const linkedTaskIds = [...new Set(taskKpiLinks.map(l => l.task_id))];
        let activeTaskIds = new Set<string>();
        if (linkedTaskIds.length > 0) {
          const { data: tasks } = await supabase
            .from('tasks')
            .select('id')
            .in('id', linkedTaskIds)
            .not('status', 'in', '("closed","cancelled")');
          if (tasks) activeTaskIds = new Set(tasks.map(t => t.id));
        }
        taskKpiLinks.forEach(l => {
          if (activeTaskIds.has(l.task_id)) {
            countMap[l.kpi_id] = (countMap[l.kpi_id] || 0) + 1;
          }
        });
      }

      return kpisData.map(kpi => ({
        ...kpi,
        status: kpi.status ?? 'na',
        owner: kpi.owner_id ? ownersMap[kpi.owner_id] : undefined,
        tasks_count: countMap[kpi.id] || 0,
      })) as Kpi[];
    },
    enabled: !!profile?.org_id,
    staleTime: 30_000,
  });

  // Available years query
  const availableYearsQuery = useQuery({
    queryKey: ['kpi-years', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];
      const { data, error } = await supabase
        .from('kpis')
        .select('year')
        .eq('org_id', profile.org_id)
        .is('archived_at', null);
      if (error) throw error;
      const years = [...new Set((data || []).map(d => d.year))].sort((a, b) => b - a);
      // Always include current year so user can create KPIs for it
      const currentYear = new Date().getFullYear();
      if (!years.includes(currentYear)) years.unshift(currentYear);
      return years.sort((a, b) => b - a);
    },
    enabled: !!profile?.org_id,
    staleTime: 60_000,
  });

  // Flat list of all KPIs
  const flatKpis = kpisQuery.data || [];
  
  // Tree structure (root KPIs with children nested)
  const kpiTree = flatKpis.length > 0 ? buildKpiTree(flatKpis) : [];

  const createKpiMutation = useMutation({
    mutationFn: async (input: CreateKpiInput) => {
      if (!profile?.org_id || !user?.id) {
        throw new Error('조직에 소속되어야 KPI를 생성할 수 있습니다.');
      }

      const { data, error } = await supabase
        .from('kpis')
        .insert({
          ...input,
          org_id: profile.org_id,
          created_by: user.id,
          year: input.year || new Date().getFullYear(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kpis'] });
      await queryClient.invalidateQueries({ queryKey: ['kpi-years'] });
      toast({
        title: 'KPI 생성 완료',
        description: '새 KPI가 추가되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'KPI 생성 실패',
        description: error.message,
      });
    },
  });

  const updateKpiMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateKpiInput) => {
      const { data, error } = await supabase
        .from('kpis')
        .update({
          ...input,
          last_updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kpis'] });
      await queryClient.invalidateQueries({ queryKey: ['kpi'] });
      await queryClient.invalidateQueries({ queryKey: ['kpi-years'] });
      toast({
        title: 'KPI 수정 완료',
        description: 'KPI가 업데이트되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'KPI 수정 실패',
        description: error.message,
      });
    },
  });

  const deleteKpiMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data: children } = await supabase
        .from('kpis')
        .select('id')
        .eq('parent_id', id)
        .is('archived_at', null)
        .limit(1);
      if (children && children.length > 0) {
        throw new Error('하위 KPI가 있어 삭제할 수 없습니다. 하위 KPI를 먼저 삭제해 주세요.');
      }

      const { data: taskLinks } = await supabase
        .from('task_kpis')
        .select('id')
        .eq('kpi_id', id)
        .limit(1);
      if (taskLinks && taskLinks.length > 0) {
        throw new Error('연결된 과제가 있어 삭제할 수 없습니다. 과제를 먼저 삭제하거나 연결을 해제해 주세요.');
      }

      await supabase.from('kpi_attachments').delete().eq('kpi_id', id);
      const { error } = await supabase.from('kpis').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kpis'] });
      await queryClient.invalidateQueries({ queryKey: ['kpi'] });
      await queryClient.invalidateQueries({ queryKey: ['kpi-years'] });
      toast({ title: 'KPI 삭제 완료', description: 'KPI가 삭제되었습니다.' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: 'KPI 삭제 실패', description: error.message });
    },
  });

  const updateSortOrderMutation = useMutation({
    mutationFn: async (updates: { id: string; sort_order: number }[]) => {
      const promises = updates.map(({ id, sort_order }) =>
        supabase.from('kpis').update({ sort_order }).eq('id', id)
      );
      const results = await Promise.all(promises);
      const err = results.find(r => r.error);
      if (err?.error) throw err.error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '정렬 순서 저장 실패', description: error.message });
    },
  });

  const archiveKpiMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('kpis')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpis'] });
      toast({
        title: 'KPI 아카이브 완료',
        description: 'KPI가 아카이브되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'KPI 아카이브 실패',
        description: error.message,
      });
    },
  });

  // Always include current year in selector so user can create KPIs for it
  const currentYear = new Date().getFullYear();
  const rawAvailableYears = availableYearsQuery.data || [];
  const availableYears = rawAvailableYears.includes(currentYear)
    ? rawAvailableYears
    : [currentYear, ...rawAvailableYears];

  return {
    kpis: flatKpis,
    kpiTree,
    flatKpis,
    availableYears,
    isLoading: kpisQuery.isLoading,
    error: kpisQuery.error,
    createKpi: createKpiMutation.mutateAsync,
    updateKpi: updateKpiMutation.mutateAsync,
    deleteKpi: deleteKpiMutation.mutateAsync,
    archiveKpi: archiveKpiMutation.mutateAsync,
    updateKpiSortOrder: updateSortOrderMutation.mutateAsync,
    isCreating: createKpiMutation.isPending,
    isUpdating: updateKpiMutation.isPending,
    isDeleting: deleteKpiMutation.isPending,
    getDescendantIds: (kpiId: string) => {
      const tree = flatKpis.length > 0 ? buildKpiTree(flatKpis) : [];
      function findKpi(nodes: Kpi[]): Kpi | undefined {
        for (const n of nodes) {
          if (n.id === kpiId) return n;
          const found = findKpi(n.children || []);
          if (found) return found;
        }
      }
      const kpi = findKpi(tree);
      return kpi ? getDescendantIds(kpi) : [];
    },
    getAncestors: (kpiId: string) => getAncestors(flatKpis, kpiId),
  };
}

export function useKpi(kpiId: string | undefined) {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['kpi', kpiId],
    queryFn: async () => {
      if (!kpiId) return null;

      const { data: allKpis, error: allError } = await supabase
        .from('kpis')
        .select('*')
        .eq('org_id', profile!.org_id!)
        .is('archived_at', null);

      if (allError) throw allError;
      if (!allKpis) return null;

      const targetKpi = allKpis.find(k => k.id === kpiId);
      if (!targetKpi) return null;

      // Filter to same year for tree context
      const sameYearKpis = allKpis.filter(k => k.year === targetKpi.year);

      const ownerIds = [...new Set(sameYearKpis.map(k => k.owner_id).filter(Boolean))];
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

      const enriched = sameYearKpis.map(kpi => ({
        ...kpi,
        owner: kpi.owner_id ? ownersMap[kpi.owner_id] : undefined,
      })) as Kpi[];

      const tree = buildKpiTree(enriched);
      function findKpi(nodes: Kpi[]): Kpi | undefined {
        for (const n of nodes) {
          if (n.id === kpiId) return n;
          const found = findKpi(n.children || []);
          if (found) return found;
        }
      }

      const kpiNode = findKpi(tree);
      if (!kpiNode) return null;

      const ancestors = getAncestors(enriched, kpiId);

      return { ...kpiNode, ancestors } as Kpi & { ancestors: Kpi[] };
    },
    enabled: !!kpiId && !!profile?.org_id,
  });
}
