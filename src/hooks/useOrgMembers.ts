import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Profile } from '@/types/database';

export interface OrgMember extends Profile {
  user_role?: 'admin' | 'ceo' | 'owner' | 'editor' | null;
}

export function useOrgMembers() {
  const { profile } = useUserProfile();

  return useQuery({
    queryKey: ['org-members', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];

      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('full_name');

      if (error) throw error;

      // Fetch roles separately to avoid complex joins
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', profile.org_id);

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);

      return (profiles as Profile[]).map(p => ({
        ...p,
        user_role: roleMap.get(p.id) || null,
      })) as OrgMember[];
    },
    enabled: !!profile?.org_id,
  });
}
