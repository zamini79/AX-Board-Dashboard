import { useNavigate } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { BudgetChart } from '@/components/budget/BudgetChart';
import { BudgetList } from '@/components/budget/BudgetList';
import { DollarSign } from 'lucide-react';

export default function Budget() {
  return (
    <AppLayout 
      title="예산 관리" 
      description="OPEX/CAPEX 예산을 관리하고 3개년 추이를 확인합니다."
    >
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Chart Section */}
        <div className="lg:col-span-2">
          <BudgetChart />
        </div>

        {/* Budget List */}
        <div className="lg:col-span-2">
          <BudgetList />
        </div>
      </div>
    </AppLayout>
  );
}
