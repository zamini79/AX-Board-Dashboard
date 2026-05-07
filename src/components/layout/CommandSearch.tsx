import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useKpis } from '@/hooks/useKpis';
import { useTasks } from '@/hooks/useTasks';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  TrendingUp,
  CheckSquare,
  DollarSign,
  LayoutDashboard,
  Search,
} from 'lucide-react';

interface CommandSearchProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandSearch({ open, onOpenChange }: CommandSearchProps) {
  const navigate = useNavigate();
  const { kpis } = useKpis();
  const { tasks } = useTasks({});

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false);
    command();
  }, [onOpenChange]);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="검색어를 입력하세요... (⌘K)" />
      <CommandList>
        <CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
        
        {/* Quick Navigation */}
        <CommandGroup heading="빠른 이동">
          <CommandItem onSelect={() => runCommand(() => navigate('/'))}>
            <LayoutDashboard className="mr-2 h-4 w-4" />
            <span>대시보드</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/kpis'))}>
            <TrendingUp className="mr-2 h-4 w-4" />
            <span>KPI 관리</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/tasks'))}>
            <CheckSquare className="mr-2 h-4 w-4" />
            <span>과제 관리</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => navigate('/budget'))}>
            <DollarSign className="mr-2 h-4 w-4" />
            <span>예산 관리</span>
          </CommandItem>
        </CommandGroup>

        {/* KPIs */}
        {kpis.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="KPI">
              {kpis.slice(0, 5).map((kpi) => (
                <CommandItem
                  key={kpi.id}
                  onSelect={() => runCommand(() => navigate(`/kpi/${kpi.id}`))}
                >
                  <TrendingUp className="mr-2 h-4 w-4" />
                  <span>{kpi.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {kpi.status === 'on_track' ? '🟢' : kpi.status === 'at_risk' ? '🟡' : '🔴'}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Tasks */}
        {tasks.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="과제">
              {tasks.slice(0, 5).map((task) => (
                <CommandItem
                  key={task.id}
                  onSelect={() => runCommand(() => navigate(`/tasks?id=${task.id}`))}
                >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  <span className="truncate">{task.title}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

export function useCommandSearch() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  return { open, setOpen };
}
