import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface KpiAttachment {
  id: string;
  kpi_id: string;
  description: string | null;
  file_name: string | null;
  file_url: string | null;
  file_size: number | null;
  created_by: string | null;
  created_at: string;
}

export function useKpiAttachments(kpiId: string | undefined) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['kpi-attachments', kpiId],
    queryFn: async () => {
      if (!kpiId) return [];
      const { data, error } = await supabase
        .from('kpi_attachments')
        .select('*')
        .eq('kpi_id', kpiId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const attachments = (data || []) as KpiAttachment[];
      const withSignedUrls = await Promise.all(
        attachments.map(async (att) => {
          if (att.file_url && !att.file_url.startsWith('http')) {
            const { data: urlData } = await supabase.storage
              .from('task-files')
              .createSignedUrl(att.file_url, 3600);
            return { ...att, file_url: urlData?.signedUrl || att.file_url };
          }
          if (att.file_url && att.file_url.includes('/task-files/')) {
            const pathParts = att.file_url.split('/task-files/');
            if (pathParts[1]) {
              const filePath = decodeURIComponent(pathParts[1]);
              const { data: urlData } = await supabase.storage
                .from('task-files')
                .createSignedUrl(filePath, 3600);
              return { ...att, file_url: urlData?.signedUrl || att.file_url };
            }
          }
          return att;
        })
      );
      return withSignedUrls;
    },
    enabled: !!kpiId,
  });

  const addAttachment = useMutation({
    mutationFn: async ({
      kpiId,
      description,
      file,
    }: {
      kpiId: string;
      description?: string;
      file?: File;
    }) => {
      if (!user?.id) throw new Error('로그인이 필요합니다.');

      let file_name: string | null = null;
      let file_url: string | null = null;
      let file_size: number | null = null;

      if (file) {
        file_name = file.name;
        file_size = file.size;
        const filePath = `kpi/${kpiId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('task-files')
          .upload(filePath, file);
        if (uploadError) throw uploadError;

        // Store the file path (not a signed URL) so we can generate fresh signed URLs on read
        file_url = filePath;
      }

      const { data, error } = await supabase
        .from('kpi_attachments')
        .insert({
          kpi_id: kpiId,
          description: description || null,
          file_name,
          file_url,
          file_size,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-attachments', kpiId] });
      toast({ title: '참고자료 추가 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '참고자료 추가 실패', description: error.message });
    },
  });

  const deleteAttachment = useMutation({
    mutationFn: async (attachmentId: string) => {
      const { data: attachment } = await supabase
        .from('kpi_attachments')
        .select('*')
        .eq('id', attachmentId)
        .single();

      if (attachment?.file_url) {
        let storagePath = attachment.file_url;
        if (storagePath.startsWith('http')) {
          const url = new URL(storagePath);
          const pathParts = url.pathname.split('/task-files/');
          storagePath = pathParts[1] ? decodeURIComponent(pathParts[1]) : '';
        }
        if (storagePath) {
          await supabase.storage.from('task-files').remove([storagePath]);
        }
      }

      const { error } = await supabase
        .from('kpi_attachments')
        .delete()
        .eq('id', attachmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kpi-attachments', kpiId] });
      toast({ title: '참고자료 삭제 완료' });
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
