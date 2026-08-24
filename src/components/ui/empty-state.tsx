import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  compact?: boolean;
}

/** Nenhuma tela fica vazia: sempre explicamos o que é e o que fazer em seguida. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface/60 text-center',
        compact ? 'px-5 py-8' : 'px-6 py-14',
        className,
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-muted">
          <Icon className="h-5 w-5 text-ink-faint" aria-hidden />
        </div>
      )}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-soft text-pretty">{description}</p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
