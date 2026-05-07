import { useState } from 'react';
import { useGoals } from '@/hooks/useGoals';
import { useDepartments } from '@/hooks/useDepartments';
import { useUserProfile } from '@/hooks/useUserProfile';
import { PerformanceGoal, GOAL_STATUS_CONFIG, GoalStatus } from '@/types/database';
import { GoalDialog } from './GoalDialog';
import { GoalFlowMap } from './GoalFlowMap';
import { GoalTreeNode } from './GoalTreeNode';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trophy, Plus, Search, Filter, Building2, LayoutGrid, GitBranch } from 'lucide-react';

export function GoalList() {
  const { goalTree, isLoading } = useGoals();
  const { profile, isOwnerOrAbove } = useUserProfile();
  const { flatTreeDepartments } = useDepartments();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<GoalStatus | 'all'>('all');
  const [deptFilter, setDeptFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<PerformanceGoal | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  const filteredGoals = goalTree.filter(goal => {
    const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      goal.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || goal.status === statusFilter;
    const matchesDept = deptFilter === 'all' || goal.department_id === deptFilter;
    return matchesSearch && matchesStatus && matchesDept;
  });

  if (!profile?.org_id) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-2">조직에 소속되지 않았습니다</h3>
        <p className="text-muted-foreground text-sm">관리자에게 조직 초대를 요청하세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">성과 목표</h2>
          <span className="text-sm text-muted-foreground">({filteredGoals.length})</span>
        </div>
        {isOwnerOrAbove && (
          <Button onClick={() => { setSelectedGoal(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            성과 목표 추가
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="성과 목표 검색..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={v => setStatusFilter(v as GoalStatus | 'all')}>
          <SelectTrigger className="w-full sm:w-[160px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="상태 필터" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 상태</SelectItem>
            {Object.entries(GOAL_STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.emoji} {config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {flatTreeDepartments.length > 0 && (
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full sm:w-[160px]"><SelectValue placeholder="부서 필터" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체 부서</SelectItem>
              {flatTreeDepartments.map(d => (
                <SelectItem key={d.id} value={d.id}>{'　'.repeat(d.depth || 0)}{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex rounded-md border border-border overflow-hidden">
          <Button variant={viewMode === 'map' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('map')}>
            <GitBranch className="h-4 w-4 mr-1" />맵
          </Button>
          <Button variant={viewMode === 'list' ? 'default' : 'ghost'} size="sm" className="rounded-none" onClick={() => setViewMode('list')}>
            <LayoutGrid className="h-4 w-4 mr-1" />리스트
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[200px]" />)}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg">
          <Trophy className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold mb-2">
            {searchQuery || statusFilter !== 'all' ? '성과 목표를 찾을 수 없습니다' : '성과 목표가 없습니다'}
          </h3>
          <p className="text-muted-foreground text-sm mb-4">
            {searchQuery || statusFilter !== 'all' ? '검색 조건을 변경해보세요.' : '첫 번째 성과 목표를 추가하여 시작하세요.'}
          </p>
          {isOwnerOrAbove && !searchQuery && statusFilter === 'all' && (
            <Button onClick={() => { setSelectedGoal(null); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-2" />성과 목표 추가
            </Button>
          )}
        </div>
      ) : viewMode === 'map' ? (
        <GoalFlowMap goalTree={filteredGoals} />
      ) : (
        <div className="space-y-2">
          {filteredGoals.map(goal => <GoalTreeNode key={goal.id} goal={goal} depth={0} defaultOpen />)}
        </div>
      )}

      <GoalDialog open={dialogOpen} onOpenChange={setDialogOpen} goal={selectedGoal} />
    </div>
  );
}
