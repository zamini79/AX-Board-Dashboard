import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Task, TASK_STATUS_CONFIG, TASK_PRIORITY_CONFIG, TaskStatus, TaskPriority, TaskType } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useKpis } from '@/hooks/useKpis';
import { useInitiatives } from '@/hooks/useInitiatives';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { TaskApprovalActions } from './TaskApprovalActions';
import { ItemEditorManager } from '@/components/editors/ItemEditorManager';
import { TaskAttachments } from './TaskAttachments';
import { MemberCombobox } from '@/components/ui/member-combobox';
import { DepartmentSelect } from '@/components/department/DepartmentSelect';
import { useUserProfile } from '@/hooks/useUserProfile';
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ChevronsUpDown, X, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

const taskFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200, '최대 200자까지 입력 가능합니다'),
  description: z.string().max(1000, '최대 1000자까지 입력 가능합니다').optional(),
  external_url: z.string().url('올바른 URL 형식을 입력해주세요').max(2000).optional().or(z.literal('')),
  department_id: z.string().optional(),
  type: z.enum(['kpi_action', 'todo']).default('todo'),
  kpi_ids: z.array(z.string()).default([]),
  initiative_ids: z.array(z.string()).default([]),
  owner_id: z.string().optional(),
  owner_name: z.string().max(100).optional(),
  assigner_id: z.string().optional(),
  assigner_name: z.string().max(100).optional(),
  priority: z.enum(['high', 'medium', 'low']).default('medium'),
  status: z.enum(['not_started', 'in_progress', 'blocked', 'done', 'executive_review', 'closed', 'cancelled']).default('not_started'),
  progress_percent: z.coerce.number().min(0).max(100).default(0),
  start_date: z.string().optional(),
  due_date: z.string().optional(),
  requires_exec_approval: z.boolean().default(true),
}).refine((data) => data.owner_id || data.owner_name, {
  message: '담당자를 선택하거나 입력해주세요',
  path: ['owner_id'],
});

type TaskFormValues = z.infer<typeof taskFormSchema>;

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task?: Task | null;
  defaultKpiId?: string;
  defaultType?: TaskType;
}

