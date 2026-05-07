import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Budget, BudgetType, useBudgets } from '@/hooks/useBudgets';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const budgetFormSchema = z.object({
  year: z.coerce.number().min(2020, '2020년 이후를 선택하세요').max(2030, '2030년 이전을 선택하세요'),
  budget_type: z.enum(['opex', 'capex']),
  category: z.string().trim().max(100, '최대 100자까지 입력 가능합니다').optional(),
  department: z.string().trim().max(100, '최대 100자까지 입력 가능합니다').optional(),
  budget_amount: z.coerce.number().min(0, '0 이상의 금액을 입력하세요'),
  actual_amount: z.coerce.number().min(0, '0 이상의 금액을 입력하세요').default(0),
  forecast_amount: z.coerce.number().min(0, '0 이상의 금액을 입력하세요').default(0),
  notes: z.string().trim().max(500, '최대 500자까지 입력 가능합니다').optional(),
});

type BudgetFormValues = z.infer<typeof budgetFormSchema>;

interface BudgetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  budget?: Budget | null;
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function BudgetDialog({ open, onOpenChange, budget }: BudgetDialogProps) {
  const { createBudget, updateBudget, isCreating, isUpdating } = useBudgets();
  
  const isEditing = !!budget;
  const isLoading = isCreating || isUpdating;

  const form = useForm<BudgetFormValues>({
    resolver: zodResolver(budgetFormSchema),
    defaultValues: {
      year: currentYear,
      budget_type: 'opex',
      category: '',
      department: '',
      budget_amount: 0,
      actual_amount: 0,
      forecast_amount: 0,
      notes: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (budget) {
      form.reset({
        year: budget.year,
        budget_type: budget.budget_type,
        category: budget.category || '',
        department: budget.department || '',
        budget_amount: budget.budget_amount,
        actual_amount: budget.actual_amount,
        forecast_amount: budget.forecast_amount,
        notes: budget.notes || '',
      });
    } else {
      form.reset({
        year: currentYear,
        budget_type: 'opex',
        category: '',
        department: '',
        budget_amount: 0,
        actual_amount: 0,
        forecast_amount: 0,
        notes: '',
      });
    }
  }, [budget, form, open]);

  const onSubmit = async (values: BudgetFormValues) => {
    try {
      if (isEditing && budget) {
        await updateBudget({
          id: budget.id,
          ...values,
        });
      } else {
        await createBudget({
          year: values.year,
          budget_type: values.budget_type,
          category: values.category,
          department: values.department,
          budget_amount: values.budget_amount,
          actual_amount: values.actual_amount,
          forecast_amount: values.forecast_amount,
          notes: values.notes,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const formatAmount = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '예산 항목 수정' : '새 예산 항목 추가'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? '예산 정보를 수정합니다.'
              : '새로운 예산 항목을 추가합니다.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연도 *</FormLabel>
                    <Select onValueChange={(v) => field.onChange(parseInt(v))} value={field.value.toString()}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="연도 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}년
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="budget_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예산 유형 *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="유형 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="opex">OPEX (운영비)</SelectItem>
                        <SelectItem value="capex">CAPEX (투자비)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>카테고리</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 인건비, IT인프라" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>부서</FormLabel>
                    <FormControl>
                      <Input placeholder="예: 영업팀, IT팀" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="budget_amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>계획 금액 (원) *</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0" 
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    {formatAmount(field.value || 0)} 원
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="actual_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>실적 금액 (원)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(field.value || 0)} 원
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="forecast_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>전망 금액 (원)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="0" 
                        {...field}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(field.value || 0)} 원
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메모</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="예산에 대한 참고 사항"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                취소
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? '수정' : '추가'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
