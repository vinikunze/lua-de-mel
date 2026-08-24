import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const TONES = {
  info: { wrap: 'bg-info-soft text-info border-info/20', Icon: Info },
  warning: { wrap: 'bg-warning-soft text-warning border-warning/20', Icon: AlertTriangle },
  danger: { wrap: 'bg-danger-soft text-danger border-danger/20', Icon: XCircle },
  positive: { wrap: 'bg-positive-soft text-positive border-positive/20', Icon: CheckCircle2 },
} as const;

export function Alert({
  tone = 'info',
  title,
  children,
  className,
  action,
}: {
  tone?: keyof typeof TONES;
  title?: string;
  children?: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  const { wrap, Icon } = TONES[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-[12px] border px-4 py-3', wrap, className)}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 text-[13px] leading-relaxed">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
        {action && <div className="mt-2.5">{action}</div>}
      </div>
    </div>
  );
}
