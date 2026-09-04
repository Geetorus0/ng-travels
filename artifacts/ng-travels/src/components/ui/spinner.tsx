import { cn } from '@/lib/utils';
import { Compass } from 'lucide-react';

function Spinner({ className, ...props }: React.ComponentProps<'svg'>) {
  return (
    <Compass
      role="status"
      aria-label="NG Travels Operations Loading"
      className={cn('size-4 text-amber-400 animate-spin', className)}
      {...props}
    />
  );
}

export { Spinner };
