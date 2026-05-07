import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Department, useDepartments } from '@/hooks/useDepartments';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { DepartmentSelect } from './DepartmentSelect';
import {
  Dialog,
  DialogContent,
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

const schema = z.object({
  name: z.string().min(1, '부서명을 입력하세요').max(100),
  parent_id: z.string().optional(),
  head_user_id: z.string().optional(),
  description: z.string().max(500).optional(),
  sort_order: z.coerce.number().int().default(0),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department?: Department | null;
}

export function DepartmentDialog({ open, onOpenChange, department }: Props) {
  const { createDepartment, updateDepartment, isCreating, isUpdating } = useDepartments();
  const { data: members = [] } = useOrgMembers();
  const isEditing = !!department;
  const isLoading = isCreating || isUpdating;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', parent_id: '', head_user_id: '', description: '', sort_order: 0 },
  });

  useEffect(() => {
    if (!open) return;
    if (department) {
      form.reset({
        name: department.name,
        parent_id: department.parent_id || '',
        head_user_id: department.head_user_id || '',
        description: department.description || '',
        sort_order: department.sort_order,
      });
    } else {
      form.reset({ name: '', parent_id: '', head_user_id: '', description: '', sort_order: 0 });
    }
  }, [department, form, open]);

  const onSubmit = async (values: FormValues) => {
    try {
      const payload = {
        name: values.name,
        parent_id: values.parent_id || null,
        head_user_id: values.head_user_id || null,
        description: values.description || null,
        sort_order: values.sort_order,
      };
      if (isEditing && department) {
        await updateDepartment({ id: department.id, ...payload });
      } else {
        await createDepartment(payload);
      }
      onOpenChange(false);
    } catch {}
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? '부서 수정' : '부서 추가'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>부서명 *</FormLabel>
                  <FormControl><Input placeholder="예: 경영기획본부" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="parent_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상위 부서</FormLabel>
                  <FormControl>
                    <DepartmentSelect value={field.value || ''} onChange={field.onChange} noneLabel="없음 (최상위)" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="head_user_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>부서장</FormLabel>
                  <Select onValueChange={(v) => field.onChange(v === 'none' ? '' : v)} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="부서장 선택" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">미지정</SelectItem>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name || m.email}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>설명</FormLabel>
                  <FormControl><Textarea className="resize-none" placeholder="부서 설명" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="sort_order"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>정렬 순서</FormLabel>
                  <FormControl><Input type="number" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
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
