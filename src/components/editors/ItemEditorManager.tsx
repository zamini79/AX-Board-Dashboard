import { useState } from 'react';
import { useItemEditors } from '@/hooks/useItemEditors';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Users, Plus, X, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ItemEditorManagerProps {
  itemType: 'kpi' | 'task' | 'goal' | 'initiative';
  itemId: string;
}

export function ItemEditorManager({ itemType, itemId }: ItemEditorManagerProps) {
  const { editors, isLoading, addEditor, removeEditor, isAdding } = useItemEditors(itemType, itemId);
  const { data: members = [] } = useOrgMembers();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const editorUserIds = new Set(editors.map(e => e.user_id));

  const availableMembers = members.filter(
    m => !editorUserIds.has(m.id) && (
      m.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleAdd = (userId: string) => {
    addEditor(userId);
    setOpen(false);
    setSearch('');
  };

  const ITEM_LABELS: Record<string, string> = {
    kpi: 'KPI',
    task: '과제',
    goal: '성과 목표',
    initiative: '이니셔티브',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            편집자 관리
            {editors.length > 0 && (
              <Badge variant="secondary" className="text-xs">{editors.length}</Badge>
            )}
          </CardTitle>
          <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
              <Button size="sm" variant="outline" disabled={isAdding}>
                {isAdding ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                추가
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-0" align="end">
              <div className="p-2 border-b">
                <Input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="이름 또는 이메일 검색..."
                  className="h-8 text-sm"
                  autoFocus
                />
              </div>
              <div className="max-h-48 overflow-y-auto">
                {availableMembers.length > 0 ? (
                  availableMembers.map(member => (
                    <button
                      key={member.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer"
                      onClick={() => handleAdd(member.id)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={member.avatar_url || ''} />
                        <AvatarFallback className="text-[8px]">
                          {member.full_name?.slice(0, 2) || member.email.slice(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left truncate">
                        <span className="font-medium">{member.full_name || member.email}</span>
                        {member.full_name && (
                          <span className="text-muted-foreground ml-1 text-xs">{member.email}</span>
                        )}
                      </div>
                    </button>
                  ))
                ) : (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {search ? '검색 결과가 없습니다' : '추가할 수 있는 멤버가 없습니다'}
                  </p>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          이 {ITEM_LABELS[itemType]}의 조회 및 수정 권한을 위임할 편집자를 관리합니다.
        </p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : editors.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            등록된 편집자가 없습니다.
          </p>
        ) : (
          <div className="space-y-2">
            {editors.map(editor => (
              <div
                key={editor.id}
                className="flex items-center justify-between rounded-md border px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={editor.profile?.avatar_url || ''} />
                    <AvatarFallback className="text-xs">
                      {editor.profile?.full_name?.slice(0, 2) || editor.profile?.email?.slice(0, 2) || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{editor.profile?.full_name || editor.profile?.email || '알 수 없음'}</p>
                    {editor.profile?.full_name && (
                      <p className="text-xs text-muted-foreground">{editor.profile.email}</p>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => removeEditor(editor.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
