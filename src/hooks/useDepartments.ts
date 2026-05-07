import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

export interface Department {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  head_user_id: string | null;
  description: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
  children?: Department[];
  depth?: number;
}

interface CreateDepartmentInput {
  name: string;
  parent_id?: string | null;
  head_user_id?: string | null;
  description?: string | null;
  sort_order?: number;
}

interface UpdateDepartmentInput extends Partial<CreateDepartmentInput> {
  id: string;
}

function buildDeptTree(flat: Department[]): Department[] {
  const map = new Map<string, Department>();
  flat.forEach(d => map.set(d.id, { ...d, children: [] }));

  const roots: Department[] = [];
  map.forEach(d => {
    if (d.parent_id && map.has(d.parent_id)) {
      map.get(d.parent_id)!.children!.push(d);
    } else {
      roots.push(d);
    }
  });

  function setDepth(node: Department, depth: number) {
    node.depth = depth;
    node.children?.sort((a, b) => a.sort_order - b.sort_order);
    node.children?.forEach(c => setDepth(c, depth + 1));
  }
  roots.sort((a, b) => a.sort_order - b.sort_order);
  roots.forEach(r => setDepth(r, 0));
  return roots;
}

function flattenTree(nodes: Department[]): Department[] {
  const result: Department[] = [];
  function walk(list: Department[]) {
    list.forEach(n => {
      result.push(n);
      if (n.children) walk(n.children);
    });
  }
  walk(nodes);
  return result;
}

export function getSubtreeIds(departments: Department[], deptId: string): string[] {
  const ids: string[] = [];
  function collect(nodes: Department[]) {
    for (const n of nodes) {
      if (n.id === deptId) {
        ids.push(n.id);
        collectAll(n.children || []);
        return true;
      }
      if (collect(n.children || [])) return true;
    }
    return false;
  }
  function collectAll(nodes: Department[]) {
    nodes.forEach(n => {
      ids.push(n.id);
      collectAll(n.children || []);
    });
  }
  collect(departments);
  return ids;
}

export function useDepartments() {
  const { profile, isManager } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['departments', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];
      const { data, error } = await supabase
        .from('departments')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('sort_order');
      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: !!profile?.org_id,
    staleTime: Infinity,
  });

  const flatDepartments = query.data || [];
  const departmentTree = flatDepartments.length > 0 ? buildDeptTree(flatDepartments) : [];
  const flatTreeDepartments = flatDepartments.length > 0 ? flattenTree(departmentTree) : [];

  const createMutation = useMutation({
    mutationFn: async (input: CreateDepartmentInput) => {
      if (!profile?.org_id) throw new Error('조직 필요');
      const { data, error } = await supabase
        .from('departments')
        .insert({ ...input, org_id: profile.org_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: '부서 생성 완료' });
    },
    onError: (e) => toast({ variant: 'destructive', title: '부서 생성 실패', description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateDepartmentInput) => {
      const { data, error } = await supabase
        .from('departments')
        .update(input)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: '부서 수정 완료' });
    },
    onError: (e) => toast({ variant: 'destructive', title: '부서 수정 실패', description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('departments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: '부서 삭제 완료' });
    },
    onError: (e) => toast({ variant: 'destructive', title: '부서 삭제 실패', description: e.message }),
  });

  return {
    departments: flatDepartments,
    departmentTree,
    flatTreeDepartments,
    isLoading: query.isLoading,
    createDepartment: createMutation.mutateAsync,
    updateDepartment: updateMutation.mutateAsync,
    deleteDepartment: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
}
