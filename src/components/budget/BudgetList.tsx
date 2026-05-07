import { useState } from 'react';
import { Budget, BudgetType, useBudgets } from '@/hooks/useBudgets';
import { useUserProfile } from '@/hooks/useUserProfile';
import { BudgetDialog } from './BudgetDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  Plus, 
  DollarSign, 
  Filter, 
  MoreHorizontal, 
  Pencil, 
  Trash2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

export function BudgetList() {
  const { isOwnerOrAbove } = useUserProfile();
  const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<BudgetType | 'all'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { budgets, isLoading, deleteBudget } = useBudgets({
    year: yearFilter === 'all' ? undefined : yearFilter,
    budgetType: typeFilter === 'all' ? undefined : typeFilter,
  });

  const handleEdit = (budget: Budget) => {
    setSelectedBudget(budget);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedBudget(null);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteBudget(deleteId);
      setDeleteId(null);
    }
  };

  const formatAmount = (value: number) => {
    if (value >= 100000000) {
      return `${(value / 100000000).toFixed(1)}억`;
    } else if (value >= 10000) {
      return `${(value / 10000).toFixed(0)}만`;
    }
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  const getVariance = (budget: Budget) => {
    if (!budget.budget_amount) return 0;
    return ((budget.actual_amount - budget.budget_amount) / budget.budget_amount) * 100;
  };

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              예산 항목
              <Badge variant="secondary">{budgets.length}</Badge>
            </CardTitle>
            
            <div className="flex items-center gap-2">
              <Select 
                value={yearFilter.toString()} 
                onValueChange={(v) => setYearFilter(v === 'all' ? 'all' : parseInt(v))}
              >
                <SelectTrigger className="w-[100px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="연도" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}년
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={typeFilter} 
                onValueChange={(v) => setTypeFilter(v as BudgetType | 'all')}
              >
                <SelectTrigger className="w-[110px]">
                  <SelectValue placeholder="유형" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="opex">OPEX</SelectItem>
                  <SelectItem value="capex">CAPEX</SelectItem>
                </SelectContent>
              </Select>

              {isOwnerOrAbove && (
                <Button onClick={handleCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  추가
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : budgets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold mb-2">예산 항목이 없습니다</h3>
              <p className="text-muted-foreground text-sm mb-4">
                새 예산 항목을 추가하세요.
              </p>
              {isOwnerOrAbove && (
                <Button onClick={handleCreate} size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  예산 추가
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>연도</TableHead>
                    <TableHead>유형</TableHead>
                    <TableHead>카테고리</TableHead>
                    <TableHead>부서</TableHead>
                    <TableHead className="text-right">계획</TableHead>
                    <TableHead className="text-right">실적</TableHead>
                    <TableHead className="text-right">편차</TableHead>
                    {isOwnerOrAbove && <TableHead className="w-[50px]"></TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {budgets.map((budget) => {
                    const variance = getVariance(budget);
                    return (
                      <TableRow key={budget.id}>
                        <TableCell className="font-medium">{budget.year}</TableCell>
                        <TableCell>
                          <Badge variant={budget.budget_type === 'opex' ? 'default' : 'secondary'}>
                            {budget.budget_type.toUpperCase()}
                          </Badge>
                        </TableCell>
                        <TableCell>{budget.category || '-'}</TableCell>
                        <TableCell>{budget.department || '-'}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(budget.budget_amount)}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatAmount(budget.actual_amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {variance > 5 ? (
                              <TrendingUp className="h-4 w-4 text-destructive" />
                            ) : variance < -5 ? (
                              <TrendingDown className="h-4 w-4 text-primary" />
                            ) : null}
                            <span className={
                              variance > 5 
                                ? 'text-destructive' 
                                : variance < -5 
                                  ? 'text-primary' 
                                  : 'text-muted-foreground'
                            }>
                              {variance > 0 ? '+' : ''}{variance.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        {isOwnerOrAbove && (
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(budget)}>
                                  <Pencil className="h-4 w-4 mr-2" />
                                  수정
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => setDeleteId(budget.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  삭제
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <BudgetDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        budget={selectedBudget}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>예산 항목 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 예산 항목을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
