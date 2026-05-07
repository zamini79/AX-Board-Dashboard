import { useState } from 'react';
import { useKpis } from '@/hooks/useKpis';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserProfile } from '@/hooks/useUserProfile';
import { Kpi, KPI_STATUS_CONFIG, KpiStatus } from '@/types/database';
import { KpiDialog } from './KpiDialog';
import { KpiFlowMap } from './KpiFlowMap';
import { KpiTreeNode } from './KpiTreeNode';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TrendingUp, Plus, Search, Filter, Building2, LayoutGrid, GitBranch, CalendarDays } from 'lucide-react';

interface KpiListProps {
  onKpiSelect?: (kpi: Kpi) => void;
  year?: number;
  onYearChange?: (year: number) => void;
}

export function KpiList({ onKpiSelect, year, onYearChange }: KpiListProps) {
  const { kpiTree, isLoading, availableYears } = useKpis(year);
  const { profile, isOwnerOrAbove } = useUserProfile();
  const { flatTreeDepartments } = useDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<KpiStatus | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedKpi, setSelectedKpi] = useState<Kpi | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Show only root KPIs (top-level) for filtering purposes
  // Note: kpiTree already contains only roots with children nested inside
  const filteredKpis = kpiTree.filter(kpi => {
    const matchesSearch = kpi.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      kpi.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || kpi.status === statusFilter;
    const matchesDept = deptFilter === 'all' || (kpi as any).department_id === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  const handleCreateKpi = () => {
    setSelectedKpi(null);
    setDialogOpen(true);
  };

  const handleEditKpi = (kpi: Kpi) => {
    setSelectedKpi(kpi);
    setDialogOpen(true);
  };

  if (!profile?.org_id) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">조직에 소속되지 않았습니다</h3>
        <p className="text-muted-foreground text-sm">
          관리자에게 조직 초대를 요청하세요.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">KPI 현황</h2>
          <span className="text-sm text-muted-foreground">({filteredKpis.length})</span>
        </div>
        
        {isOwnerOrAbove && (
          <Button onClick={handleCreateKpi}>
            <Plus className="h-4 w-4 mr-2" />
            KPI 추가
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Year selector */}
        <Select value={String(year || new Date().getFullYear())} onValueChange={(v) => onYearChange?.(Number(v))}>
          <SelectTrigger className="w-full sm:w-[120px]">
            <CalendarDays className="h-4 w-4 mr-2" />
            <SelectValue placeholder="연도" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(y => (
              <SelectItem key={y} value={String(y)}>{y}년</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="KPI 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as KpiStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {Object.entries(KPI_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.emoji} {config.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {flatTreeDepartments.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <SelectValue placeholder="부서 필터" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {flatTreeDepartments.map(d => (
                <SelectItem key={d.id} value={d.id}>
                  {'　'.repeat(d.depth || 0)}{d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="flex rounded-md border border-border overflow-hidden">
          <Button
            variant={viewMode === 'map' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode('map')}
          >
            <GitBranch className="h-4 w-4 mr-1" />
            맵
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="rounded-none"
            onClick={() => setViewMode('list')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            리스트
          </Button>
        </div>
      </div>

      {/* KPI Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[200px]" />
          ))}
        </div>
      ) : filteredKpis.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">
            {searchQuery || statusFilter !== 'all' ? 'KPI를 찾을 수 없습니다' : 'KPI가 없습니다'}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchQuery || statusFilter !== 'all' 
              ? '검색 조건을 변경해보세요.'
              : '첫 번째 KPI를 추가하여 시작하세요.'}
          </p>
          {isOwnerOrAbove && !searchQuery && statusFilter === 'all' && (
            <Button onClick={handleCreateKpi}>
              <Plus className="h-4 w-4 mr-2" />
              KPI 추가
            </Button>
          )}
        </div>
      ) : viewMode === 'map' ? (
        <KpiFlowMap kpiTree={filteredKpis} />
      ) : (
        <div className="space-y-2">
          {filteredKpis.map((kpi) => (
            <KpiTreeNode
              key={kpi.id}
              kpi={kpi}
              depth={0}
              defaultOpen
            />
          ))}
        </div>
      )}

      {/* Dialog */}
      <KpiDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        kpi={selectedKpi}
      />
    </div>
  );
}
