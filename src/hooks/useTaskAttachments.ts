import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TaskAttachment {
  id: string;
  task_id: string;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

export function useTaskAttachments(taskId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-attachments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_attachments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []) as TaskAttachment[];
    },
    enabled: !!taskId,
  });

  const addAttachment = useMutation({
    mutationFn: async ({
      taskId,
      description,
      linkUrl,
    }: {
      taskId: string;
      description?: string;
      linkUrl?: string;
    }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다.');

      const { data, error } = await supabase
        .from('task_attachments')
        .insert({
          task_id: taskId,
          description: description || null,
          file_name: null,
          file_url: linkUrl || null,
          file_size: null,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast({ title: '첨부 추가 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '첨부 추가 실패', description: error.message });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { error } = await supabase
        .from('task_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-attachments', taskId] });
      toast({ title: '첨부 삭제 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '삭제 실패', description: error.message });
    },
  });

  return {
    attachments: query.data || [],
    isLoading: query.isLoading,
    addAttachment: addAttachment.mutateAsync,
    deleteAttachment: deleteAttachment.mutateAsync,
    isAdding: addAttachment.isPending,
    isDeleting: deleteAttachment.isPending,
  };
}
