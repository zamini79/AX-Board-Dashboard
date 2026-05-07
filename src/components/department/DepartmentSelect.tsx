import { useDepartments, Department } from '@/hooks/useDepartments';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DepartmentSelectProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowNone?: boolean;
  noneLabel?: string;
  className?: string;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = '부서 선택',
  allowNone = true,
  noneLabel = '미지정',
  className,
}: DepartmentSelectProps) {
  const { flatTreeDepartments } = useDepartments();

  return (
    <Select value={value || 'none'} onValueChange={(v) => onChange(v === 'none' ? '' : v)}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {allowNone && <SelectItem value="none">{noneLabel}</SelectItem>}
        {flatTreeDepartments.map((dept) => (
          <SelectItem key={dept.id} value={dept.id}>
            {'　'.repeat(dept.depth || 0)}{dept.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
