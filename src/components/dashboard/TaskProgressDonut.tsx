import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { ListChecks } from 'lucide-react';
import { Task } from '@/types/database';

interface TaskProgressDonutProps {
  tasks: Task[];
}

const STATUS_CONFIG = [
  { key: 'not_started', label: '미시작', color: 'hsl(var(--muted-foreground))' },
  { key: 'in_progress', label: '진행중', color: 'hsl(var(--primary))' },
  { key: 'done', label: '완료', color: 'hsl(142 71% 45%)' },
  { key: 'blocked', label: '지연', color: 'hsl(var(--destructive))' },
];

export function TaskProgressDonut({ tasks }: TaskProgressDonutProps) {
  const navigate = useNavigate();

  const data = STATUS_CONFIG.map(s => ({
    name: s.label,
    value: tasks.filter(t => {
      if (s.key === 'done') return t.status === 'done' || t.status === 'closed';
      if (s.key === 'blocked') return t.status === 'blocked' || t.status === 'executive_review';
      return t.status === s.key;
    }).length,
    color: s.color,
  })).filter(d => d.value > 0);

  const total = tasks.length;

  if (total === 0) return null;

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/tasks')}>
      <CardHeader className="pb-1 pt-3 px-4">
        <CardTitle className="text-sm flex items-center gap-1.5 text-muted-foreground font-medium">
          <ListChecks className="h-4 w-4" />
          과제 현황
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-3">
        <div className="relative w-full" style={{ height: 120 }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={50}
                paddingAngle={2}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [`${value}건`, name]}
                contentStyle={{ fontSize: '12px', borderRadius: '8px' }}
              />
            </PieChart>
          </ResponsiveContainer>
          {/* Center label */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground leading-none">{total}</p>
              <p className="text-[10px] text-muted-foreground">전체</p>
            </div>
          </div>
        </div>
        {/* Legend */}
        <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center mt-1">
          {data.map((d, i) => (
            <div key={i} className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
              {d.name} {d.value}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
