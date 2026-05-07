import { useMemo, useState } from 'react';
import { Budget, BudgetType, useBudgets } from '@/hooks/useBudgets';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface BudgetChartProps {
  compact?: boolean;
}

export function BudgetChart({ compact = false }: BudgetChartProps) {
  const [budgetType, setBudgetType] = useState<BudgetType>('opex');
  const { budgetSummary, isLoading } = useBudgets();

  // Filter and format data for chart
  const chartData = useMemo(() => {
    const filtered = budgetSummary
      .filter(b => b.budget_type === budgetType)
      .sort((a, b) => a.year - b.year);

    return filtered.map(item => ({
      year: `${item.year}년`,
      yearNum: item.year,
      계획: item.budget_amount / 100000000, // Convert to 억원
      실적: item.actual_amount / 100000000,
      전망: item.forecast_amount / 100000000,
      variance: ((item.actual_amount - item.budget_amount) / item.budget_amount) * 100,
    }));
  }, [budgetSummary, budgetType]);

  // Calculate totals
  const totals = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const currentYearData = chartData.find(d => d.yearNum === currentYear);
    
    if (!currentYearData) return null;

    return {
      budget: currentYearData.계획,
      actual: currentYearData.실적,
      forecast: currentYearData.전망,
      variance: currentYearData.variance,
    };
  }, [chartData]);

  const formatAmount = (value: number) => {
    return `${value.toFixed(1)}억`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[200px]" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">예산 현황</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <span className="text-3xl mb-2">📊</span>
            <p className="text-muted-foreground text-sm">
              예산 데이터가 없습니다
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">예산 현황</CardTitle>
            {!compact && (
              <CardDescription>3개년 예산 비교 (단위: 억원)</CardDescription>
            )}
          </div>
          <Tabs value={budgetType} onValueChange={(v) => setBudgetType(v as BudgetType)}>
            <TabsList className="h-8">
              <TabsTrigger value="opex" className="text-xs px-3">OPEX</TabsTrigger>
              <TabsTrigger value="capex" className="text-xs px-3">CAPEX</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>
      <CardContent>
        {/* Summary Stats */}
        {totals && !compact && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">계획</p>
              <p className="text-lg font-semibold">{formatAmount(totals.budget)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">실적</p>
              <p className="text-lg font-semibold">{formatAmount(totals.actual)}</p>
            </div>
            <div className="text-center p-2 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground">편차</p>
              <div className="flex items-center justify-center gap-1">
                {totals.variance > 0 ? (
                  <TrendingUp className="h-4 w-4 text-destructive" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-primary" />
                )}
                <p className={`text-lg font-semibold ${totals.variance > 0 ? 'text-destructive' : 'text-primary'}`}>
                  {totals.variance > 0 ? '+' : ''}{totals.variance.toFixed(1)}%
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className={compact ? 'h-[180px]' : 'h-[250px]'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis 
                dataKey="year" 
                tick={{ fontSize: 12 }}
                className="fill-muted-foreground"
              />
              <YAxis 
                tick={{ fontSize: 12 }}
                tickFormatter={(value) => `${value}억`}
                className="fill-muted-foreground"
              />
              <Tooltip content={<CustomTooltip />} />
              {!compact && <Legend wrapperStyle={{ fontSize: '12px' }} />}
              <Bar 
                dataKey="계획" 
                className="fill-primary"
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]}
                opacity={0.8}
              />
              <Bar 
                dataKey="실적" 
                className="fill-chart-2"
                fill="hsl(var(--chart-2))" 
                radius={[4, 4, 0, 0]}
              />
              <Bar 
                dataKey="전망" 
                fill="hsl(var(--chart-3))" 
                radius={[4, 4, 0, 0]}
                opacity={0.6}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
