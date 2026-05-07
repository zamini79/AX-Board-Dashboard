import { useState, useRef, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Bot, Send, Loader2, Sparkles, RotateCcw, Download } from 'lucide-react';
import { AiMessageBubble } from './AiMessageBubble';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Msg = { role: 'user' | 'assistant'; content: string };

const QUICK_CHIPS = [
  '오늘의 브리핑',
  '위험 KPI 분석',
  '지연 과제 현황',
  '예산 집행 현황',
];

const AI_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-advisor`;

interface AiAdvisorPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AiAdvisorPanel({ open, onOpenChange }: AiAdvisorPanelProps) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { session } = useAuth();

  const handleReset = () => {
    setMessages([]);
    setInput('');
  };

  const handleExport = () => {
    if (!messages.length) return;
    const text = messages
      .map((m) => `[${m.role === 'user' ? '나' : 'AI'}]\n${m.content}`)
      .join('\n\n---\n\n');
    const header = `AI 경영 자문 대화 내역\n내보내기: ${new Date().toLocaleString('ko-KR')}\n${'='.repeat(40)}\n\n`;
    const blob = new Blob([header + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-advisor-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('대화 내역이 내보내졌습니다.');
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;
    const userMsg: Msg = { role: 'user', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    let assistantSoFar = '';
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(AI_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ messages: allMessages }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: '오류가 발생했습니다.' }));
        toast.error(err.error || `오류 (${resp.status})`);
        setIsLoading(false);
        return;
      }

      if (!resp.body) throw new Error('No response body');

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;

      const upsert = (chunk: string) => {
        assistantSoFar += chunk;
        const snapshot = assistantSoFar;
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant') {
            return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: snapshot } : m));
          }
          return [...prev, { role: 'assistant', content: snapshot }];
        });
      };

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) upsert(content);
          } catch { /* ignore */ }
        }
      }
    } catch {
      toast.error('AI 응답 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-4 pb-3 border-b shrink-0">
          <SheetTitle className="flex items-center justify-between text-base">
            <span className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI 경영 자문
            </span>
            {messages.length > 0 && (
              <span className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleExport} title="대화 내보내기">
                  <Download className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleReset} title="새 대화">
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-8">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">AI 경영 자문에 오신 것을 환영합니다</p>
                <p className="text-xs text-muted-foreground mt-1">조직 데이터를 기반으로 분석과 자문을 제공합니다</p>
              </div>
              <div className="flex flex-wrap gap-2 justify-center mt-2">
                {QUICK_CHIPS.map((chip) => (
                  <Badge
                    key={chip}
                    variant="outline"
                    className="cursor-pointer hover:bg-accent transition-colors px-3 py-1.5 text-xs"
                    onClick={() => sendMessage(chip)}
                  >
                    {chip}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <AiMessageBubble key={i} role={msg.role} content={msg.content} />
          ))}
          {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              분석 중...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-3 shrink-0">
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {QUICK_CHIPS.map((chip) => (
                <Badge
                  key={chip}
                  variant="outline"
                  className="cursor-pointer hover:bg-accent transition-colors text-[10px] px-2 py-0.5"
                  onClick={() => sendMessage(chip)}
                >
                  {chip}
                </Badge>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="질문을 입력하세요..."
              className="min-h-[40px] max-h-[100px] resize-none text-sm"
              rows={1}
            />
            <Button
              size="icon"
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="shrink-0 h-10 w-10"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
