import { useState } from 'react';
import { Department, useDepartments } from '@/hooks/useDepartments';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { DepartmentDialog } from './DepartmentDialog';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, Building2, Users } from 'lucide-react';

function DepartmentNode({
  dept,
  members,
  onEdit,
  onDelete,
  onAdd,
  isManager,
}: {
  dept: Department;
  members: { id: string; full_name: string | null; email: string; avatar_url: string | null; department_id?: string | null }[];
  onEdit: (d: Department) => void;
  onDelete: (d: Department) => void;
  onAdd: (parentId: string) => void;
  isManager: boolean;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = dept.children && dept.children.length > 0;
  const deptMembers = members.filter(m => (m as any).department_id === dept.id);
  const head = members.find(m => m.id === dept.head_user_id);

  return (
    <div>
      <div className="flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-accent/50 group">
        <button onClick={() => setOpen(!open)} className="w-5 h-5 flex items-center justify-center shrink-0">
          {hasChildren ? (open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />) : <span className="w-4" />}
        </button>
        <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
        <span className="text-sm font-medium flex-1">{dept.name}</span>
        {head && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Avatar className="h-5 w-5">
              <AvatarImage src={head.avatar_url || ''} />
              <AvatarFallback className="text-[8px]">{head.full_name?.slice(0, 2) || 'U'}</AvatarFallback>
            </Avatar>
            <span className="hidden sm:inline">{head.full_name || head.email}</span>
          </div>
        )}
        {deptMembers.length > 0 && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-0.5">
            <Users className="h-3 w-3" />
            {deptMembers.length}
          </Badge>
        )}
        {isManager && (
          <div className="hidden group-hover:flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onAdd(dept.id)}>
              <Plus className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(dept)}>
              <Pencil className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(dept)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
      {hasChildren && open && (
        <div className="ml-6 border-l border-border/50 pl-2">
          {dept.children!.map(child => (
            <DepartmentNode
              key={child.id}
              dept={child}
              members={members}
              onEdit={onEdit}
              onDelete={onDelete}
              onAdd={onAdd}
              isManager={isManager}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function DepartmentTree() {
  const { departmentTree, deleteDepartment } = useDepartments();
  const { data: members = [] } = useOrgMembers();
  const { isAdmin } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<Department | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  const handleAdd = (parentId?: string) => {
    setSelectedDept(null);
    setDefaultParentId(parentId || null);
    setDialogOpen(true);
  };

  const handleEdit = (dept: Department) => {
    setSelectedDept(dept);
    setDefaultParentId(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteTarget) {
      await deleteDepartment(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          조직 구조
        </h3>
        {isAdmin && (
          <Button size="sm" onClick={() => handleAdd()}>
            <Plus className="h-4 w-4 mr-1" />
            부서 추가
          </Button>
        )}
      </div>

      {departmentTree.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">조직 구조를 설정하세요</h3>
          <p className="text-muted-foreground text-sm mb-4 max-w-md">
            먼저 <strong>회사명</strong>으로 최상위 조직을 만들고 CEO를 부서장으로 지정하세요.
            <br />그 아래 본부 → 실 → 팀 순서로 하위 부서를 추가합니다.
          </p>
          {isAdmin && (
            <Button onClick={() => handleAdd()}>
              <Plus className="h-4 w-4 mr-2" />
              회사(최상위 조직) 추가
            </Button>
          )}
        </div>
      ) : (
        <div className="border rounded-lg p-2">
          {departmentTree.map(dept => (
            <DepartmentNode
              key={dept.id}
              dept={dept}
              members={members as any}
              onEdit={handleEdit}
              onDelete={setDeleteTarget}
              onAdd={(pid) => handleAdd(pid)}
              isManager={isAdmin}
            />
          ))}
        </div>
      )}

      <DepartmentDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        department={selectedDept ? selectedDept : defaultParentId ? { parent_id: defaultParentId } as any : null}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>부서 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              '{deleteTarget?.name}' 부서를 삭제하시겠습니까? 하위 부서는 상위로 이동됩니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
