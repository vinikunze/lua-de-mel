import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Bloco compacto de resumo usado na home da viagem. */
export function SummaryTile({
  icon: Icon,
  label,
  value,
  hint,
  href,
  tone = 'default',
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  href?: string;
  tone?: 'default' | 'accent' | 'warning' | 'positive';
  className?: string;
}) {
  const toneClass = {
    default: 'text-ink',
    accent: 'text-accent',
    warning: 'text-warning',
    positive: 'text-positive',
  }[tone];

  const body = (
    <>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
        <span className="truncate text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">{label}</span>
      </div>
      <p className={cn('mt-2 truncate text-[15px] font-semibold', toneClass)}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[12px] text-ink-soft">{hint}</p>}
    </>
  );

  const classes = cn(
    'rounded-[14px] border border-line bg-surface p-4 shadow-card',
    href && 'transition-shadow hover:shadow-raised',
    className,
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}
