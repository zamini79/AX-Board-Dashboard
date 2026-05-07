import { useState, useRef } from 'react';
import { useKpiAttachments } from '@/hooks/useKpiAttachments';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Paperclip, Plus, Trash2, FileText, Download, Loader2, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ko } from 'date-fns/locale';

interface KpiAttachmentsProps {
  kpiId: string;
  readonly?: boolean;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export function KpiAttachments({ kpiId, readonly = false }: KpiAttachmentsProps) {
  const { attachments, isLoading, addAttachment, deleteAttachment, isAdding, isDeleting } = useKpiAttachments(kpiId);
  const { isOwnerOrAbove } = useUserProfile();
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showForm, setShowForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAdd = async () => {
    if (!description.trim() && !selectedFile) return;
    await addAttachment({
      kpiId,
      description: description.trim() || undefined,
      file: selectedFile || undefined,
    });
    setDescription('');
    setSelectedFile(null);
    setShowForm(false);
  };

  const canModify = !readonly && isOwnerOrAbove;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-primary" />
            참고자료
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
        {showForm && (
          <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
            <Input
              placeholder="설명 (선택)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.gif,.zip,.hwp"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip className="h-3 w-3 mr-1" />
                {selectedFile ? selectedFile.name : '파일 선택'}
              </Button>
              {selectedFile && (
                <span className="text-xs text-muted-foreground">
                  {formatFileSize(selectedFile.size)}
                </span>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setShowForm(false); setDescription(''); setSelectedFile(null); }}
              >
                취소
              </Button>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isAdding || (!description.trim() && !selectedFile)}
              >
                {isAdding && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                추가
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12" />
            <Skeleton className="h-12" />
          </div>
        ) : attachments.length === 0 && !showForm ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            참고자료가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {attachments.map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
              >
                <div className="shrink-0 mt-0.5">
                  {item.file_url ? (
                    <FileText className="h-4 w-4 text-primary" />
                  ) : (
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  {item.description && (
                    <p className="text-sm">{item.description}</p>
                  )}
                  {item.file_url && (
                    <div className="flex items-center gap-2">
                      <a
                        href={item.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1 truncate"
                      >
                        <Download className="h-3 w-3 shrink-0" />
                        <span className="truncate">{item.file_name || '파일'}</span>
                      </a>
                      {item.file_size && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatFileSize(item.file_size)}
                        </span>
                      )}
                    </div>
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
                    onClick={() => deleteAttachment(item.id)}
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
