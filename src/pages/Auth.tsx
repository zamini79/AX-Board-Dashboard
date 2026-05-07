import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { Loader2, Sparkles, Shield, TrendingUp, CheckSquare, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const emailSchema = z.string().email('올바른 이메일 주소를 입력해주세요');
const passwordSchema = z.string().min(6, '비밀번호는 최소 6자 이상이어야 합니다');
const nameSchema = z.string().min(2, '이름은 최소 2자 이상이어야 합니다');

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupName, setSignupName] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [isResetting, setIsResetting] = useState(false);

  // Magic link state
  const [otpEmail, setOtpEmail] = useState('');
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const { signIn, signUp, signOut, sendOtp, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);


  const validateField = (field: string, value: string, schema: z.ZodString) => {
    try {
      schema.parse(value);
      setErrors((prev) => ({ ...prev, [field]: '' }));
      return true;
    } catch (e) {
      if (e instanceof z.ZodError) {
        setErrors((prev) => ({ ...prev, [field]: e.errors[0].message }));
      }
      return false;
    }
  };

  const checkApproval = async () => {
    const { data: profileData } = await supabase
      .from('profiles')
      .select('is_approved')
      .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
      .single();

    if (!profileData?.is_approved) {
      await signOut();
      toast({
        variant: 'destructive',
        title: '승인 대기 중',
        description: '관리자의 승인을 받은 후 로그인할 수 있습니다.',
      });
      return false;
    }
    return true;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailValid = validateField('loginEmail', loginEmail, emailSchema);
    const passwordValid = validateField('loginPassword', loginPassword, passwordSchema);
    if (!emailValid || !passwordValid) return;

    setIsLoading(true);
    const { error } = await signIn(loginEmail, loginPassword);
    setIsLoading(false);

    if (error) {
      let message = '로그인에 실패했습니다.';
      if (error.message.includes('Invalid login credentials')) {
        message = '이메일 또는 비밀번호가 올바르지 않습니다.';
      } else if (error.message.includes('Email not confirmed')) {
        message = '이메일 인증이 필요합니다. 이메일을 확인해주세요.';
      }
      toast({ variant: 'destructive', title: '로그인 실패', description: message });
    } else {
      const approved = await checkApproval();
      if (approved) {
        toast({ title: '로그인 성공', description: '환영합니다!' });
      }
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameValid = validateField('signupName', signupName, nameSchema);
    const emailValid = validateField('signupEmail', signupEmail, emailSchema);
    const passwordValid = validateField('signupPassword', signupPassword, passwordSchema);
    if (!nameValid || !emailValid || !passwordValid) return;

    setIsLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName);
    setIsLoading(false);

    if (error) {
      let message = '회원가입에 실패했습니다.';
      if (error.message.includes('already registered')) {
        message = '이미 등록된 이메일입니다.';
      }
      toast({ variant: 'destructive', title: '회원가입 실패', description: message });
    } else {
      toast({ title: '회원가입 성공', description: '이메일 인증 링크를 확인해주세요.' });
    }
  };

  const handleSendMagicLink = async () => {
    if (!validateField('otpEmail', otpEmail, emailSchema)) return;

    setIsLoading(true);
    const { error } = await sendOtp(otpEmail);
    setIsLoading(false);

    if (error) {
      toast({ variant: 'destructive', title: '발송 실패', description: '로그인 링크 발송에 실패했습니다. 가입된 이메일인지 확인해주세요.' });
    } else {
      setMagicLinkSent(true);
      toast({ title: '로그인 링크 발송', description: '이메일에서 로그인 링크를 클릭해주세요.' });
    }
  };

  const handleResetPassword = async () => {
    if (!resetEmail) {
      toast({ variant: 'destructive', title: '오류', description: '이메일을 입력해주세요.' });
      return;
    }
    setIsResetting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setIsResetting(false);
    if (error) {
      toast({ variant: 'destructive', title: '오류', description: error.message });
    } else {
      toast({ title: '이메일 발송 완료', description: '비밀번호 재설정 링크를 이메일로 보냈습니다.' });
      setResetDialogOpen(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary to-primary/80" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-primary-foreground">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-foreground/20 backdrop-blur">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="text-xl font-bold">AXBoard</span>
          </div>
          
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold leading-tight mb-4">
                임원을 위한<br />
                스마트 대시보드
              </h1>
              <p className="text-lg text-primary-foreground/80">
                1분 안에 모든 핵심 지표를 파악하세요
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">실시간 KPI 모니터링</p>
                  <p className="text-sm text-primary-foreground/70">핵심 지표를 한눈에</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <CheckSquare className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">과제 및 승인 관리</p>
                  <p className="text-sm text-primary-foreground/70">업무 흐름을 효율적으로</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/10">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium">보안 및 역할 기반 접근</p>
                  <p className="text-sm text-primary-foreground/70">안전한 데이터 관리</p>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-primary-foreground/60">
            © 2025 AXBoard. All rights reserved.
          </p>
        </div>
        
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-primary-foreground/5" />
        <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary-foreground/5" />
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col">
        <div className="flex justify-end p-4">
          <ThemeToggle />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="w-full max-w-md border-0 shadow-elevated-lg bg-card">
            <CardHeader className="text-center space-y-4 pb-2">
              <div className="lg:hidden mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold tracking-tight">
                  <span className="lg:hidden">AXBoard</span>
                  <span className="hidden lg:inline">환영합니다</span>
                </CardTitle>
                <CardDescription className="mt-2 text-base">
                  계정에 로그인하거나 새로 가입하세요
                </CardDescription>
              </div>
            </CardHeader>
            
            <CardContent className="pt-4">
              <Tabs defaultValue="login" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="login" className="text-sm font-medium">로그인</TabsTrigger>
                  <TabsTrigger value="otp" className="text-sm font-medium">이메일 인증</TabsTrigger>
                  <TabsTrigger value="signup" className="text-sm font-medium">신규 가입</TabsTrigger>
                </TabsList>
                
                {/* Password Login Tab */}
                <TabsContent value="login">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email" className="text-sm font-medium">이메일</Label>
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="name@company.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.loginEmail && <p className="text-sm text-destructive">{errors.loginEmail}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="login-password" className="text-sm font-medium">비밀번호</Label>
                      <Input
                        id="login-password"
                        type="password"
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.loginPassword && <p className="text-sm text-destructive">{errors.loginPassword}</p>}
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      로그인
                    </Button>
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => { setResetEmail(loginEmail); setResetDialogOpen(true); }}
                        className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors"
                      >
                        비밀번호를 잊으셨나요?
                      </button>
                    </div>
                  </form>
                </TabsContent>

                {/* Magic Link Login Tab */}
                <TabsContent value="otp">
                  {!magicLinkSent ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="otp-email" className="text-sm font-medium">이메일</Label>
                        <Input
                          id="otp-email"
                          type="email"
                          placeholder="name@company.com"
                          value={otpEmail}
                          onChange={(e) => setOtpEmail(e.target.value)}
                          disabled={isLoading}
                          className="h-11"
                        />
                        {errors.otpEmail && <p className="text-sm text-destructive">{errors.otpEmail}</p>}
                      </div>
                      <Button onClick={handleSendMagicLink} className="w-full h-11 font-medium" disabled={isLoading}>
                        {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                        로그인 링크 발송
                      </Button>
                      <p className="text-center text-xs text-muted-foreground">
                        가입된 이메일로 로그인 링크를 보내드립니다
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="text-center space-y-3">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <Mail className="h-8 w-8" />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-medium text-foreground">이메일을 확인해주세요</p>
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{otpEmail}</span> 으로<br />
                            로그인 링크를 발송했습니다
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          이메일의 링크를 클릭하면 자동으로 로그인됩니다.<br />
                          스팸 폴더도 확인해주세요.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setMagicLinkSent(false)}
                        className="w-full h-11 font-medium"
                      >
                        다른 이메일로 시도
                      </Button>
                      <button
                        type="button"
                        onClick={handleSendMagicLink}
                        className="text-sm text-muted-foreground hover:text-primary underline-offset-4 hover:underline transition-colors mx-auto block"
                      >
                        링크 재발송
                      </button>
                    </div>
                  )}
                </TabsContent>
                
                {/* Signup Tab */}
                <TabsContent value="signup">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name" className="text-sm font-medium">이름</Label>
                      <Input
                        id="signup-name"
                        type="text"
                        placeholder="홍길동"
                        value={signupName}
                        onChange={(e) => setSignupName(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.signupName && <p className="text-sm text-destructive">{errors.signupName}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">이메일</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder="name@company.com"
                        value={signupEmail}
                        onChange={(e) => setSignupEmail(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.signupEmail && <p className="text-sm text-destructive">{errors.signupEmail}</p>}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">비밀번호</Label>
                      <Input
                        id="signup-password"
                        type="password"
                        placeholder="최소 6자 이상"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        disabled={isLoading}
                        className="h-11"
                      />
                      {errors.signupPassword && <p className="text-sm text-destructive">{errors.signupPassword}</p>}
                    </div>
                    <Button type="submit" className="w-full h-11 font-medium" disabled={isLoading}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      회원가입
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="pt-4">
              <p className="w-full text-center text-xs text-muted-foreground">
                계속 진행하면 서비스 약관 및 개인정보 처리방침에 동의하는 것으로 간주됩니다.
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>

      {/* Password Reset Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>비밀번호 찾기</DialogTitle>
            <DialogDescription>가입한 이메일 주소를 입력하면 비밀번호 재설정 링크를 보내드립니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="reset-email">이메일</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="name@company.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={isResetting}
                className="h-11"
              />
            </div>
            <Button onClick={handleResetPassword} className="w-full h-11" disabled={isResetting}>
              {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              재설정 링크 보내기
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
