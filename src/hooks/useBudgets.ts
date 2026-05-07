import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useToast } from '@/hooks/use-toast';

export type BudgetType = 'opex' | 'capex';

export interface Budget {
  id: string;
  org_id: string;
  year: number;
  budget_type: BudgetType;
  category: string | null;
  department: string | null;
  budget_amount: number;
  actual_amount: number;
  forecast_amount: number;
  currency: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateBudgetInput {
  year: number;
  budget_type: BudgetType;
  category?: string;
  department?: string;
  budget_amount: number;
  actual_amount?: number;
  forecast_amount?: number;
  notes?: string;
}

interface UpdateBudgetInput extends Partial<CreateBudgetInput> {
  id: string;
}

export function useBudgets(options?: { year?: number; budgetType?: BudgetType }) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const budgetsQuery = useQuery({
    queryKey: ['budgets', profile?.org_id, options],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      let query = supabase
        .from('budgets')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('year', { ascending: false })
        .order('budget_type')
        .order('category');

      if (options?.year) {
        query = query.eq('year', options.year);
      }

      if (options?.budgetType) {
        query = query.eq('budget_type', options.budgetType);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as Budget[];
    },
    enabled: !!profile?.org_id,
  });

  const createBudgetMutation = useMutation({
    mutationFn: async (input: CreateBudgetInput) => {
      if (!profile?.org_id || !user?.id) {
        throw new Error('조직에 소속되어야 예산을 생성할 수 있습니다.');
      }

      const { data, error } = await supabase
        .from('budgets')
        .insert({
          ...input,
          org_id: profile.org_id,
          created_by: user.id,
          actual_amount: input.actual_amount || 0,
          forecast_amount: input.forecast_amount || input.budget_amount,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: '예산 항목 생성 완료',
        description: '새 예산 항목이 추가되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '예산 생성 실패',
        description: error.message,
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async ({ id, ...input }: UpdateBudgetInput) => {
      const { data, error } = await supabase
        .from('budgets')
        .update(input)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: '예산 수정 완료',
        description: '예산 정보가 업데이트되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '예산 수정 실패',
        description: error.message,
      });
    },
  });

  const deleteBudgetMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('budgets')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      toast({
        title: '예산 삭제 완료',
        description: '예산 항목이 삭제되었습니다.',
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: '예산 삭제 실패',
        description: error.message,
      });
    },
  });

  // Aggregate by year for summary view
  const budgetSummary = budgetsQuery.data?.reduce((acc, budget) => {
    const key = `${budget.year}-${budget.budget_type}`;
    if (!acc[key]) {
      acc[key] = {
        year: budget.year,
        budget_type: budget.budget_type,
        budget_amount: 0,
        actual_amount: 0,
        forecast_amount: 0,
      };
    }
    acc[key].budget_amount += Number(budget.budget_amount) || 0;
    acc[key].actual_amount += Number(budget.actual_amount) || 0;
    acc[key].forecast_amount += Number(budget.forecast_amount) || 0;
    return acc;
  }, {} as Record<string, { year: number; budget_type: BudgetType; budget_amount: number; actual_amount: number; forecast_amount: number }>);

  return {
    budgets: budgetsQuery.data || [],
    budgetSummary: budgetSummary ? Object.values(budgetSummary) : [],
    isLoading: budgetsQuery.isLoading,
    error: budgetsQuery.error,
    createBudget: createBudgetMutation.mutateAsync,
    updateBudget: updateBudgetMutation.mutateAsync,
    deleteBudget: deleteBudgetMutation.mutateAsync,
    isCreating: createBudgetMutation.isPending,
    isUpdating: updateBudgetMutation.isPending,
  };
}