export function TaskDialog({ open, onOpenChange, task, defaultKpiId, defaultType }: TaskDialogProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { createTask, updateTask, deleteTask, isCreating, isUpdating, isDeleting } = useTasks();
  const { kpis } = useKpis();
  const { initiatives } = useInitiatives();
  const { data: members = [] } = useOrgMembers();
  const { profile, isManager } = useUserProfile();
  const [kpiPopoverOpen, setKpiPopoverOpen] = useState(false);
  const [initPopoverOpen, setInitPopoverOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  
  const isEditing = !!task;
  const isLoading = isCreating || isUpdating;

  const form = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: '',
      description: '',
      external_url: '',
      department_id: '',
      type: defaultType || 'todo',
      kpi_ids: defaultKpiId ? [defaultKpiId] : [],
      initiative_ids: [],
      owner_id: '',
      owner_name: '',
      assigner_id: '',
      assigner_name: '',
      priority: 'medium',
      status: 'not_started',
      progress_percent: 0,
      start_date: '',
      due_date: '',
      requires_exec_approval: true,
    },
  });

  const watchType = form.watch('type');
  const watchKpiIds = form.watch('kpi_ids');
  const watchInitIds = form.watch('initiative_ids');

  useEffect(() => {
    if (!open) return;
    if (task) {
      form.reset({
        title: task.title,
        description: task.description || '',
        external_url: task.external_url || '',
        department_id: task.department_id || '',
        type: task.type,
        kpi_ids: task.kpis?.map(k => k.id) || [],
        initiative_ids: task.initiatives?.map(i => i.id) || [],
        owner_id: task.owner_id || '',
        owner_name: task.owner_name || '',
        assigner_id: task.assigner_id || '',
        assigner_name: task.assigner_name || '',
        priority: task.priority,
        status: task.status,
        progress_percent: task.progress_percent,
        start_date: task.start_date || '',
        due_date: task.due_date || '',
        requires_exec_approval: task.requires_exec_approval,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        external_url: '',
        department_id: profile?.department_id || '',
        type: defaultType || 'todo',
        kpi_ids: defaultKpiId ? [defaultKpiId] : [],
        initiative_ids: [],
        owner_id: '',
        owner_name: '',
        assigner_id: user?.id || '',
        assigner_name: '',
        priority: 'medium',
        status: 'not_started',
        progress_percent: 0,
        start_date: '',
        due_date: '',
        requires_exec_approval: true,
      });
    }
  }, [task, form, defaultKpiId, defaultType, open, user?.id]);

  const onSubmit = async (values: TaskFormValues) => {
    try {
      if (isEditing && task) {
        await updateTask({
          id: task.id,
          title: values.title,
          description: values.description,
          external_url: values.external_url || undefined,
          department_id: values.department_id || null,
          type: values.type,
          kpi_ids: values.type === 'kpi_action' ? values.kpi_ids : [],
          initiative_ids: values.initiative_ids,
          owner_id: values.owner_id || null,
          owner_name: values.owner_name || null,
          assigner_id: values.assigner_id || null,
          assigner_name: values.assigner_name || null,
          priority: values.priority,
          status: values.status,
          progress_percent: values.progress_percent,
          start_date: values.start_date || undefined,
          due_date: values.due_date || undefined,
          requires_exec_approval: values.requires_exec_approval,
        });
      } else {
        await createTask({
          title: values.title,
          description: values.description,
          external_url: values.external_url || undefined,
          department_id: values.department_id || null,
          type: values.type,
          kpi_ids: values.type === 'kpi_action' ? values.kpi_ids : [],
          initiative_ids: values.initiative_ids,
          owner_id: values.owner_id || null,
          owner_name: values.owner_name || null,
          assigner_id: values.assigner_id || null,
          assigner_name: values.assigner_name || null,
          priority: values.priority,
          start_date: values.start_date || undefined,
          due_date: values.due_date || undefined,
          requires_exec_approval: values.requires_exec_approval,
        });
      }
      onOpenChange(false);
    } catch (error) {
      // Error handled by mutation
    }
  };

  const toggleKpi = (kpiId: string) => {
    const current = form.getValues('kpi_ids');
    if (current.includes(kpiId)) {
      form.setValue('kpi_ids', current.filter(id => id !== kpiId));
    } else {
      form.setValue('kpi_ids', [...current, kpiId]);
    }
  };

  const removeKpi = (kpiId: string) => {
    const current = form.getValues('kpi_ids');
    form.setValue('kpi_ids', current.filter(id => id !== kpiId));
  };

  const toggleInitiative = (initId: string) => {
    const current = form.getValues('initiative_ids');
    if (current.includes(initId)) {
      form.setValue('initiative_ids', current.filter(id => id !== initId));
    } else {
      form.setValue('initiative_ids', [...current, initId]);
    }
  };

  const removeInitiative = (initId: string) => {
    const current = form.getValues('initiative_ids');
    form.setValue('initiative_ids', current.filter(id => id !== initId));
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? '과제 수정' : '새 과제 추가'}</DialogTitle>
          <DialogDescription>
            {isEditing 
              ? '과제 정보를 수정합니다.'
              : '새로운 과제를 추가합니다.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>유형</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="유형 선택" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="kpi_action">KPI 과제</SelectItem>
                      <SelectItem value="todo">To-Do (지시업무)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchType === 'kpi_action' && (
              <FormField
                control={form.control}
                name="kpi_ids"
                render={() => (
                  <FormItem>
                    <FormLabel>연결 KPI (다중 선택 가능)</FormLabel>
                    <Popover open={kpiPopoverOpen} onOpenChange={setKpiPopoverOpen}>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal h-auto min-h-10"
                          >
                            {watchKpiIds.length === 0 
                              ? <span className="text-muted-foreground">KPI 선택</span>
                              : <span className="text-sm">{watchKpiIds.length}개 선택됨</span>
                            }
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                          {kpis.map((kpi) => (
                            <label
                              key={kpi.id}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
                            >
                              <Checkbox
                                checked={watchKpiIds.includes(kpi.id)}
                                onCheckedChange={() => toggleKpi(kpi.id)}
                              />
                              <span className="truncate">{kpi.name}</span>
                            </label>
                          ))}
                          {kpis.length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">KPI가 없습니다</p>
                          )}
                        </div>
                      </PopoverContent>
                    </Popover>
                    {/* Selected KPI badges */}
                    {watchKpiIds.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {watchKpiIds.map(id => {
                          const kpi = kpis.find(k => k.id === id);
                          return kpi ? (
                            <Badge key={id} variant="secondary" className="text-xs gap-1">
                              {kpi.name}
                              <button
                                type="button"
                                onClick={() => removeKpi(id)}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ) : null;
                        })}
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Initiative selector */}
            <FormField
              control={form.control}
              name="initiative_ids"
              render={() => (
                <FormItem>
                  <FormLabel>연결 이니셔티브 (다중 선택 가능)</FormLabel>
                  <Popover open={initPopoverOpen} onOpenChange={setInitPopoverOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between font-normal h-auto min-h-10"
                        >
                          {watchInitIds.length === 0 
                            ? <span className="text-muted-foreground">이니셔티브 선택</span>
                            : <span className="text-sm">{watchInitIds.length}개 선택됨</span>
                          }
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0" align="start">
                      <div className="max-h-[250px] overflow-y-auto p-2 space-y-1">
                        {initiatives.map((init) => (
                          <label
                            key={init.id}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm hover:bg-accent cursor-pointer text-sm"
                          >
                            <Checkbox
                              checked={watchInitIds.includes(init.id)}
                              onCheckedChange={() => toggleInitiative(init.id)}
                            />
                            <span className="truncate">{init.title}</span>
                          </label>
                        ))}
                        {initiatives.length === 0 && (
                          <p className="text-sm text-muted-foreground text-center py-4">이니셔티브가 없습니다</p>
                        )}
                      </div>
                    </PopoverContent>
                  </Popover>
                  {watchInitIds.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {watchInitIds.map(id => {
                        const init = initiatives.find(i => i.id === id);
                        return init ? (
                          <Badge key={id} variant="secondary" className="text-xs gap-1">
                            {init.title}
                            <button
                              type="button"
                              onClick={() => removeInitiative(id)}
                              className="ml-1 hover:text-destructive"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ) : null;
                      })}
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제목 *</FormLabel>
                  <FormControl>
                    <Input placeholder="과제 제목" {...field} />
                  </FormControl>
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
                  <FormControl>
                    <Textarea 
                      placeholder="과제에 대한 상세 설명"
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


            <FormField
              control={form.control}
              name="external_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>과제 상세 URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com/..."
                      type="url"
                      {...field}
                    />
                  </FormControl>
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
                    <FormLabel>담당자 *</FormLabel>
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

            <FormField
              control={form.control}
              name="assigner_id"
              render={() => {
                const assignerId = form.watch('assigner_id');
                const assignerName = form.watch('assigner_name');
                const isCustom = !assignerId && !!assignerName;
                const value = assignerId || assignerName || '';

                return (
                  <FormItem>
                    <FormLabel>지시자</FormLabel>
                    <FormControl>
                      <MemberCombobox
                        members={members.map(m => ({ id: m.id, label: m.full_name || m.email }))}
                        value={value}
                        isCustom={isCustom}
                        onChange={(val, custom) => {
                          if (custom) {
                            form.setValue('assigner_id', '');
                            form.setValue('assigner_name', val);
                          } else {
                            form.setValue('assigner_id', val);
                            form.setValue('assigner_name', '');
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>우선순위</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="우선순위" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(TASK_PRIORITY_CONFIG).map(([key, config]) => (
                          <SelectItem key={key} value={key}>
                            {config.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {isEditing && (
                <FormField
                  control={form.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>상태</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="상태" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              {config.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {isEditing && (
              <FormField
                control={form.control}
                name="progress_percent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>진척도 ({field.value}%)</FormLabel>
                    <FormControl>
                      <Input 
                        type="range" 
                        min="0" 
                        max="100" 
                        step="5"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>시작일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="due_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>마감일</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              {isEditing && isManager && (
                <Button 
                  type="button" 
                  variant="destructive" 
                  size="sm"
                  className="sm:mr-auto"
                  onClick={() => setDeleteDialogOpen(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </Button>
              )}
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

        {/* Attachments for existing tasks */}
        {isEditing && task && (
          <>
            <Separator className="my-4" />
            <TaskAttachments taskId={task.id} />
          </>
        )}

        {/* Editor Management for existing tasks */}
        {isEditing && task && (
          <>
            <Separator className="my-4" />
            <ItemEditorManager itemType="task" itemId={task.id} />
          </>
        )}

        {/* Approval Actions for existing tasks */}
        {isEditing && task && (
          <>
            <Separator className="my-4" />
            <TaskApprovalActions 
              task={task} 
              onActionComplete={() => onOpenChange(false)}
            />
          </>
        )}
      </DialogContent>
    </Dialog>

    {/* Delete Confirmation - outside Dialog to avoid z-index issues */}
    {isEditing && task && (
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>과제를 삭제하시겠습니까?</AlertDialogTitle>
            <AlertDialogDescription>
              "{task.title}" 과제와 관련 체크인 이력이 모두 삭제됩니다. 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={async () => {
                await deleteTask(task.id);
                setDeleteDialogOpen(false);
                onOpenChange(false);
              }} 
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    )}
    </>
  );
}
