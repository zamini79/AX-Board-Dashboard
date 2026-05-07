import { useState } from 'react';
import { useTaskAttachments } from '@/hooks/useTaskAttachments';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Paperclip, Plus, Trash2, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface TaskAttachmentsProps {
  taskId: string;
  readonly?: boolean;
}

export function TaskAttachments({ taskId, readonly = false }: TaskAttachmentsProps) {
  const { attachments, isLoading, addAttachment, deleteAttachment, isAdding, isDeleting } = useTaskAttachments(taskId);
  const { isOwnerOrAbove } = useUserProfile();
  const [description, setDescription] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [showForm, setShowForm] = useState(false);

  const handleAdd = async () => {
    if (!description.trim() && !linkUrl.trim()) return;
    await addAttachment({
      taskId,
      description: description.trim() || undefined,
      linkUrl: linkUrl.trim() || undefined,
    });
    setDescription('');
    setLinkUrl('');
    setShowForm(false);
  };

  const handleDelete = async (id: string) => {
    await deleteAttachment(id);
  };

  const canModify = !readonly && isOwnerOrAbove;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            첨부 항목
            <span className="text-sm font-normal text-muted-foreground">({attachments.length})</span>
          </CardTitle>
          {canModify && !showForm && (
            <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
              <Plus className="h-3 w-3 mr-1" />
              추가
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add form */}
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <Input
              placeholder="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <Input
              placeholder="https://drive.google.com/... 또는 파일 링크 URL"
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              maxLength={2000}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setDescription(''); setLinkUrl(''); }}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isAdding || (!description.trim() && !linkUrl.trim())}
              >
                {isAdding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                추가
              </Button>
            </div>
          </div>
        )}

        {/* Attachments list */}
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : attachments.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            첨부 항목이 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
              <div className="shrink-0 mt-0.5">
                  <ExternalLink className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {item.description && (
                    <p className="text-sm">{item.description}</p>
                  )}
                  {item.file_url && (
                    <a
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{item.file_url}</span>
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: ko })}
                  </p>
                </div>
                {canModify && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="shrink-0 h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={isDeleting}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
