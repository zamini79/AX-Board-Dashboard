import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useUserProfile } from '@/hooks/useUserProfile';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useTaskComments(taskId: string | undefined) {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['task-comments', taskId],
    queryFn: async () => {
      if (!taskId) return [];
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });
      if (error) throw error;

      if (!data || data.length === 0) return [];

      const userIds = [...new Set(data.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);
      const profileMap = Object.fromEntries((profiles || []).map((p) => [p.id, p]));

      return data.map((c) => ({
        ...c,
        author: profileMap[c.user_id] || undefined,
      })) as TaskComment[];
    },
    enabled: !!taskId,
    staleTime: 30_000,
  });

  // Realtime subscription: invalidate query on any INSERT/UPDATE/DELETE
  useEffect(() => {
    if (!taskId) return;

    const channel = supabase
      .channel(`task-comments-${taskId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'task_comments',
          filter: `task_id=eq.${taskId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [taskId, queryClient]);

  const addComment = useMutation({
    mutationFn: async ({ content, mentionedIds }: { content: string; mentionedIds: string[] }) => {
      if (!user?.id || !taskId) throw new Error('로그인이 필요합니다.');
      const { data, error } = await supabase
        .from('task_comments')
        .insert({ task_id: taskId, user_id: user.id, content })
        .select()
        .single();
      if (error) throw error;

      // Send notifications to mentioned users (fire and forget)
      if (mentionedIds.length > 0 && profile?.org_id) {
        const authorName = profile.full_name || profile.email || '누군가';
        const notifications = mentionedIds
          .filter((id) => id !== user.id) // don't notify yourself
          .map((uid) => ({
            user_id: uid,
            org_id: profile.org_id!,
            type: 'task_approved' as const, // reuse closest type; semantically "mention"
            title: `${authorName}님이 댓글에서 회원님을 멘션했습니다`,
            message: content.length > 80 ? content.slice(0, 80) + '…' : content,
            payload: { task_id: taskId, comment_id: data.id, type: 'mention' },
          }));

        if (notifications.length > 0) {
          await supabase.from('notifications').insert(notifications);
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '댓글 등록 실패', description: error.message });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '댓글 삭제 실패', description: error.message });
    },
  });

  const updateComment = useMutation({
    mutationFn: async ({ commentId, content }: { commentId: string; content: string }) => {
      const { error } = await supabase
        .from('task_comments')
        .update({ content, updated_at: new Date().toISOString() })
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task-comments', taskId] });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '댓글 수정 실패', description: error.message });
    },
  });

  return {
    comments: query.data || [],
    isLoading: query.isLoading,
    addComment: (content: string, mentionedIds: string[] = []) =>
      addComment.mutateAsync({ content, mentionedIds }),
    deleteComment: deleteComment.mutateAsync,
    updateComment: (commentId: string, content: string) =>
      updateComment.mutateAsync({ commentId, content }),
    isAdding: addComment.isPending,
    isUpdating: updateComment.isPending,
  };
}
