import Link from 'next/link';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { TripCover } from '@/components/trip/trip-cover';
import { Badge } from '@/components/ui/badge';
import { formatCountdown, formatDateRange, tripDayCount } from '@/lib/format/date';
import { formatMoneyCompact } from '@/lib/format/money';
import type { TripListItem } from '@/server/queries/trips';
import { TRIP_STATUS_LABEL } from '@/lib/validators/trip';
import { ROLE_LABEL } from '@/lib/permissions';

export function TripCard({ trip }: { trip: TripListItem }) {
  const days = tripDayCount(trip.start_date, trip.end_date);

  return (
    <Link
      href={`/viagens/${trip.id}`}
      className="group block overflow-hidden rounded-[14px] border border-line bg-surface shadow-card transition-shadow hover:shadow-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
    >
      <TripCover name={trip.name} imageUrl={trip.cover_image_url} className="h-32">
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <Badge tone={trip.phase === 'ongoing' ? 'positive' : 'neutral'} className="bg-white/90 text-ink backdrop-blur">
            {trip.phase === 'ongoing' ? 'Em andamento' : TRIP_STATUS_LABEL[trip.status]}
          </Badge>
          {trip.role !== 'owner' && (
            <Badge className="bg-black/40 text-white backdrop-blur">{ROLE_LABEL[trip.role]}</Badge>
          )}
        </div>
      </TripCover>

      <div className="p-4">
        <h3 className="truncate text-[15px] font-semibold text-ink">{trip.name}</h3>

        {trip.destination_label && (
          <p className="mt-1 flex items-center gap-1.5 truncate text-[13px] text-ink-soft">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {trip.destination_label}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[12px] text-ink-soft">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" aria-hidden />
            {formatDateRange(trip.start_date, trip.end_date)}
          </span>
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {trip.memberCount} {trip.memberCount === 1 ? 'pessoa' : 'pessoas'}
          </span>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-line pt-3">
          <span className="text-[12px] font-medium text-ink tabular">
            {trip.phase === 'past' ? `${days} dias` : formatCountdown(trip.start_date)}
          </span>
          {trip.estimated_budget != null && (
            <span className="text-[12px] text-ink-faint tabular">
              {formatMoneyCompact(trip.estimated_budget, trip.base_currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
