import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Sparkles } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Listen for the PASSWORD_RECOVERY event from the auth link
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsReady(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast({ variant: 'destructive', title: '오류', description: '비밀번호는 최소 6자 이상이어야 합니다.' });
      return;
    }
    if (password !== confirmPassword) {
      toast({ variant: 'destructive', title: '오류', description: '비밀번호가 일치하지 않습니다.' });
      return;
    }

    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setIsLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: '비밀번호 변경 실패', description: error.message });
    } else {
      toast({ title: '비밀번호 변경 완료', description: '새 비밀번호로 로그인해주세요.' });
      await supabase.auth.signOut();
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex justify-end p-4">
        <ThemeToggle />
      </div>
      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md border-0 shadow-elevated-lg bg-card">
          <CardHeader className="text-center space-y-4 pb-2">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold tracking-tight">비밀번호 재설정</CardTitle>
              <CardDescription className="mt-2 text-base">
                {isReady ? '새 비밀번호를 입력해주세요.' : '인증 확인 중...'}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {isReady ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="text-sm font-medium">새 비밀번호</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="최소 6자 이상"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="text-sm font-medium">비밀번호 확인</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="비밀번호를 다시 입력"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="h-11"
                  />
                </div>
                <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  비밀번호 변경
                </Button>
              </form>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
