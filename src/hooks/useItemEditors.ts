import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { toast } from 'sonner';

export interface ItemEditor {
  id: string;
  org_id: string;
  item_type: string;
  item_id: string;
  user_id: string;
  granted_by: string;
  created_at: string;
  // joined
  profile?: {
    id: string;
    full_name: string | null;
    email: string;
    avatar_url: string | null;
  };
}

export function useItemEditors(itemType: string, itemId: string | undefined) {
  const { profile } = useUserProfile();
  const queryClient = useQueryClient();
  const queryKey = ['item-editors', itemType, itemId];

  const { data: editors = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      if (!itemId) return [];
      const { data, error } = await supabase
        .from('item_editors')
        .select('*')
        .eq('item_type', itemType)
        .eq('item_id', itemId);

      if (error) throw error;

      // fetch profiles for editors
      const userIds = (data || []).map(e => e.user_id);
      if (userIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, email, avatar_url')
        .in('id', userIds);

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return (data || []).map(e => ({
        ...e,
        profile: profileMap.get(e.user_id) || undefined,
      })) as ItemEditor[];
    },
    enabled: !!itemId,
  });

  const addEditor = useMutation({
    mutationFn: async (userId: string) => {
      if (!itemId || !profile?.org_id) throw new Error('Missing context');
      const { error } = await supabase.from('item_editors').insert({
        org_id: profile.org_id,
        item_type: itemType,
        item_id: itemId,
        user_id: userId,
        granted_by: profile.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('편집자가 추가되었습니다.');
    },
    onError: (err: any) => {
      if (err?.code === '23505') {
        toast.error('이미 편집자로 등록된 사용자입니다.');
      } else {
        toast.error('편집자 추가에 실패했습니다.');
      }
    },
  });

  const removeEditor = useMutation({
    mutationFn: async (editorId: string) => {
      const { error } = await supabase
        .from('item_editors')
        .delete()
        .eq('id', editorId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success('편집자가 제거되었습니다.');
    },
    onError: () => {
      toast.error('편집자 제거에 실패했습니다.');
    },
  });

  return {
    editors,
    isLoading,
    addEditor: addEditor.mutate,
    removeEditor: removeEditor.mutate,
    isAdding: addEditor.isPending,
    isRemoving: removeEditor.isPending,
  };
}
