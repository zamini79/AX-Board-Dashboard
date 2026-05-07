import ReactMarkdown from 'react-markdown';
import { Bot, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AiMessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
}

export function AiMessageBubble({ role, content }: AiMessageBubbleProps) {
  const isUser = role === 'user';

  return (
    <div className={cn('flex gap-2.5 max-w-full', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
          isUser ? 'bg-primary text-primary-foreground' : 'bg-accent text-accent-foreground'
        )}
      >
        {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
      </div>
      <div
        className={cn(
          'rounded-xl px-3.5 py-2.5 text-sm leading-relaxed max-w-[85%]',
          isUser
            ? 'bg-primary text-primary-foreground rounded-tr-sm'
            : 'bg-muted text-foreground rounded-tl-sm'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
            <ReactMarkdown>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
