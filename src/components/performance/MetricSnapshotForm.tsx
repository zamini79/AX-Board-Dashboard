import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMetricSnapshots } from '@/hooks/useMetricSnapshots';
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Plus } from 'lucide-react';

const snapshotSchema = z.object({
  recorded_at: z.string().min(1, '날짜를 입력해주세요'),
  value: z.coerce.number(),
  score: z.coerce.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

type SnapshotFormValues = z.infer<typeof snapshotSchema>;

interface MetricSnapshotFormProps {
  initiativeId: string;
  targetValue?: number | null;
}

export function MetricSnapshotForm({ initiativeId, targetValue }: MetricSnapshotFormProps) {
  const { createSnapshot, isCreating } = useMetricSnapshots(initiativeId);

  const form = useForm<SnapshotFormValues>({
    resolver: zodResolver(snapshotSchema),
    defaultValues: {
      recorded_at: new Date().toISOString().split('T')[0],
      value: undefined as any,
      score: undefined,
      notes: '',
    },
  });

  const onSubmit = async (values: SnapshotFormValues) => {
    const score = targetValue ? Math.min(100, (values.value / targetValue) * 100) : values.score ?? 0;
    await createSnapshot({
      initiative_id: initiativeId,
      recorded_at: values.recorded_at,
      value: values.value,
      score,
      notes: values.notes,
    });
    form.reset({ recorded_at: new Date().toISOString().split('T')[0], value: undefined as any, score: undefined, notes: '' });
  };

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">측정값 기록</CardTitle></CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col sm:flex-row gap-3 items-end">
            <FormField control={form.control} name="recorded_at" render={({ field }) => (
              <FormItem className="flex-1"><FormLabel>측정일</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="value" render={({ field }) => (
              <FormItem className="flex-1"><FormLabel>측정값</FormLabel><FormControl><Input type="number" placeholder="값 입력" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem className="flex-[2]"><FormLabel>비고</FormLabel><FormControl><Input placeholder="메모 (선택)" {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <Button type="submit" disabled={isCreating} className="shrink-0">
              {isCreating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              기록
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
