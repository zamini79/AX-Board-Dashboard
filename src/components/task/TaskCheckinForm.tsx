import { useState, useEffect } from 'react';
import { startOfWeek, format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useTaskCheckins } from '@/hooks/useTaskCheckins';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Send } from 'lucide-react';

interface TaskCheckinFormProps {
  taskId: string;
  currentProgress: number;
}

export function TaskCheckinForm({ taskId, currentProgress }: TaskCheckinFormProps) {
  const { createCheckin, isCreating } = useTaskCheckins(taskId);
  const [summary, setSummary] = useState('');
  const [plan, setPlan] = useState('');
  const [blockers, setBlockers] = useState('');
  const [progress, setProgress] = useState(currentProgress);

  // Sync slider with latest task progress when prop changes
  useEffect(() => {
    setProgress(currentProgress);
  }, [currentProgress]);

  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

  const handleSubmit = async () => {
    if (!summary.trim()) return;
    await createCheckin({
      task_id: taskId,
      week_start_date: format(weekStart, 'yyyy-MM-dd'),
      summary_this_week: summary.trim(),
      plan_next_week: plan.trim() || undefined,
      blockers: blockers.trim() || undefined,
      progress_percent: progress,
    });
    setSummary('');
    setPlan('');
    setBlockers('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          주간 체크인 — {format(weekStart, 'M월 d일', { locale: ko })} 주차
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>이번 주 요약 *</Label>
          <Textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="이번 주에 진행한 내용을 요약해주세요"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label>다음 주 계획</Label>
          <Textarea
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            placeholder="다음 주 계획을 작성해주세요"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label>장애 요인 / 이슈</Label>
          <Textarea
            value={blockers}
            onChange={(e) => setBlockers(e.target.value)}
            placeholder="진행에 방해가 되는 요인이나 해결이 필요한 이슈를 작성해주세요"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>진척도</Label>
            <span className="text-sm font-medium">{progress}%</span>
          </div>
          <Slider
            value={[progress]}
            onValueChange={([v]) => setProgress(v)}
            max={100}
            step={5}
          />
        </div>

        <Button
          onClick={handleSubmit}
          disabled={!summary.trim() || isCreating}
          className="w-full"
        >
          {isCreating ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          체크인 제출
        </Button>
      </CardContent>
    </Card>
  );
}
