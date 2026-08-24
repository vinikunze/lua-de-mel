import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BedDouble, CalendarDays, Car, CheckSquare, Clock, FileText, Plane, Sparkles, Wallet,
} from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { syncTripStatus } from '@/server/actions/trips';
import { buildTripEvents, eventsOfDay, nextEvent } from '@/lib/domain/timeline';
import { summarizeExpenses } from '@/lib/domain/finance';
import {
  formatCountdown, formatDate, formatFullWeekday, formatTime, todayInZone, tripPhase,
} from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SummaryTile } from '@/components/trip/summary-tile';
import { EventRow, EventIcon } from '@/components/trip/event-row';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { SectionHeader } from '@/components/ui/section';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tripId: string }>;
}): Promise<Metadata> {
  const { tripId } = await params;
  try {
    const { trip } = await loadTripAccess(tripId);
    return { title: trip.name };
  } catch {
    return { title: 'Viagem' };
  }
}

export default async function TripHomePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit } = await loadTripAccess(tripId);
  await syncTripStatus(tripId);

  const bundle = await loadTripBundle(tripId, trip);
  const events = buildTripEvents({
    tripId,
    flights: bundle.flights,
    accommodations: bundle.accommodations,
    carRentals: bundle.carRentals,
    itinerary: bundle.itinerary,
    places: bundle.places,
  });

  const today = todayInZone(trip.timezone);
  const phase = tripPhase(trip.start_date, trip.end_date, today);
  const travelMode = phase === 'ongoing';

  // Modo Viagem: a agenda de hoje vira o assunto principal.
  const focusDay = travelMode ? today : trip.start_date;
  const dayEvents = eventsOfDay(events, focusDay);
  const next = nextEvent(events);
  const finance = summarizeExpenses(bundle.expenses, trip.estimated_budget);

  const nowIso = new Date().toISOString();
  const nextFlight = bundle.flights.find((f) => f.departure_at >= nowIso) ?? bundle.flights[0] ?? null;
  const currentStay =
    bundle.accommodations.find((a) => a.check_in_at <= nowIso && a.check_out_at >= nowIso) ??
    bundle.accommodations.find((a) => a.check_in_at >= nowIso) ??
    null;
  const activeCar =
    bundle.carRentals.find((c) => c.pickup_at <= nowIso && c.dropoff_at >= nowIso) ??
    bundle.carRentals.find((c) => c.pickup_at >= nowIso) ??
    null;

  const checklistItems = bundle.checklists.flatMap((l) => l.items);
  const doneCount = checklistItems.filter((i) => i.is_done).length;

  return (
    <div className="space-y-8">
      {/* -------------------------------------------------- Modo Viagem */}
      {travelMode && (
        <section className="rounded-[16px] border border-accent/25 bg-accent-soft p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-strong">
            Modo viagem · Hoje
          </p>
          <h2 className="mt-1 text-lg font-semibold capitalize text-ink">{formatFullWeekday(today)}</h2>

          {next && next.dayDate === today ? (
            <div className="mt-4 rounded-[12px] bg-surface p-4">
              <div className="flex items-start gap-3">
                <EventIcon category={next.category} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                    Próximo compromisso
                  </p>
                  <p className="mt-0.5 text-[15px] font-semibold text-ink">{next.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft tabular">
                    {next.allDay ? 'A qualquer momento' : formatTime(next.startsAt, next.timezone)}
                    {next.address && <span className="text-ink-faint"> · {next.address}</span>}
                  </p>
                </div>
              </div>
              {(next.latitude != null || next.address) && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <OpenRouteLink
                    destination={{
                      latitude: next.latitude,
                      longitude: next.longitude,
                      address: next.address,
                      name: next.title,
                      googlePlaceId: next.googlePlaceId,
                    }}
                    variant="button"
                    label="Abrir rota"
                  />
                  {next.phone && (
                    <a
                      href={`tel:${next.phone.replace(/\s/g, '')}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink"
                    >
                      Ligar
                    </a>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className="mt-3 text-[13px] text-ink-soft">
              {dayEvents.length === 0
                ? 'Nenhum compromisso marcado para hoje. Dia livre.'
                : 'Todos os compromissos de hoje já passaram.'}
            </p>
          )}
        </section>
      )}

      {/* -------------------------------------------------- Resumo */}
      <section>
        <SectionHeader title="Resumo" />
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <SummaryTile
            icon={Plane}
            label="Próximo voo"
            value={
              nextFlight
                ? `${nextFlight.origin_iata ?? '—'} → ${nextFlight.destination_iata ?? '—'}`
                : 'Sem voos'
            }
            hint={
              nextFlight
                ? `${formatDate(nextFlight.departure_at.slice(0, 10))} · ${formatTime(nextFlight.departure_at, nextFlight.origin_timezone)}`
                : 'Cadastre sua passagem'
            }
            href={`/viagens/${tripId}/voos`}
          />
          <SummaryTile
            icon={BedDouble}
            label="Hospedagem"
            value={currentStay?.name ?? 'Sem hospedagem'}
            hint={
              currentStay
                ? `Check-in ${formatDate(currentStay.check_in_at.slice(0, 10))}`
                : 'Cadastre onde você vai ficar'
            }
            href={`/viagens/${tripId}/hospedagens`}
          />
          <SummaryTile
            icon={Car}
            label="Carro"
            value={activeCar?.company ?? 'Sem carro'}
            hint={
              activeCar
                ? `Retirada ${formatDate(activeCar.pickup_at.slice(0, 10))}`
                : 'Cadastre a locadora'
            }
            href={`/viagens/${tripId}/carros`}
          />
          <SummaryTile
            icon={Wallet}
            label="Gastos"
            value={formatMoney(finance.actual, trip.base_currency)}
            hint={
              finance.outstanding > 0
                ? `${formatMoney(finance.outstanding, trip.base_currency)} a pagar`
                : 'Tudo pago'
            }
            href={`/viagens/${tripId}/financeiro`}
            tone={finance.overBudget ? 'warning' : 'default'}
          />
          <SummaryTile
            icon={Clock}
            label={phase === 'past' ? 'Situação' : phase === 'ongoing' ? 'Termina em' : 'Faltam'}
            value={
              phase === 'past'
                ? 'Finalizada'
                : phase === 'ongoing'
                  ? formatCountdown(trip.end_date, today)
                  : formatCountdown(trip.start_date, today)
            }
            hint={`${formatDate(trip.start_date)} — ${formatDate(trip.end_date)}`}
          />
          <SummaryTile
            icon={CheckSquare}
            label="Checklist"
            value={checklistItems.length > 0 ? `${doneCount}/${checklistItems.length}` : 'Vazio'}
            hint={
              checklistItems.length > 0
                ? `${checklistItems.length - doneCount} pendentes`
                : 'Monte sua lista'
            }
            href={`/viagens/${tripId}/checklist`}
            tone={checklistItems.length > 0 && doneCount === checklistItems.length ? 'positive' : 'default'}
          />
          <SummaryTile
            icon={FileText}
            label="Documentos"
            value={String(bundle.documents.length)}
            hint={bundle.documents.length === 0 ? 'Nenhum anexo' : 'Vouchers e comprovantes'}
            href={`/viagens/${tripId}/documentos`}
          />
          <SummaryTile
            icon={Sparkles}
            label="Roteiro"
            value={`${bundle.itinerary.length} eventos`}
            hint={`${bundle.places.length} locais salvos`}
            href={`/viagens/${tripId}/roteiro`}
          />
        </div>
      </section>

      {/* -------------------------------------------------- Agenda do dia */}
      <section>
        <SectionHeader
          title={travelMode ? 'Agenda de hoje' : 'Primeiro dia da viagem'}
          action={
            <Link
              href={`/viagens/${tripId}/roteiro`}
              className="text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
            >
              Ver roteiro completo
            </Link>
          }
        />
        <p className="mt-1 text-[13px] capitalize text-ink-soft">{formatFullWeekday(focusDay)}</p>

        <Card className="mt-3 overflow-hidden">
          {dayEvents.length === 0 ? (
            <EmptyState
              compact
              icon={CalendarDays}
              className="border-0 bg-transparent"
              title="Nenhum evento neste dia"
              description="Monte o roteiro adicionando passeios, restaurantes e horários."
              action={
                canEdit && (
                  <Button asChild size="sm">
                    <Link href={`/viagens/${tripId}/roteiro?novo=1`}>Adicionar evento</Link>
                  </Button>
                )
              }
            />
          ) : (
            <div className="divide-y divide-line">
              {dayEvents.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </div>
          )}
        </Card>
      </section>

      {/* -------------------------------------------------- Informações rápidas */}
      {(bundle.contacts.length > 0 || bundle.quickLinks.length > 0) && (
        <section className="grid gap-4 lg:grid-cols-2">
          {bundle.contacts.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Contatos importantes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {bundle.contacts.slice(0, 5).map((contact) => (
                  <div key={contact.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink">{contact.label}</span>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone.replace(/\s/g, '')}`}
                        className="shrink-0 font-medium text-accent tabular"
                      >
                        {contact.phone}
                      </a>
                    )}
                  </div>
                ))}
                <Link
                  href={`/viagens/${tripId}/informacoes`}
                  className="inline-block pt-1 text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
                >
                  Ver todos
                </Link>
              </CardContent>
            </Card>
          )}

          {bundle.quickLinks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Links rápidos</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {bundle.quickLinks.slice(0, 8).map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-full border border-line-strong px-3 py-1.5 text-[12px] font-medium text-ink transition-colors hover:bg-surface-muted"
                  >
                    {link.label}
                  </a>
                ))}
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {trip.description && (
        <section>
          <SectionHeader title="Sobre a viagem" />
          <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink-soft">{trip.description}</p>
        </section>
      )}

      {phase === 'past' && (
        <Badge tone="neutral" className="text-[12px]">
          Esta viagem já aconteceu — os dados continuam guardados para consulta.
        </Badge>
      )}
    </div>
  );
}
