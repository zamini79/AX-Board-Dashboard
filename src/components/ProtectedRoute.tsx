import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { DashboardSkeleton } from '@/components/LoadingSkeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();

  const { data: isApproved, isLoading: approvalLoading } = useQuery({
    queryKey: ['user-approved', user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from('profiles')
        .select('is_approved')
        .eq('id', user.id)
        .single();
      return data?.is_approved ?? false;
    },
    enabled: !!user,
    staleTime: Infinity,
  });

  if (loading || (user && approvalLoading)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="text-center max-w-md space-y-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold">승인 대기 중</h2>
          <p className="text-muted-foreground">
            관리자의 승인을 받은 후 서비스를 이용할 수 있습니다.<br />
            승인이 완료되면 다시 로그인해주세요.
          </p>
          <button
            onClick={async () => {
              const { signOut } = await import('@/contexts/AuthContext').then(() => {
                // Force sign out via supabase directly
                return { signOut: () => supabase.auth.signOut() };
              });
              await signOut();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
