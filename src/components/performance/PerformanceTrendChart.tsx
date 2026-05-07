import { MetricSnapshot } from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface PerformanceTrendChartProps {
  snapshots: MetricSnapshot[];
  unit?: string | null;
}

export function PerformanceTrendChart({ snapshots, unit }: PerformanceTrendChartProps) {
  if (snapshots.length === 0) {
    return (
      <Card>
        <CardHeader><CardTitle className="text-base">성과 추이</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">측정 데이터가 없습니다.</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = snapshots.map(s => ({
    date: s.recorded_at,
    value: s.value ?? 0,
    score: s.score ?? 0,
  }));

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">성과 추이</CardTitle></CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--card))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.5rem',
              }}
            />
            <Line type="monotone" dataKey="value" stroke="hsl(var(--primary))" strokeWidth={2} name={`측정값 (${unit || ''})`} dot={{ fill: 'hsl(var(--primary))' }} />
            <Line type="monotone" dataKey="score" stroke="hsl(var(--chart-2))" strokeWidth={2} name="달성률 (%)" dot={{ fill: 'hsl(var(--chart-2))' }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
