import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertCircle, CalendarClock, FileText, ListChecks, Luggage, Plus } from 'lucide-react';
import { listTrips, loadTripBundle } from '@/server/queries/trips';
import { NextTripHero } from '@/components/trip/next-trip-hero';
import { TripCard } from '@/components/trip/trip-card';
import { EventRow } from '@/components/trip/event-row';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader, SectionHeader } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { buildTripEvents, nextEvent } from '@/lib/domain/timeline';
import { summarizeExpenses, upcomingPayments } from '@/lib/domain/finance';
import { formatCountdown, formatDate, todayInZone } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { APP } from '@/lib/config';

export const metadata: Metadata = { title: 'Início' };
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const trips = await listTrips();

  if (trips.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <PageHeader
          title={`Bem-vindo ao ${APP.name}`}
          description="Crie sua primeira viagem e centralize voos, hospedagem, roteiro, mapas, gastos e documentos."
        />
        <EmptyState
          className="mt-8"
          icon={Luggage}
          title="Nenhuma viagem por aqui ainda"
          description="Comece pelo básico: nome, destino e datas. Você adiciona as reservas depois, no seu ritmo."
          action={
            <Button asChild size="lg">
              <Link href="/viagens/nova">
                <Plus className="h-4 w-4" aria-hidden />
                Criar primeira viagem
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  // A viagem em destaque: a que está acontecendo ou a próxima a começar.
  const ongoing = trips.filter((t) => t.phase === 'ongoing').sort((a, b) => a.start_date.localeCompare(b.start_date));
  const upcoming = trips.filter((t) => t.phase === 'upcoming').sort((a, b) => a.start_date.localeCompare(b.start_date));
  const past = trips.filter((t) => t.phase === 'past');
  const featured = ongoing[0] ?? upcoming[0] ?? null;

  const bundle = featured ? await loadTripBundle(featured.id, featured) : null;

  const events = bundle
    ? buildTripEvents({
        tripId: bundle.trip.id,
        flights: bundle.flights,
        accommodations: bundle.accommodations,
        carRentals: bundle.carRentals,
        itinerary: bundle.itinerary,
        places: bundle.places,
      })
    : [];

  const finance = bundle
    ? summarizeExpenses(bundle.expenses, bundle.trip.estimated_budget)
    : { budget: null, planned: 0, actual: 0, paid: 0, outstanding: 0, available: null, overBudget: false };

  const upcomingEvents = events.filter((e) => e.startsAt && e.startsAt >= new Date().toISOString()).slice(0, 4);
  const next = nextEvent(events);
  const today = bundle ? todayInZone(bundle.trip.timezone) : todayInZone();
  const duePayments = bundle ? upcomingPayments(bundle.expenses, today).slice(0, 4) : [];
  const pendingTasks = bundle
    ? bundle.checklists.flatMap((list) => list.items.filter((i) => !i.is_done)).slice(0, 5)
    : [];
  const otherTrips = trips.filter((t) => t.id !== featured?.id).slice(0, 6);

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Início"
        description={
          featured
            ? 'Onde você precisa estar, quanto já foi pago e o que ainda falta resolver.'
            : 'Suas viagens em um só lugar.'
        }
        action={
          <Button asChild size="sm" className="sm:hidden">
            <Link href="/viagens/nova">
              <Plus className="h-4 w-4" aria-hidden />
              Nova
            </Link>
          </Button>
        }
      />

      {featured && bundle && (
        <NextTripHero
          trip={bundle.trip}
          memberCount={featured.memberCount}
          finance={finance}
          ongoing={featured.phase === 'ongoing'}
        />
      )}

      {next && featured && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-ink-faint" aria-hidden />
              Próximo compromisso
            </CardTitle>
            {next.dayDate && <Badge tone="accent">{formatCountdown(next.dayDate, today)}</Badge>}
          </CardHeader>
          <CardContent className="px-0 pb-1">
            <EventRow event={next} showDay />
            {upcomingEvents.length > 1 && (
              <div className="mt-1 border-t border-line pt-1">
                {upcomingEvents.slice(1).map((event) => (
                  <EventRow key={event.id} event={event} showDay />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {featured && (
        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-ink-faint" aria-hidden />
                Pagamentos pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {duePayments.length === 0 ? (
                <p className="text-[13px] text-ink-soft">Nada vencendo nos próximos dias.</p>
              ) : (
                <ul className="space-y-2.5">
                  {duePayments.map((expense) => (
                    <li key={expense.id} className="flex items-baseline justify-between gap-3 text-[13px]">
                      <span className="truncate text-ink">{expense.description}</span>
                      <span className="shrink-0 text-right">
                        <span className="block font-medium text-ink tabular">
                          {formatMoney(expense.actual_amount ?? expense.planned_amount, expense.currency)}
                        </span>
                        {expense.due_date && (
                          <span className="block text-[11px] text-warning">vence {formatDate(expense.due_date)}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/viagens/${featured.id}/financeiro`}
                className="mt-4 inline-block text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
              >
                Ver financeiro
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-ink-faint" aria-hidden />
                Tarefas pendentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <p className="text-[13px] text-ink-soft">Tudo em dia por aqui.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingTasks.map((item) => (
                    <li key={item.id} className="flex items-start gap-2 text-[13px] text-ink">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-line-strong" aria-hidden />
                      <span className="truncate">{item.title}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href={`/viagens/${featured.id}/checklist`}
                className="mt-4 inline-block text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
              >
                Abrir checklist
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-ink-faint" aria-hidden />
                Documentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {bundle && bundle.documents.length > 0 ? (
                <ul className="space-y-2">
                  {bundle.documents.slice(0, 5).map((doc) => (
                    <li key={doc.id} className="truncate text-[13px] text-ink">
                      {doc.name}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-[13px] text-ink-soft">
                  Nenhum voucher anexado. Guarde aqui cartões de embarque e comprovantes.
                </p>
              )}
              <Link
                href={`/viagens/${featured.id}/documentos`}
                className="mt-4 inline-block text-[13px] font-semibold text-accent underline-offset-4 hover:underline"
              >
                Ver documentos
              </Link>
            </CardContent>
          </Card>
        </div>
      )}

      {otherTrips.length > 0 && (
        <section>
          <SectionHeader
            title="Suas outras viagens"
            count={trips.length - 1}
            action={
              <Link href="/viagens" className="text-[13px] font-semibold text-accent underline-offset-4 hover:underline">
                Ver todas
              </Link>
            }
          />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {otherTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        </section>
      )}

      {!featured && past.length > 0 && (
        <p className="text-[13px] text-ink-soft">
          Você tem {past.length} {past.length === 1 ? 'viagem finalizada' : 'viagens finalizadas'} no histórico.
        </p>
      )}
    </div>
  );
}
