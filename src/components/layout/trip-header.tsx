import Link from 'next/link';
import { ArrowLeft, FileDown, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarStack } from '@/components/ui/avatar';
import { formatCountdown, formatDateRange, tripPhase, todayInZone, tripDayCount } from '@/lib/format/date';
import { TRIP_STATUS_LABEL } from '@/lib/validators/trip';
import type { TripRow } from '@/types/database';
import type { TripMemberWithProfile } from '@/server/queries/trips';

export function TripHeader({ trip, members }: { trip: TripRow; members: TripMemberWithProfile[] }) {
  const today = todayInZone(trip.timezone);
  const phase = tripPhase(trip.start_date, trip.end_date, today);
  const days = tripDayCount(trip.start_date, trip.end_date);

  return (
    <div className="border-b border-line bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6">
        <Link
          href="/viagens"
          className="mb-3 inline-flex items-center gap-1.5 text-[12px] text-ink-soft transition-colors hover:text-ink"
        >
          <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
          Viagens
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-semibold leading-tight text-ink sm:text-[26px]">{trip.name}</h1>
              <Badge tone={phase === 'ongoing' ? 'positive' : phase === 'past' ? 'neutral' : 'accent'}>
                {phase === 'ongoing' ? 'Em andamento' : TRIP_STATUS_LABEL[trip.status]}
              </Badge>
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-ink-soft">
              <span className="tabular">{formatDateRange(trip.start_date, trip.end_date)}</span>
              <span className="text-ink-faint">·</span>
              <span className="tabular">{days} {days === 1 ? 'dia' : 'dias'}</span>
              <span className="text-ink-faint">·</span>
              <span>{trip.travelers_count} {trip.travelers_count === 1 ? 'viajante' : 'viajantes'}</span>
              {phase !== 'past' && (
                <>
                  <span className="text-ink-faint">·</span>
                  <span className="font-medium text-accent">
                    {phase === 'ongoing' ? formatCountdown(trip.end_date, today) : formatCountdown(trip.start_date, today)}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href={`/viagens/${trip.id}/participantes`}
              className="hidden items-center gap-2 sm:flex"
              aria-label="Participantes"
            >
              {members.length > 0 ? (
                <AvatarStack
                  people={members.map((m) => ({
                    name: m.profile?.full_name ?? m.display_name ?? m.invited_email,
                    avatarUrl: m.profile?.avatar_url,
                  }))}
                />
              ) : (
                <Users className="h-4 w-4 text-ink-faint" aria-hidden />
              )}
            </Link>
            <Button asChild variant="outline" size="sm">
              <Link href={`/viagens/${trip.id}/pdf`}>
                <FileDown className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Gerar PDF</span>
                <span className="sm:hidden">PDF</span>
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
