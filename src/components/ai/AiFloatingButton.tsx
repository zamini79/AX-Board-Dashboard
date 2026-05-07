import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AiFloatingButtonProps {
  onClick: () => void;
}

export function AiFloatingButton({ onClick }: AiFloatingButtonProps) {
  return (
    <Button
      onClick={onClick}
      size="icon"
      className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 bg-primary text-primary-foreground"
    >
      <Bot className="h-6 w-6" />
    </Button>
  );
}
