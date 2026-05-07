import { useState, useRef, useEffect } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';

export interface MemberOption {
  id: string;
  label: string;
}

interface MemberComboboxProps {
  members: MemberOption[];
  value: string;        // member id or custom text
  isCustom: boolean;    // true if value is custom text (not a member id)
  onChange: (value: string, isCustom: boolean) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function MemberCombobox({
  members,
  value,
  isCustom,
  onChange,
  placeholder = '담당자 선택 또는 입력',
  disabled = false,
}: MemberComboboxProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const displayLabel = isCustom
    ? value
    : members.find((m) => m.id === value)?.label || '';

  useEffect(() => {
    if (open) {
      setInputValue(displayLabel);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = members.filter((m) =>
    m.label.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (memberId: string) => {
    onChange(memberId, false);
    setOpen(false);
  };

  const handleCustom = () => {
    const trimmed = inputValue.trim();
    if (trimmed) {
      onChange(trimmed, true);
    }
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('', false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      // If exact match in filtered, select that member
      const exact = filtered.find(
        (m) => m.label.toLowerCase() === inputValue.trim().toLowerCase()
      );
      if (exact) {
        handleSelect(exact.id);
      } else {
        handleCustom();
      }
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            'w-full justify-between font-normal',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">
            {value ? displayLabel : placeholder}
          </span>
          <div className="flex items-center gap-1 shrink-0">
            {value && (
              <X
                className="h-3 w-3 text-muted-foreground hover:text-foreground"
                onClick={handleClear}
              />
            )}
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2">
          <Input
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="이름 검색 또는 직접 입력..."
            className="h-8 text-sm"
          />
        </div>
        <div className="max-h-48 overflow-y-auto">
          {filtered.length > 0 ? (
            filtered.map((member) => (
              <button
                key={member.id}
                type="button"
                className={cn(
                  'flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer',
                  value === member.id && !isCustom && 'bg-accent'
                )}
                onClick={() => handleSelect(member.id)}
              >
                <Check
                  className={cn(
                    'h-4 w-4 shrink-0',
                    value === member.id && !isCustom
                      ? 'opacity-100'
                      : 'opacity-0'
                  )}
                />
                {member.label}
              </button>
            ))
          ) : null}
          {inputValue.trim() &&
            !filtered.some(
              (m) => m.label.toLowerCase() === inputValue.trim().toLowerCase()
            ) && (
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent cursor-pointer text-primary"
                onClick={handleCustom}
              >
                <span className="text-xs">✏️</span>
                &quot;{inputValue.trim()}&quot; 직접 입력
              </button>
            )}
          {!inputValue.trim() && filtered.length === 0 && (
            <p className="py-4 text-center text-sm text-muted-foreground">
              회원이 없습니다
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
