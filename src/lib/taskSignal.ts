import { Task } from '@/types/database';
import { isAfter, isBefore, addDays, startOfDay } from 'date-fns';

export type TaskSignal = 'red' | 'yellow' | 'green';

export function getTaskSignal(task: Task): TaskSignal {
  const today = startOfDay(new Date());
  const due = task.due_date ? startOfDay(new Date(task.due_date)) : null;
  const isCompleted = task.status === 'done' || task.status === 'closed' || task.status === 'cancelled';

  // Red: blocked or overdue (past due date and not completed)
  if (task.status === 'blocked') return 'red';
  if (due && isBefore(due, today) && !isCompleted) return 'red';

  // Yellow: executive review or due within 7 days
  if (task.status === 'executive_review') return 'yellow';
  if (due && !isCompleted && isBefore(due, addDays(today, 8)) && !isBefore(due, today)) return 'yellow';

  // Green: completed or on track
  return 'green';
}

export function getSignalColor(signal: TaskSignal) {
  return {
    red: { bg: 'bg-red-500', light: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: '#ef4444' },
    yellow: { bg: 'bg-yellow-500', light: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700', dot: '#eab308' },
    green: { bg: 'bg-green-500', light: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', dot: '#22c55e' },
  }[signal];
}
