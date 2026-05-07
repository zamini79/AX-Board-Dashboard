import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKpis } from '@/hooks/useKpis';
import { useUserProfile } from '@/hooks/useUserProfile';
import { AppLayout } from '@/components/layout/AppLayout';
import { KpiList } from '@/components/kpi/KpiList';
import { KpiDialog } from '@/components/kpi/KpiDialog';
import { Button } from '@/components/ui/button';
import { Plus, TrendingUp } from 'lucide-react';

export default function Kpis() {
  const { isManager } = useUserProfile();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  // Stable year change handler using useCallback to prevent re-render cascade
  const handleYearChange = useCallback((year: number) => {
    setSelectedYear(year);
  }, []);

  const actionButtons = isManager && (
    <Button size="sm" onClick={() => setDialogOpen(true)}>
      <Plus className="h-4 w-4 mr-2" />
      KPI 추가
    </Button>
  );

  return (
    <AppLayout 
      title="KPI 관리" 
      description="조직의 핵심 성과 지표를 관리합니다."
      actions={actionButtons}
    >
      <KpiList year={selectedYear} onYearChange={handleYearChange} />
      <KpiDialog open={dialogOpen} onOpenChange={setDialogOpen} defaultYear={selectedYear} />
    </AppLayout>
  );
}
