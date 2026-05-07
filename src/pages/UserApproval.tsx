import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Clock, UserCheck, Plus, Trash2, Upload, Download, Users, Pencil, Save } from 'lucide-react';
import { type AppRole } from '@/types/database';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  ceo: 'CEO',
  owner: 'Owner',
  editor: 'Editor',
};

interface BulkUserRow {
  id: string;
  full_name: string;
  email: string;
  role: string;
  title: string;
  department: string;
}

function createEmptyRow(): BulkUserRow {
  return { id: crypto.randomUUID(), full_name: '', email: '', role: '', title: '', department: '' };
}

export default function UserApproval() {
  const { profile, isAdmin, canManageUsers } = useUserProfile();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Bulk registration state
  const [bulkRows, setBulkRows] = useState<BulkUserRow[]>([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitProgress, setSubmitProgress] = useState(0);
  const [submitResults, setSubmitResults] = useState<{ email: string; success: boolean; error?: string }[] | null>(null);

  // Pending approval state
  const [pendingSelections, setPendingSelections] = useState<Record<string, { role: string; title: string; department: string }>>({});

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['pending-users', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('org_id', profile.org_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id && canManageUsers,
  });

  // Fetch roles for approved users
  const { data: userRoles = [] } = useQuery({
    queryKey: ['user-roles', profile?.org_id],
    queryFn: async () => {
      if (!profile?.org_id) return [];
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .eq('org_id', profile.org_id);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.org_id && canManageUsers,
  });

  const roleMap = new Map(userRoles.map(r => [r.user_id, r.role]));

  const approveMutation = useMutation({
    mutationFn: async ({ userId, approved, role, title, department }: { userId: string; approved: boolean; role?: string; title?: string; department?: string }) => {
      const profileUpdate: Record<string, unknown> = { is_approved: approved };
      if (department !== undefined) profileUpdate.department = department || null;
      if (title !== undefined) profileUpdate.title = title || null;
      if (!approved) {
        profileUpdate.department = null;
        profileUpdate.title = null;
      }

      const { error } = await supabase
        .from('profiles')
        .update(profileUpdate)
        .eq('id', userId);
      if (error) throw error;

      if (approved && role && profile?.org_id) {
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, org_id: profile.org_id, role: role as AppRole });
        if (roleError) throw roleError;
      }

      // When revoking approval, also delete the user's role
      if (!approved && profile?.org_id) {
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('org_id', profile.org_id);
      }
    },
    onSuccess: (_, { approved }) => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      toast({
        title: approved ? '승인 완료' : '승인 취소',
        description: approved ? '사용자가 승인되었습니다.' : '사용자의 승인이 취소되었습니다.',
      });
    },
  });

  // Inline edit state for approved users
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, role, title, department }: { userId: string; role: string; title: string; department: string }) => {
      if (!profile?.org_id) throw new Error('조직 정보 없음');

      // Update title & department on profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ title: title || null, department: department || null })
        .eq('id', userId);
      if (profileError) throw new Error(`프로필 업데이트 실패: ${profileError.message}`);

      // Update role using UPDATE (not delete+insert to avoid losing own role during self-edit)
      const { error: roleError } = await supabase
        .from('user_roles')
        .update({ role: role as AppRole })
        .eq('user_id', userId)
        .eq('org_id', profile.org_id);

      if (roleError) {
        // If no existing role row, fall back to insert
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert({ user_id: userId, org_id: profile.org_id, role: role as AppRole });
        if (insertError) throw new Error(`역할 부여 실패: ${insertError.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['user-roles'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });
      setEditingUserId(null);
      toast({ title: '사용자 정보 수정 완료' });
    },
    onError: (error) => {
      toast({ variant: 'destructive', title: '수정 실패', description: error.message });
    },
  });

  // Bulk registration
  const handleBulkRowChange = useCallback((id: string, field: keyof BulkUserRow, value: string) => {
    setBulkRows(prev => prev.map(row => row.id === id ? { ...row, [field]: value } : row));
  }, []);

  const addBulkRow = () => setBulkRows(prev => [...prev, createEmptyRow()]);
  const removeBulkRow = (id: string) => setBulkRows(prev => prev.length > 1 ? prev.filter(r => r.id !== id) : prev);

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      const lines = text.split('\n').filter(l => l.trim());
      const dataLines = lines.slice(1);

      const rows: BulkUserRow[] = dataLines.map(line => {
        const parts = line.split(',').map(s => s.trim());
        const [full_name = '', email = '', role = '', title = '', department = ''] = parts;
        return { id: crypto.randomUUID(), full_name, email, role: role.toLowerCase(), title, department };
      }).filter(r => r.email);

      if (rows.length > 0) {
        setBulkRows(rows);
        toast({ title: 'CSV 파싱 완료', description: `${rows.length}명의 데이터를 불러왔습니다.` });
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const downloadTemplate = () => {
    const csv = '이름,이메일,역할,직급,부서명\n홍길동,hong@company.com,owner,부장,경영기획본부\n김철수,kim@company.com,editor,대리,영업1팀\n';
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bulk_users_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkSubmit = async () => {
    const validRows = bulkRows.filter(r => r.email && r.full_name && r.role);
    if (validRows.length === 0) {
      toast({ title: '오류', description: '유효한 사용자 정보를 입력해주세요.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    setSubmitProgress(10);
    setSubmitResults(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('로그인이 필요합니다.');

      setSubmitProgress(30);

      const response = await supabase.functions.invoke('bulk-invite-users', {
        body: {
          users: validRows.map(r => ({
            email: r.email,
            full_name: r.full_name,
            role: r.role,
            title: r.title,
            department: r.department,
          })),
        },
      });

      setSubmitProgress(90);

      if (response.error) throw response.error;

      const result = response.data as { results: { email: string; success: boolean; error?: string }[]; successCount: number; failCount: number };
      setSubmitResults(result.results);
      setSubmitProgress(100);

      queryClient.invalidateQueries({ queryKey: ['pending-users'] });
      queryClient.invalidateQueries({ queryKey: ['org-members'] });

      toast({
        title: '일괄 등록 완료',
        description: `성공 ${result.successCount}명, 실패 ${result.failCount}명`,
      });

      if (result.successCount > 0) {
        setBulkRows([createEmptyRow(), createEmptyRow(), createEmptyRow()]);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : '일괄 등록 중 오류가 발생했습니다.';
      toast({ title: '오류', description: message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingUsers = users.filter((u) => !u.is_approved);
  const approvedUsers = users.filter((u) => u.is_approved);

  if (!canManageUsers) {
    return (
      <AppLayout title="사용자 승인">
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          관리자 권한이 필요합니다.
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="사용자 관리" description="사용자 승인, 일괄 등록 및 역할/부서 관리">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            사용자 관리
          </CardTitle>
          <CardDescription>
            승인 대기 {pendingUsers.length}명 · 승인됨 {approvedUsers.length}명
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending">
            <TabsList className="mb-4">
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                대기 ({pendingUsers.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" />
                승인됨 ({approvedUsers.length})
              </TabsTrigger>
              <TabsTrigger value="bulk" className="gap-1.5">
                <Users className="h-3.5 w-3.5" />
                일괄 등록
              </TabsTrigger>
            </TabsList>

            {/* Pending Tab */}
            <TabsContent value="pending" className="space-y-2">
              {pendingUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">승인 대기 중인 사용자가 없습니다.</p>
              ) : (
                pendingUsers.map((u) => {
                  const sel = pendingSelections[u.id] || { role: '', title: '', department: '' };
                  const canApprove = !!sel.role;
                  return (
                    <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {u.full_name?.slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || '이름 없음'}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Select
                          value={sel.role || 'none'}
                          onValueChange={(v) => setPendingSelections(prev => ({ ...prev, [u.id]: { ...sel, role: v === 'none' ? '' : v } }))}
                        >
                          <SelectTrigger className="w-[130px] h-9">
                            <SelectValue placeholder="역할 선택" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none" disabled>역할 선택</SelectItem>
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Input
                          value={sel.title}
                          onChange={(e) => setPendingSelections(prev => ({ ...prev, [u.id]: { ...sel, title: e.target.value } }))}
                          placeholder="직급"
                          className="w-[100px] h-9"
                        />
                        <Input
                          value={sel.department}
                          onChange={(e) => setPendingSelections(prev => ({ ...prev, [u.id]: { ...sel, department: e.target.value } }))}
                          placeholder="부서명"
                          className="w-[140px] h-9"
                        />
                        <Button
                          size="sm"
                          onClick={() => approveMutation.mutate({ userId: u.id, approved: true, role: sel.role, title: sel.title, department: sel.department })}
                          disabled={!canApprove || approveMutation.isPending}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          승인
                        </Button>
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Approved Tab */}
            <TabsContent value="approved" className="space-y-2">
              {approvedUsers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">승인된 사용자가 없습니다.</p>
              ) : (
                approvedUsers.map((u) => {
                  const isEditing = editingUserId === u.id;
                  const currentRole = roleMap.get(u.id) || '';

                  return (
                    <div key={u.id} className="flex items-center justify-between py-3 px-4 rounded-lg border bg-card gap-3 flex-wrap">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-10 w-10 shrink-0">
                          <AvatarImage src={u.avatar_url || ''} />
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {u.full_name?.slice(0, 2) || 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{u.full_name || '이름 없음'}</p>
                          <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {isEditing ? (
                          <>
                            <Select value={editRole} onValueChange={setEditRole}>
                              <SelectTrigger className="w-[130px] h-9">
                                <SelectValue placeholder="역할" />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                  <SelectItem key={k} value={k}>{v}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <Input
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              placeholder="직급"
                              className="w-[100px] h-9"
                            />
                            <Input
                              value={editDept}
                              onChange={(e) => setEditDept(e.target.value)}
                              placeholder="부서명"
                              className="w-[140px] h-9"
                            />
                            <Button
                              size="sm"
                              onClick={() => updateUserMutation.mutate({ userId: u.id, role: editRole, title: editTitle, department: editDept })}
                              disabled={!editRole || updateUserMutation.isPending}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              저장
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingUserId(null)}>
                              취소
                            </Button>
                          </>
                        ) : (
                          <>
                            <Badge variant="outline" className="text-xs">
                              {ROLE_LABELS[currentRole] || '역할 없음'}
                            </Badge>
                            {u.title && (
                              <Badge variant="secondary" className="text-xs">
                                {u.title}
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-xs">
                              {u.department || '부서 미지정'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingUserId(u.id);
                                setEditRole(currentRole);
                                setEditTitle(u.title || '');
                                setEditDept(u.department || '');
                              }}
                            >
                              <Pencil className="h-4 w-4 mr-1" />
                              수정
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => approveMutation.mutate({ userId: u.id, approved: false })}
                              disabled={approveMutation.isPending}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              승인 취소
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </TabsContent>

            {/* Bulk Registration Tab */}
            <TabsContent value="bulk" className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-1" />
                    CSV 템플릿
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                    <Upload className="h-4 w-4 mr-1" />
                    CSV 업로드
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleCsvUpload}
                  />
                </div>
                <Button size="sm" onClick={addBulkRow}>
                  <Plus className="h-4 w-4 mr-1" />
                  행 추가
                </Button>
              </div>

              <div className="border rounded-lg overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[160px]">이름</TableHead>
                      <TableHead className="w-[200px]">이메일</TableHead>
                      <TableHead className="w-[130px]">역할</TableHead>
                      <TableHead className="w-[100px]">직급</TableHead>
                      <TableHead className="w-[140px]">부서명</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="p-2">
                          <Input
                            value={row.full_name}
                            onChange={(e) => handleBulkRowChange(row.id, 'full_name', e.target.value)}
                            placeholder="홍길동"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            type="email"
                            value={row.email}
                            onChange={(e) => handleBulkRowChange(row.id, 'email', e.target.value)}
                            placeholder="hong@company.com"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Select
                            value={row.role || 'none'}
                            onValueChange={(v) => handleBulkRowChange(row.id, 'role', v === 'none' ? '' : v)}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="역할" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none" disabled>역할</SelectItem>
                              {Object.entries(ROLE_LABELS).map(([k, v]) => (
                                <SelectItem key={k} value={k}>{v}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={row.title}
                            onChange={(e) => handleBulkRowChange(row.id, 'title', e.target.value)}
                            placeholder="부장"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Input
                            value={row.department}
                            onChange={(e) => handleBulkRowChange(row.id, 'department', e.target.value)}
                            placeholder="경영기획본부"
                            className="h-9"
                          />
                        </TableCell>
                        <TableCell className="p-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9"
                            onClick={() => removeBulkRow(row.id)}
                            disabled={bulkRows.length <= 1}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {isSubmitting && (
                <div className="space-y-2">
                  <Progress value={submitProgress} className="h-2" />
                  <p className="text-sm text-muted-foreground text-center">등록 처리 중...</p>
                </div>
              )}

              {submitResults && (
                <div className="space-y-2 p-4 border rounded-lg bg-muted/30">
                  <p className="text-sm font-medium">
                    결과: 성공 {submitResults.filter(r => r.success).length}명 / 실패 {submitResults.filter(r => !r.success).length}명
                  </p>
                  {submitResults.filter(r => !r.success).map((r, i) => (
                    <p key={i} className="text-xs text-destructive">
                      {r.email}: {r.error}
                    </p>
                  ))}
                </div>
              )}

              <Button
                onClick={handleBulkSubmit}
                disabled={isSubmitting || bulkRows.every(r => !r.email)}
                className="w-full"
              >
                <Users className="h-4 w-4 mr-2" />
                일괄 등록 ({bulkRows.filter(r => r.email && r.full_name && r.role).length}명)
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </AppLayout>
  );
}
