import Link from 'next/link';
import { ArrowRight, CalendarDays, MapPin, Users, Wallet } from 'lucide-react';
import { TripCover } from '@/components/trip/trip-cover';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { formatCountdown, formatDateRange, nightsBetween, tripDayCount } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import type { FinanceSummary } from '@/lib/domain/finance';
import type { TripRow } from '@/types/database';

interface NextTripHeroProps {
  trip: TripRow;
  memberCount: number;
  finance: FinanceSummary;
  ongoing: boolean;
}

/** Card grande do dashboard: a próxima viagem em um relance. */
export function NextTripHero({ trip, memberCount, finance, ongoing }: NextTripHeroProps) {
  const days = tripDayCount(trip.start_date, trip.end_date);
  const nights = nightsBetween(trip.start_date, trip.end_date);
  const target = finance.budget ?? finance.actual;

  return (
    <article className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
      <TripCover name={trip.name} imageUrl={trip.cover_image_url} className="h-40 sm:h-52">
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/15 to-transparent" aria-hidden />
        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-6">
          <Badge className="mb-2 bg-white/90 text-ink backdrop-blur">
            {ongoing ? 'Viagem em andamento' : 'Próxima viagem'}
          </Badge>
          <h2 className="text-[22px] font-semibold leading-tight text-white sm:text-[26px]">{trip.name}</h2>
          {trip.destination_label && (
            <p className="mt-1 flex items-center gap-1.5 text-[13px] text-white/80">
              <MapPin className="h-3.5 w-3.5" aria-hidden />
              {trip.destination_label}
            </p>
          )}
        </div>
      </TripCover>

      <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
        <dl className="space-y-2.5">
          <div className="flex items-center gap-2.5 text-[13px]">
            <CalendarDays className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            <dt className="sr-only">Período</dt>
            <dd className="text-ink">
              {formatDateRange(trip.start_date, trip.end_date)}
              <span className="ml-2 text-ink-faint tabular">
                · {days} {days === 1 ? 'dia' : 'dias'} / {nights} {nights === 1 ? 'noite' : 'noites'}
              </span>
            </dd>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <Users className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            <dt className="sr-only">Participantes</dt>
            <dd className="text-ink">
              {trip.travelers_count} {trip.travelers_count === 1 ? 'viajante' : 'viajantes'}
              {memberCount > 1 && <span className="text-ink-faint"> · {memberCount} com acesso</span>}
            </dd>
          </div>
          <div className="flex items-center gap-2.5 text-[13px]">
            <Wallet className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
            <dt className="sr-only">Orçamento</dt>
            <dd className="text-ink tabular">
              {formatMoney(finance.actual, trip.base_currency)} planejados
              <span className="text-ink-faint"> · {formatMoney(finance.paid, trip.base_currency)} pagos</span>
            </dd>
          </div>
        </dl>

        <div className="flex flex-col justify-between gap-4">
          <div className="rounded-[12px] bg-surface-muted px-4 py-3">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-ink-faint">
              {ongoing ? 'Termina em' : 'Contagem regressiva'}
            </p>
            <p className="mt-0.5 text-lg font-semibold text-ink">
              {ongoing ? formatCountdown(trip.end_date) : formatCountdown(trip.start_date)}
            </p>
          </div>

          {target > 0 && (
            <div>
              <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                <span className="text-ink-soft">Pago</span>
                <span className="font-medium text-ink tabular">
                  {formatMoney(finance.paid, trip.base_currency)} de {formatMoney(target, trip.base_currency)}
                </span>
              </div>
              <Progress
                value={finance.paid}
                max={target}
                tone={finance.overBudget ? 'warning' : 'accent'}
                label="Progresso dos pagamentos"
              />
              {finance.outstanding > 0 && (
                <p className="mt-1.5 text-[12px] text-ink-soft tabular">
                  Faltam {formatMoney(finance.outstanding, trip.base_currency)} a pagar
                </p>
              )}
            </div>
          )}

          <Link
            href={`/viagens/${trip.id}`}
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
          >
            Abrir a viagem
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </article>
  );
}
