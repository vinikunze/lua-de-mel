import Link from 'next/link';
import {
  BedDouble, Car, CreditCard, MapPin, Plane, ShoppingBag, Sparkles, Ticket, UtensilsCrossed,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTime } from '@/lib/format/date';
import type { TripEvent } from '@/lib/domain/timeline';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  flight: Plane,
  accommodation: BedDouble,
  car: Car,
  restaurant: UtensilsCrossed,
  attraction: MapPin,
  tour: Ticket,
  transport: Car,
  shopping: ShoppingBag,
  event: Sparkles,
  payment: CreditCard,
  free: Sparkles,
  other: MapPin,
};

const CATEGORY_COLOR: Record<string, string> = {
  flight: 'text-[var(--color-cat-flight)] bg-[var(--color-cat-flight)]/10',
  accommodation: 'text-[var(--color-cat-accommodation)] bg-[var(--color-cat-accommodation)]/10',
  car: 'text-[var(--color-cat-car)] bg-[var(--color-cat-car)]/10',
  restaurant: 'text-[var(--color-cat-restaurant)] bg-[var(--color-cat-restaurant)]/10',
  attraction: 'text-[var(--color-cat-attraction)] bg-[var(--color-cat-attraction)]/10',
  tour: 'text-[var(--color-cat-tour)] bg-[var(--color-cat-tour)]/10',
  shopping: 'text-[var(--color-cat-shopping)] bg-[var(--color-cat-shopping)]/10',
  event: 'text-[var(--color-cat-event)] bg-[var(--color-cat-event)]/10',
  payment: 'text-[var(--color-cat-payment)] bg-[var(--color-cat-payment)]/10',
  other: 'text-[var(--color-cat-other)] bg-[var(--color-cat-other)]/10',
};

export function eventIcon(category: string): LucideIcon {
  return CATEGORY_ICON[category] ?? MapPin;
}

export function eventColor(category: string): string {
  return CATEGORY_COLOR[category] ?? CATEGORY_COLOR.other;
}

export function EventIcon({ category, className }: { category: string; className?: string }) {
  const Icon = CATEGORY_ICON[category] ?? MapPin;
  return (
    <span
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px]',
        eventColor(category),
        className,
      )}
    >
      <Icon className="h-4 w-4" aria-hidden />
    </span>
  );
}

/** Linha compacta de evento — usada no dashboard e nos resumos. */
export function EventRow({ event, showDay = false }: { event: TripEvent; showDay?: boolean }) {
  const content = (
    <div className="flex items-start gap-3">
      <EventIcon category={event.category} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{event.title}</p>
        <p className="mt-0.5 truncate text-[12px] text-ink-soft">
          {event.allDay ? (
            'A qualquer momento'
          ) : (
            <span className="tabular">{formatTime(event.startsAt, event.timezone)}</span>
          )}
          {showDay && event.dayDate && <span className="text-ink-faint"> · {event.dayDate.split('-').reverse().slice(0, 2).join('/')}</span>}
          {event.subtitle && <span className="text-ink-faint"> · {event.subtitle}</span>}
        </p>
      </div>
      {event.reservationCode && (
        <Badge tone="outline" className="shrink-0 font-mono text-[10px]">
          {event.reservationCode}
        </Badge>
      )}
    </div>
  );

  if (!event.href) return <div className="px-4 py-3">{content}</div>;

  return (
    <Link href={event.href} className="block px-4 py-3 transition-colors hover:bg-surface-muted">
      {content}
    </Link>
  );
}
