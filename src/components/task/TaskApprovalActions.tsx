import { useState } from 'react';
import { Task } from '@/types/database';
import { useTasks } from '@/hooks/useTasks';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useOrgMembers } from '@/hooks/useOrgMembers';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  CheckCircle, 
  RotateCcw, 
  UserPlus, 
  Send,
  Loader2,
} from 'lucide-react';

interface TaskApprovalActionsProps {
  task: Task;
  onActionComplete?: () => void;
}

export function TaskApprovalActions({ task, onActionComplete }: TaskApprovalActionsProps) {
  const { canApprove, isManager, profile } = useUserProfile();
  const { approveTask, updateTask } = useTasks();
  const { data: members = [] } = useOrgMembers();
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<'approve' | 'reopen' | null>(null);
  const [delegateDialogOpen, setDelegateDialogOpen] = useState(false);
  const [delegateToUser, setDelegateToUser] = useState<string>('');

  const isOwner = task.owner_id === profile?.id;
  const canSubmitForApproval = isOwner && task.status === 'done';
  const canApproveTask = canApprove && (task.status === 'executive_review' || task.status === 'done');
  const canReopen = isManager && (task.status === 'executive_review' || task.status === 'done');
  const canDelegate = isManager && task.status !== 'closed' && task.status !== 'cancelled';

  // Handle submit for executive review
  const handleSubmitForReview = async () => {
    setIsProcessing(true);
    try {
      await updateTask({
        id: task.id,
        status: 'executive_review',
      });
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle approve
  const handleApprove = async () => {
    setIsProcessing(true);
    try {
      await approveTask({ taskId: task.id, action: 'approve' });
      setConfirmDialog(null);
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle reopen
  const handleReopen = async () => {
    setIsProcessing(true);
    try {
      await approveTask({ taskId: task.id, action: 'reopen' });
      setConfirmDialog(null);
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle delegate
  const handleDelegate = async () => {
    if (!delegateToUser) return;
    setIsProcessing(true);
    try {
      await updateTask({
        id: task.id,
        owner_id: delegateToUser,
        status: 'in_progress',
      });
      setDelegateDialogOpen(false);
      onActionComplete?.();
    } finally {
      setIsProcessing(false);
    }
  };

  // Don't show actions for closed/cancelled tasks
  if (task.status === 'closed' || task.status === 'cancelled') {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 pt-4 border-t">
        {/* Owner: Submit for review */}
        {canSubmitForApproval && (
          <Button
            size="sm"
            onClick={handleSubmitForReview}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            승인 요청
          </Button>
        )}

        {/* Executive: Approve */}
        {canApproveTask && (
          <Button
            size="sm"
            onClick={() => setConfirmDialog('approve')}
            disabled={isProcessing}
          >
            <CheckCircle className="h-4 w-4 mr-1" />
            승인 & 종료
          </Button>
        )}

        {/* Manager: Reopen */}
        {canReopen && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConfirmDialog('reopen')}
            disabled={isProcessing}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            재요청
          </Button>
        )}

        {/* Manager: Delegate */}
        {canDelegate && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setDelegateDialogOpen(true)}
            disabled={isProcessing}
          >
            <UserPlus className="h-4 w-4 mr-1" />
            재할당
          </Button>
        )}
      </div>

      {/* Approve Confirmation */}
      <AlertDialog open={confirmDialog === 'approve'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>과제 승인</AlertDialogTitle>
            <AlertDialogDescription>
              이 과제를 승인하고 종료하시겠습니까? 종료된 과제는 다시 열 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              승인
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reopen Confirmation */}
      <AlertDialog open={confirmDialog === 'reopen'} onOpenChange={() => setConfirmDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>과제 재요청</AlertDialogTitle>
            <AlertDialogDescription>
              이 과제를 다시 진행 상태로 변경하시겠습니까? 담당자에게 재작업을 요청합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleReopen} disabled={isProcessing}>
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              재요청
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delegate Dialog */}
      <Dialog open={delegateDialogOpen} onOpenChange={setDelegateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>과제 재할당</DialogTitle>
            <DialogDescription>
              새로운 담당자를 선택하여 과제를 재할당합니다.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <p className="text-sm font-medium mb-2">과제: {task.title}</p>
            <p className="text-xs text-muted-foreground mb-4">
              현재 담당자: {task.owner?.full_name || task.owner?.email || '미지정'}
            </p>
            
            <Select value={delegateToUser} onValueChange={setDelegateToUser}>
              <SelectTrigger>
                <SelectValue placeholder="새 담당자 선택" />
              </SelectTrigger>
              <SelectContent>
                {members
                  .filter(m => m.id !== task.owner_id)
                  .map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={member.avatar_url || ''} />
                          <AvatarFallback className="text-[8px]">
                            {member.full_name?.slice(0, 2) || member.email.slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        {member.full_name || member.email}
                      </div>
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDelegateDialogOpen(false)}
              disabled={isProcessing}
            >
              취소
            </Button>
            <Button
              onClick={handleDelegate}
              disabled={!delegateToUser || isProcessing}
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              재할당
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
