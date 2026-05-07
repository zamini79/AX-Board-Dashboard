import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PerformanceGoal, GOAL_STATUS_CONFIG, GoalStatus, BSC_PERSPECTIVE_CONFIG, BscPerspective } from '@/types/database';
import { useGoals } from '@/hooks/useGoals';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { MemberCombobox } from '@/components/ui/member-combobox';
import { DepartmentSelect } from '@/components/department/DepartmentSelect';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const goalFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200),
  description: z.string().max(1000).optional(),
  department_id: z.string().optional(),
  owner_id: z.string().optional(),
  owner_name: z.string().max(100).optional(),
  parent_id: z.string().optional(),
  perspective: z.string().optional(),
  status: z.enum(['not_started', 'active', 'completed', 'on_hold']).default('not_started'),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalFormSchema>;

interface GoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal?: PerformanceGoal | null;
  defaultParentId?: string;
}

export function GoalDialog({ open, onOpenChange, goal, defaultParentId }: GoalDialogProps) {
  const { createGoal, updateGoal, isCreating, isUpdating, flatGoals, getDescendantIds } = useGoals();
  const { data: members = [] } = useOrgMembers();
  const { profile } = useUserProfile();

  const isEditing = !!goal;
  const isLoading = isCreating || isUpdating;

  const form = useForm<GoalFormValues>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      title: '', description: '', department_id: '', owner_id: '', owner_name: '',
      parent_id: defaultParentId || '', perspective: '', status: 'not_started',
      start_date: '', target_date: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (goal) {
      form.reset({
        title: goal.title, description: goal.description || '',
        department_id: goal.department_id || '', owner_id: goal.owner_id || '',
        owner_name: goal.owner_name || '', parent_id: goal.parent_id || '',
        perspective: goal.perspective || '', status: goal.status,
        start_date: goal.start_date || '', target_date: goal.target_date || '',
      });
    } else {
      form.reset({
        title: '', description: '', department_id: profile?.department_id || '',
        owner_id: '', owner_name: '', parent_id: defaultParentId || '',
        perspective: '', status: 'not_started', start_date: '', target_date: '',
      });
    }
  }, [goal, form, defaultParentId, open]);

  const onSubmit = async (values: GoalFormValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        department_id: values.department_id || null,
        owner_id: values.owner_id || null,
        owner_name: values.owner_name || null,
        parent_id: values.parent_id || null,
        perspective: (values.perspective || null) as BscPerspective | null,
        status: values.status as GoalStatus,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
      };
      if (isEditing && goal) {
        await updateGoal({ id: goal.id, ...payload });
      } else {
        await createGoal(payload);
      }
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '성과 목표 수정' : '새 성과 목표'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '성과 목표 정보를 수정합니다.' : '새로운 성과 목표를 추가합니다.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem>
                <FormLabel>목표 제목 *</FormLabel>
                <FormControl><Input placeholder="예: 2026 매출 목표 달성" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem>
                <FormLabel>설명</FormLabel>
                <FormControl><Textarea placeholder="성과 목표에 대한 설명" className="resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="department_id" render={({ field }) => (
              <FormItem>
                <FormLabel>소속 부서</FormLabel>
                <FormControl><DepartmentSelect value={field.value || ''} onChange={field.onChange} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="parent_id" render={({ field }) => {
              const excludeIds = new Set<string>();
              if (goal) {
                excludeIds.add(goal.id);
                getDescendantIds(goal.id).forEach(id => excludeIds.add(id));
              }
              const available = flatGoals.filter(g => !excludeIds.has(g.id));
              return (
                <FormItem>
                  <FormLabel>상위 성과 목표</FormLabel>
                  <Select onValueChange={v => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                    <FormControl><SelectTrigger><SelectValue placeholder="상위 목표 선택" /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="none">없음 (최상위)</SelectItem>
                      {available.map(g => <SelectItem key={g.id} value={g.id}>{g.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormDescription>이 목표를 다른 성과 목표의 하위로 설정합니다.</FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }} />

            <FormField control={form.control} name="perspective" render={({ field }) => (
              <FormItem>
                <FormLabel>BSC 관점</FormLabel>
                <Select onValueChange={v => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                  <FormControl><SelectTrigger><SelectValue placeholder="BSC 관점 선택" /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="none">미지정</SelectItem>
                    {Object.entries(BSC_PERSPECTIVE_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>상태</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {Object.entries(GOAL_STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>시작일</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="target_date" render={({ field }) => (
                <FormItem>
                  <FormLabel>목표일</FormLabel>
                  <FormControl><Input type="date" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="owner_id" render={() => {
              const ownerId = form.watch('owner_id');
              const ownerName = form.watch('owner_name');
              const isCustom = !ownerId && !!ownerName;
              const value = ownerId || ownerName || '';
              return (
                <FormItem>
                  <FormLabel>담당자</FormLabel>
                  <FormControl>
                    <MemberCombobox
                      members={members.map(m => ({ id: m.id, label: m.full_name || m.email }))}
                      value={value}
                      isCustom={isCustom}
                      onChange={(val, custom) => {
                        if (custom) { form.setValue('owner_id', ''); form.setValue('owner_name', val); }
                        else { form.setValue('owner_id', val); form.setValue('owner_name', ''); }
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              );
            }} />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>취소</Button>
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
