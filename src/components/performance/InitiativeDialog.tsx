import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Initiative, INITIATIVE_STATUS_CONFIG, InitiativeStatus } from '@/types/database';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { MemberCombobox } from '@/components/ui/member-combobox';
import { DepartmentSelect } from '@/components/department/DepartmentSelect';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const schema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200),
  description: z.string().max(1000).optional(),
  owner_id: z.string().optional(),
  owner_name: z.string().max(100).optional(),
  status: z.enum(['not_started', 'in_progress', 'completed', 'blocked']).default('not_started'),
  weight: z.coerce.number().min(0.1).max(100).default(1),
  target_value: z.coerce.number().optional(),
  current_value: z.coerce.number().optional(),
  unit: z.string().max(20).optional(),
  data_source: z.enum(['manual', 'auto', 'dashboard_url']).default('manual'),
  dashboard_url: z.string().url('유효한 URL을 입력해주세요').optional().or(z.literal('')),
  start_date: z.string().optional(),
  target_date: z.string().optional(),
  department_id: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface InitiativeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goalId: string;
  initiative?: Initiative | null;
}

export function InitiativeDialog({ open, onOpenChange, goalId, initiative }: InitiativeDialogProps) {
  const { createInitiative, updateInitiative, isCreating, isUpdating } = useInitiatives(goalId);
  const { data: members = [] } = useOrgMembers();
  const isEditing = !!initiative;
  const isLoading = isCreating || isUpdating;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '', description: '', owner_id: '', owner_name: '',
      status: 'not_started', weight: 1, target_value: undefined, current_value: undefined,
      unit: '%', data_source: 'manual', dashboard_url: '', start_date: '', target_date: '', department_id: '',
    },
  });

  useEffect(() => {
    if (!open) return;
    if (initiative) {
      form.reset({
        title: initiative.title, description: initiative.description || '',
        owner_id: initiative.owner_id || '', owner_name: initiative.owner_name || '',
        status: initiative.status, weight: initiative.weight,
        target_value: initiative.target_value ?? undefined,
        current_value: initiative.current_value ?? undefined,
        unit: initiative.unit || '%', data_source: (initiative.data_source || 'manual') as any,
        dashboard_url: initiative.dashboard_url || '',
        start_date: initiative.start_date || '', target_date: initiative.target_date || '',
        department_id: initiative.department_id || '',
      });
    } else {
      form.reset({
        title: '', description: '', owner_id: '', owner_name: '',
        status: 'not_started', weight: 1, target_value: undefined, current_value: undefined,
        unit: '%', data_source: 'manual', dashboard_url: '', start_date: '', target_date: '', department_id: '',
      });
    }
  }, [initiative, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        title: values.title,
        description: values.description,
        owner_id: values.owner_id || null,
        owner_name: values.owner_name || null,
        status: values.status as InitiativeStatus,
        weight: values.weight,
        target_value: values.target_value ?? null,
        current_value: values.current_value ?? null,
        unit: values.unit,
        data_source: values.data_source,
        dashboard_url: values.dashboard_url || null,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
        department_id: values.department_id || null,
      };

      // Auto-compute score
      let score: number | null = null;
      if (payload.target_value && payload.current_value != null) {
        score = Math.min(100, (payload.current_value / payload.target_value) * 100);
      }

      if (isEditing && initiative) {
        await updateInitiative({ id: initiative.id, ...payload, score });
      } else {
        await createInitiative({ goal_id: goalId, ...payload, score });
      }
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '이니셔티브 수정' : '새 이니셔티브'}</DialogTitle>
          <DialogDescription>
            {isEditing ? '이니셔티브 정보를 수정합니다.' : '새로운 이니셔티브를 추가합니다.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>제목 *</FormLabel><FormControl><Input placeholder="이니셔티브 제목" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="description" render={({ field }) => (
              <FormItem><FormLabel>설명</FormLabel><FormControl><Textarea placeholder="상세 설명" className="resize-none" {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="department_id" render={({ field }) => (
              <FormItem><FormLabel>부서</FormLabel><FormControl><DepartmentSelect value={field.value || ''} onChange={field.onChange} /></FormControl><FormMessage /></FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="status" render={({ field }) => (
                <FormItem><FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {Object.entries(INITIATIVE_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="weight" render={({ field }) => (
                <FormItem><FormLabel>가중치</FormLabel><FormControl><Input type="number" step="0.1" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField control={form.control} name="target_value" render={({ field }) => (
                <FormItem><FormLabel>목표값</FormLabel><FormControl><Input type="number" placeholder="100" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="current_value" render={({ field }) => (
                <FormItem><FormLabel>현재값</FormLabel><FormControl><Input type="number" placeholder="50" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>단위</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      <SelectItem value="%">%</SelectItem>
                      <SelectItem value="원">원</SelectItem>
                      <SelectItem value="건">건</SelectItem>
                      <SelectItem value="명">명</SelectItem>
                      <SelectItem value="점">점</SelectItem>
                    </SelectContent>
                  </Select><FormMessage />
                </FormItem>
              )} />
            </div>

            <FormField control={form.control} name="data_source" render={({ field }) => (
              <FormItem><FormLabel>데이터 소스</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="manual">수동 입력</SelectItem>
                    <SelectItem value="auto">자동 계산</SelectItem>
                    <SelectItem value="dashboard_url">대시보드 연동</SelectItem>
                  </SelectContent>
                </Select><FormMessage />
              </FormItem>
            )} />

            <FormField control={form.control} name="dashboard_url" render={({ field }) => (
              <FormItem><FormLabel>외부 대시보드 URL</FormLabel>
                <FormControl><Input placeholder="https://dashboard.example.com/..." {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="start_date" render={({ field }) => (
                <FormItem><FormLabel>시작일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="target_date" render={({ field }) => (
                <FormItem><FormLabel>목표일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>

            <FormField control={form.control} name="owner_id" render={() => {
              const ownerId = form.watch('owner_id');
              const ownerName = form.watch('owner_name');
              const isCustom = !ownerId && !!ownerName;
              const value = ownerId || ownerName || '';
              return (
                <FormItem><FormLabel>담당자</FormLabel><FormControl>
                  <MemberCombobox
                    members={members.map(m => ({ id: m.id, label: m.full_name || m.email }))}
                    value={value} isCustom={isCustom}
                    onChange={(val, custom) => {
                      if (custom) { form.setValue('owner_id', ''); form.setValue('owner_name', val); }
                      else { form.setValue('owner_id', val); form.setValue('owner_name', ''); }
                    }}
                  />
                </FormControl><FormMessage /></FormItem>
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
