import { useState, useRef, useEffect, useCallback } from 'react';
import { useTaskComments } from '@/hooks/useTaskComments';
import { useAuth } from '@/contexts/AuthContext';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { MessageSquare, Send, Trash2, Loader2, Pencil, Check, X } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface Props {
  taskId: string;
}

// Render @mentions highlighted
function CommentContent({ content }: { content: string }) {
  const parts = content.split(/(@\S+)/g);
  return (
    <p className="text-sm whitespace-pre-wrap bg-muted/50 rounded-lg px-3 py-2 leading-relaxed">
      {parts.map((part, i) =>
        part.startsWith('@') ? (
          <span key={i} className="text-primary font-medium">{part}</span>
        ) : (
          part
        )
      )}
    </p>
  );
}

// Inline editor for a single comment
function CommentEditor({
  initialContent,
  onSave,
  onCancel,
  isSaving,
}: {
  initialContent: string;
  onSave: (content: string) => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const [value, setValue] = useState(initialContent);
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
    const len = ref.current?.value.length ?? 0;
    ref.current?.setSelectionRange(len, len);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div className="space-y-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        className="min-h-[72px] resize-none text-sm"
        disabled={isSaving}
      />
      <div className="flex items-center gap-2 justify-end">
        <span className="text-xs text-muted-foreground">Ctrl+Enter로 저장</span>
        <Button variant="ghost" size="sm" className="h-7 px-2" onClick={onCancel} disabled={isSaving}>
          <X className="h-3.5 w-3.5" />
          취소
        </Button>
        <Button
          size="sm"
          className="h-7 px-2 gap-1"
          disabled={!value.trim() || isSaving}
          onClick={() => onSave(value.trim())}
        >
          {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
          저장
        </Button>
      </div>
    </div>
  );
}

export function TaskComments({ taskId }: Props) {
  const { user } = useAuth();
  const { comments, isLoading, addComment, deleteComment, updateComment, isAdding, isUpdating } =
    useTaskComments(taskId);
  const { data: members = [] } = useOrgMembers();

  const [content, setContent] = useState('');
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionStart, setMentionStart] = useState(-1);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const filteredMembers =
    mentionQuery !== null
      ? members
          .filter((m) => {
            const name = (m.full_name || m.email || '').toLowerCase();
            return name.includes(mentionQuery.toLowerCase()) && m.id !== user?.id;
          })
          .slice(0, 6)
      : [];

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    const cursor = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursor);
    const match = textBeforeCursor.match(/(^|[\s\n])@(\S*)$/);
    if (match) {
      setMentionQuery(match[2]);
      setMentionStart(cursor - match[2].length - 1);
      setMentionIndex(0);
    } else {
      setMentionQuery(null);
    }
  };

  const insertMention = useCallback(
    (displayName: string) => {
      if (mentionStart < 0) return;
      const before = content.slice(0, mentionStart);
      const after = content.slice(mentionStart + 1 + (mentionQuery?.length ?? 0));
      const newContent = `${before}@${displayName} ${after}`;
      setContent(newContent);
      setMentionQuery(null);
      setTimeout(() => {
        if (textareaRef.current) {
          const pos = (before + `@${displayName} `).length;
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(pos, pos);
        }
      }, 0);
    },
    [content, mentionQuery, mentionStart]
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionQuery !== null && filteredMembers.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionIndex((i) => Math.min(i + 1, filteredMembers.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionIndex((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        const m = filteredMembers[mentionIndex];
        if (m) insertMention(m.full_name || m.email.split('@')[0]);
        return;
      }
      if (e.key === 'Escape') { setMentionQuery(null); return; }
    }
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleSubmit(); }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMentionQuery(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSubmit = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    const mentionedIds = members
      .filter((m) => trimmed.includes(`@${m.full_name || m.email.split('@')[0]}`))
      .map((m) => m.id);
    await addComment(trimmed, mentionedIds);
    setContent('');
    setMentionQuery(null);
  };

  const handleUpdate = async (commentId: string, newContent: string) => {
    await updateComment(commentId, newContent);
    setEditingId(null);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-primary" />
          댓글
          {comments.length > 0 && (
            <span className="text-sm text-muted-foreground font-normal">({comments.length})</span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Comment list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            아직 댓글이 없습니다. 첫 번째 댓글을 남겨보세요.
          </p>
        ) : (
          <div className="space-y-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarImage src={comment.author?.avatar_url || ''} />
                  <AvatarFallback className="text-xs">
                    {comment.author?.full_name?.slice(0, 2) || comment.author?.email?.slice(0, 2) || '?'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {comment.author?.full_name || comment.author?.email?.split('@')[0] || '알 수 없음'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: ko })}
                    </span>
                    {Math.abs(new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime()) > 2000 && (
                      <span className="text-xs text-muted-foreground italic">(수정됨)</span>
                    )}
                    {comment.user_id === user?.id && editingId !== comment.id && (
                      <div className="ml-auto flex items-center gap-1">
                        <button
                          className="text-muted-foreground hover:text-foreground transition-colors"
                          title="수정"
                          onClick={() => setEditingId(comment.id)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="text-muted-foreground hover:text-destructive transition-colors"
                          title="삭제"
                          onClick={() => deleteComment(comment.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {editingId === comment.id ? (
                    <CommentEditor
                      initialContent={comment.content}
                      onSave={(newContent) => handleUpdate(comment.id, newContent)}
                      onCancel={() => setEditingId(null)}
                      isSaving={isUpdating}
                    />
                  ) : (
                    <CommentContent content={comment.content} />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Comment input with mention dropdown */}
        <div className="relative pt-2 border-t border-border">
          {mentionQuery !== null && filteredMembers.length > 0 && (
            <div
              ref={dropdownRef}
              className="absolute bottom-full left-0 mb-1 z-50 w-64 rounded-lg border border-border bg-popover shadow-md py-1 overflow-hidden"
            >
              {filteredMembers.map((m, idx) => (
                <button
                  key={m.id}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent transition-colors ${
                    idx === mentionIndex ? 'bg-accent' : ''
                  }`}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    insertMention(m.full_name || m.email.split('@')[0]);
                  }}
                >
                  <Avatar className="h-6 w-6 shrink-0">
                    <AvatarImage src={m.avatar_url || ''} />
                    <AvatarFallback className="text-[10px]">
                      {(m.full_name || m.email).slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{m.full_name || m.email.split('@')[0]}</p>
                    {m.title && <p className="text-xs text-muted-foreground truncate">{m.title}</p>}
                  </div>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="댓글을 입력하세요... (@멘션, Ctrl+Enter로 등록)"
                className="min-h-[72px] resize-none text-sm"
                disabled={isAdding}
              />
            </div>
            <Button
              size="icon"
              className="h-auto shrink-0 px-3"
              disabled={!content.trim() || isAdding}
              onClick={handleSubmit}
            >
              {isAdding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
          {mentionQuery !== null && filteredMembers.length === 0 && mentionQuery.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1 ml-1">일치하는 구성원이 없습니다</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
