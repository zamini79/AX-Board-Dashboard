import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Kpi, KPI_STATUS_CONFIG, KpiStatus } from '@/types/database';
import { useKpis } from '@/hooks/useKpis';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { useUserProfile } from '@/hooks/useUserProfile';
import { MemberCombobox } from '@/components/ui/member-combobox';
import { DepartmentSelect } from '@/components/department/DepartmentSelect';
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
  FormDescription,
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

const kpiFormSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(100, '최대 100자까지 입력 가능합니다'),
  description: z.string().max(500, '최대 500자까지 입력 가능합니다').optional(),
  department_id: z.string().optional(),
  owner_id: z.string().optional(),
  owner_name: z.string().max(100).optional(),
  parent_id: z.string().optional(),
  unit: z.string().max(20).optional(),
  target_value: z.coerce.number().min(0).optional(),
  current_value: z.coerce.number().min(0).optional(),
  weight: z.coerce.number().min(0).max(100).default(100),
  status: z.enum(['on_track', 'at_risk', 'off_track', 'na']).default('na'),
  cadence: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']).default('monthly'),
  year: z.coerce.number().min(2020).max(2100).default(new Date().getFullYear()),
});

type KpiFormValues = z.infer<typeof kpiFormSchema>;

interface KpiDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kpi?: Kpi | null;
  defaultYear?: number;
}

export function KpiDialog({ open, onOpenChange, kpi, defaultYear }: KpiDialogProps) {
  const { createKpi, updateKpi, isCreating, isUpdating, flatKpis, getDescendantIds } = useKpis(defaultYear);
  const { data: members = [] } = useOrgMembers();
  const { profile } = useUserProfile();
  
  const isEditing = !!kpi;
  const isLoading = isCreating || isUpdating;

  const form = useForm<KpiFormValues>({
    resolver: zodResolver(kpiFormSchema),
    defaultValues: {
      name: '',
      description: '',
      department_id: '',
      owner_id: '',
      owner_name: '',
      parent_id: '',
        unit: '%',
        target_value: undefined,
        current_value: undefined,
        weight: 100,
        status: 'na',
      cadence: 'monthly',
      year: defaultYear || new Date().getFullYear(),
    },
  });

  useEffect(() => {
    if (!open) return;
    if (kpi) {
      form.reset({
        name: kpi.name,
        description: kpi.description || '',
        department_id: kpi.department_id || '',
        owner_id: kpi.owner_id || '',
        owner_name: kpi.owner_name || '',
        parent_id: kpi.parent_id || '',
        unit: kpi.unit || '%',
        target_value: kpi.target_value ?? undefined,
        current_value: kpi.current_value ?? undefined,
        weight: kpi.weight ?? 100,
        status: kpi.status,
        cadence: (kpi.cadence as 'weekly' | 'monthly' | 'quarterly' | 'yearly') || 'monthly',
        year: kpi.year || new Date().getFullYear(),
      });
    } else {
      form.reset({
        name: '',
        description: '',
        department_id: profile?.department_id || '',
        owner_id: '',
        owner_name: '',
        parent_id: '',
        unit: '%',
        target_value: undefined,
        current_value: undefined,
        weight: 100,
        status: 'na',
        cadence: 'monthly',
        year: defaultYear || new Date().getFullYear(),
      });
    }
  }, [kpi, form, open, defaultYear]);

  const onSubmit = async (values: KpiFormValues) => {
    try {
      if (isEditing && kpi) {
        await updateKpi({
          id: kpi.id,
          name: values.name,
          description: values.description,
          department_id: values.department_id || null,
          owner_id: values.owner_id || null,
          owner_name: values.owner_name || null,
          parent_id: values.parent_id || null,
          unit: values.unit,
          target_value: values.target_value,
          current_value: values.current_value,
          weight: values.weight,
          status: values.status,
          cadence: values.cadence,
          year: values.year,
        });
      } else {
        await createKpi({
          name: values.name,
          description: values.description,
          department_id: values.department_id || null,
          owner_id: values.owner_id || null,
          owner_name: values.owner_name || null,
          parent_id: values.parent_id || null,
          unit: values.unit,
          target_value: values.target_value,
          current_value: values.current_value,
          weight: values.weight,
          status: values.status,
          cadence: values.cadence,
          year: values.year,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'KPI 수정' : '새 KPI 추가'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? 'KPI 정보를 수정합니다.'
              : '새로운 KPI를 추가합니다.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>KPI 이름 *</FormLabel>
                      <FormControl>
                        <Input placeholder="예: 매출 성장률" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>연도 *</FormLabel>
                    <FormControl>
                      <Input type="number" min={2020} max={2100} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="KPI에 대한 설명을 입력하세요"
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Department selector */}
            <FormField
              control={form.control}
              name="department_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>소속 부서</FormLabel>
                  <FormControl>
                    <DepartmentSelect value={field.value || ''} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Parent KPI selector */}
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => {
                const watchedYear = form.watch('year');
                const excludeIds = new Set<string>();
                if (kpi) {
                  excludeIds.add(kpi.id);
                  getDescendantIds(kpi.id).forEach(id => excludeIds.add(id));
                }
                const availableKpis = flatKpis.filter(k => !excludeIds.has(k.id) && k.year === watchedYear);

                return (
                  <FormItem>
                    <FormLabel>상위 KPI</FormLabel>
                    <Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="상위 KPI 선택 (선택사항)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">없음 (최상위 KPI)</SelectItem>
                        {availableKpis.map(k => (
                          <SelectItem key={k.id} value={k.id}>
                            {k.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      이 KPI를 다른 KPI의 하위 지표로 설정합니다.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="target_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>목표값</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="100"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="current_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>현재값</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        placeholder="75"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>비중 (%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={0}
                        max={100}
                        placeholder="100"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>단위</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="단위 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="%">퍼센트 (%)</SelectItem>
                        <SelectItem value="원">원 (₩)</SelectItem>
                        <SelectItem value="건">건수</SelectItem>
                        <SelectItem value="명">인원 (명)</SelectItem>
                        <SelectItem value="점">점수</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cadence"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>보고 주기</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="주기 선택" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="weekly">주간</SelectItem>
                        <SelectItem value="monthly">월간</SelectItem>
                        <SelectItem value="quarterly">분기</SelectItem>
                        <SelectItem value="yearly">연간</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상태</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="상태 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(KPI_STATUS_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>
                          {config.emoji} {config.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    목표 달성 현황을 나타냅니다.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="owner_id"
              render={() => {
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
                          if (custom) {
                            form.setValue('owner_id', '');
                            form.setValue('owner_name', val);
                          } else {
                            form.setValue('owner_id', val);
                            form.setValue('owner_name', '');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
