import { useState } from 'react';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { GoalList } from '@/components/performance/GoalList';
import { GoalDialog } from '@/components/performance/GoalDialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Performance() {
  const { isManager } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);

  const actionButtons = isManager && (
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      성과 목표 추가
    </Button>
  );

  return (
    <AppLayout
      title="성과 관리"
      description="조직의 성과 목표와 이니셔티브를 관리합니다."
      actions={actionButtons}
    >
      <GoalList />
      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppLayout>
  );
}
