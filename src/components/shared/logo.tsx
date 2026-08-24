import { cn } from '@/lib/utils';
import { APP } from '@/lib/config';

/**
 * Marca do produto. O nome vem de `APP.name` — trocar lá muda em todo lugar.
 */
export function Logo({
  className,
  showName = true,
  size = 'md',
}: {
  className?: string;
  showName?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const mark = { sm: 'h-6 w-6', md: 'h-7 w-7', lg: 'h-9 w-9' }[size];
  const text = { sm: 'text-[13px]', md: 'text-[15px]', lg: 'text-lg' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" className={cn(mark, 'shrink-0')} aria-hidden fill="none">
        <rect width="32" height="32" rx="9" className="fill-primary" />
        <path
          d="M16 7.5c-3.2 0-5.8 2.5-5.8 5.7 0 4.2 5.8 11.3 5.8 11.3s5.8-7.1 5.8-11.3c0-3.2-2.6-5.7-5.8-5.7Z"
          className="fill-primary-foreground"
        />
        <circle cx="16" cy="13.1" r="2.1" className="fill-primary" />
      </svg>
      {showName && <span className={cn('font-semibold tracking-tight text-ink', text)}>{APP.name}</span>}
    </span>
  );
}
