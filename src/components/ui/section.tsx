import * as React from 'react';
import { cn } from '@/lib/utils';

export function PageHeader({
  title,
  description,
  action,
  className,
  eyebrow,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  eyebrow?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">{eyebrow}</p>
        )}
        <h1 className="text-[22px] font-semibold leading-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </div>
  );
}

export function SectionHeader({
  title,
  action,
  className,
  count,
}: {
  title: string;
  action?: React.ReactNode;
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
        {title}
        {typeof count === 'number' && (
          <span className="rounded-full bg-surface-muted px-2 py-0.5 text-[11px] font-medium text-ink-faint tabular">
            {count}
          </span>
        )}
      </h2>
      {action}
    </div>
  );
}

/** Bloco de número em destaque usado no dashboard e no financeiro. */
export function Stat({
  label,
  value,
  hint,
  tone = 'default',
  className,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  tone?: 'default' | 'positive' | 'warning' | 'danger' | 'accent';
  className?: string;
}) {
  const valueTone = {
    default: 'text-ink',
    positive: 'text-positive',
    warning: 'text-warning',
    danger: 'text-danger',
    accent: 'text-accent',
  }[tone];

  return (
    <div className={cn('min-w-0', className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">{label}</p>
      <p className={cn('mt-1 truncate text-lg font-semibold tabular', valueTone)}>{value}</p>
      {hint && <p className="mt-0.5 truncate text-[12px] text-ink-soft">{hint}</p>}
    </div>
  );
}

/** Linha rótulo/valor usada nos detalhes de reservas. */
export function DetailRow({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div className={cn('flex items-baseline justify-between gap-4 py-1.5', className)}>
      <dt className="shrink-0 text-[12px] text-ink-faint">{label}</dt>
      <dd className="min-w-0 text-right text-[13px] font-medium text-ink">{value}</dd>
    </div>
  );
}
