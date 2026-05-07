import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, RefreshCw, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;

export function AiBriefingCard({ onDismiss }: { onDismiss?: () => void }) {
  const [briefing, setBriefing] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const { session } = useAuth();

  const fetchBriefing = useCallback(async () => {
    if (isLoading) return;
    setIsLoading(true);
    setBriefing('');

    let soFar = '';

    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: '오늘의 브리핑을 간결하게 요약해주세요. 핵심 지표, 위험 요소, 즉시 조치가 필요한 사항 위주로 3~5줄 이내로 정리해주세요.' }],
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: '오류' }));
        toast.error(err.error || `브리핑 로드 실패 (${resp.status})`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      let done = false;

      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });

        let idx: number;
        while ((idx = buf.indexOf('\n')) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '' || !line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') { done = true; break; }
          try {
            const c = JSON.parse(json).choices?.[0]?.delta?.content;
            if (c) { soFar += c; setBriefing(soFar); }
          } catch {
            buf = line + '\n' + buf;
            break;
          }
        }
      }
    } catch {
      toast.error('브리핑을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, [session?.access_token]);

  useEffect(() => {
    if (session?.access_token && !hasFetched) {
      fetchBriefing();
    }
  }, [session?.access_token, hasFetched, fetchBriefing]);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4.5 w-4.5 text-primary" />
          AI 오늘의 브리핑
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchBriefing} disabled={isLoading}>
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDismiss} title="닫기 (다시 열기 가능)">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="max-h-[340px] overflow-y-auto pb-3">
        {isLoading && !briefing ? (
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-3/5" />
          </div>
        ) : briefing ? (
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{briefing}</ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">브리핑을 불러올 수 없습니다.</p>
        )}
      </CardContent>
    </Card>
  );
}

export function AiBriefingReopen({ onReopen }: { onReopen: () => void }) {
  return (
    <button
      onClick={onReopen}
      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors"
      title="AI 브리핑 다시 열기"
    >
      <Bot className="h-3.5 w-3.5" />
      AI 브리핑 열기
    </button>
  );
}
