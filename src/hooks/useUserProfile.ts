import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface Profile {
  id: string;
  org_id: string | null;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  title: string | null;
  department: string | null;
  department_id: string | null;
}

interface UserRole {
  role: 'admin' | 'ceo' | 'owner' | 'editor';
  org_id: string;
}

export function useUserProfile() {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      return profileData as Profile;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  const roleQuery = useQuery({
    queryKey: ['userRole', user?.id, profileQuery.data?.org_id],
    queryFn: async () => {
      if (!user || !profileQuery.data?.org_id) return null;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role, org_id')
        .eq('user_id', user.id)
        .eq('org_id', profileQuery.data.org_id)
        .single();

      if (roleError) return null;
      return roleData as UserRole;
    },
    enabled: !!user && !!profileQuery.data?.org_id,
    staleTime: Infinity,
  });

  const profile = profileQuery.data || null;
  const role = roleQuery.data || null;
  const loading = profileQuery.isLoading;
  const error = profileQuery.error as Error | null;

  const isAdmin = role?.role === 'admin';
  const isCeo = role?.role === 'ceo' || isAdmin;
  const isOwnerRole = role?.role === 'owner';
  const isManager = isAdmin || isCeo; // Admin 또는 CEO: 전사 콘텐츠 접근
  const isOwnerOrAbove = isManager || isOwnerRole; // Owner 이상: 생성 가능
  const canManageUsers = isAdmin; // Admin만: 사용자/부서 관리
  const canApprove = isManager || isOwnerRole; // Admin, CEO, Owner: 승인 가능

  // Legacy aliases for backward compatibility
  const isExecutive = isCeo;
  const isCosPmo = isAdmin;

  return { 
    profile, 
    role, 
    loading, 
    error,
    isAdmin,
    isCeo,
    isOwnerRole,
    isManager,
    isOwnerOrAbove,
    canManageUsers,
    canApprove,
    // Legacy
    isExecutive,
    isCosPmo,
  };
}
