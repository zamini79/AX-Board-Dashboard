import { useState, useEffect } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { DepartmentTree } from '@/components/department/DepartmentTree';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, User, Loader2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useDepartments } from '@/hooks/useDepartments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

export default function Settings() {
  const { profile } = useUserProfile();
  const { flatTreeDepartments } = useDepartments();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState('');
  const [title, setTitle] = useState('');
  const [deptId, setDeptId] = useState('none');

  // Sync form when profile loads (useEffect so it runs after async fetch)
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setTitle(profile.title || '');
      setDeptId(profile.department_id || 'none');
    }
  }, [profile?.id]);

  const { data: org } = useQuery({
    queryKey: ['organization', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return null;
      const { data, error } = await supabase
        .from('organizations')
        .select('name, description')
        .eq('id', profile.org_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id,
    staleTime: Infinity,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id) return;
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim() || null,
          title: title.trim() || null,
          department_id: deptId === 'none' ? null : deptId,
        })
        .eq('id', profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      toast.success('프로필이 저장되었습니다.');
    },
    onError: () => {
      toast.error('저장에 실패했습니다. 다시 시도해주세요.');
    },
  });

  const initials = (profile?.full_name || profile?.email || 'U').slice(0, 2).toUpperCase();

  return (
    <AppLayout title="설정" description="개인 프로필 및 조직 구조를 관리합니다.">
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile" className="gap-1.5">
            <User className="h-3.5 w-3.5" />
            내 프로필
          </TabsTrigger>
          <TabsTrigger value="departments" className="gap-1.5">
            <Building2 className="h-3.5 w-3.5" />
            조직 구조
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="mt-4">
          <Card className="max-w-lg">
            <CardHeader className="pb-3">
              <CardTitle>내 프로필</CardTitle>
              <CardDescription>이름, 직책, 소속 부서를 수정할 수 있습니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="text-lg bg-primary/10 text-primary font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{profile?.full_name || '이름 미설정'}</p>
                  <p className="text-sm text-muted-foreground">{profile?.email}</p>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <Label htmlFor="full-name">이름</Label>
                <Input
                  id="full-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="홍길동"
                />
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="job-title">직책</Label>
                <Input
                  id="job-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 이사, 팀장, 부장"
                />
              </div>

              {/* Department */}
              <div className="space-y-1.5">
                <Label>소속 부서</Label>
                <Select value={deptId} onValueChange={setDeptId}>
                  <SelectTrigger>
                    <SelectValue placeholder="부서를 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">선택 안 함</SelectItem>
                    {flatTreeDepartments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {'　'.repeat(d.depth || 0)}{d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={() => updateProfileMutation.mutate()}
                disabled={updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                )}
                저장
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Departments Tab */}
        <TabsContent value="departments" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle>부서 관리</CardTitle>
              {org && (
                <CardDescription>
                  <strong>{org.name}</strong> 조직의 부서 계층을 관리합니다. 최상위에 회사명 → 본부 → 실 → 팀 순서로 구성하세요.
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <DepartmentTree />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
}
