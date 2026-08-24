import { cn, clamp } from '@/lib/utils';

export function Progress({
  value,
  max = 100,
  className,
  tone = 'accent',
  label,
}: {
  value: number;
  max?: number;
  className?: string;
  tone?: 'accent' | 'positive' | 'warning' | 'danger';
  label?: string;
}) {
  const percent = max > 0 ? clamp((value / max) * 100, 0, 100) : 0;
  const bar = {
    accent: 'bg-accent',
    positive: 'bg-positive',
    warning: 'bg-warning',
    danger: 'bg-danger',
  }[tone];

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('h-1.5 w-full overflow-hidden rounded-full bg-surface-muted', className)}
    >
      <div className={cn('h-full rounded-full transition-[width] duration-500', bar)} style={{ width: `${percent}%` }} />
    </div>
  );
}
