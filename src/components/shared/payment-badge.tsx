import { Badge } from '@/components/ui/badge';
import { PAYMENT_STATUS_LABEL } from '@/lib/validators/expense';
import type { PaymentStatus } from '@/types/database';

const TONE: Record<PaymentStatus, 'positive' | 'warning' | 'danger' | 'neutral' | 'info'> = {
  paid: 'positive',
  partial: 'warning',
  unpaid: 'danger',
  refunded: 'info',
  cancelled: 'neutral',
};

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge tone={TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
}

export function ReservationBadge({ code }: { code: string | null }) {
  if (!code) return null;
  return (
    <Badge tone="outline" className="font-mono uppercase tracking-wide">
      {code}
    </Badge>
  );
}
