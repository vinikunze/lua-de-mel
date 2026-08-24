import type { Metadata } from 'next';
import { CalendarPlus, Download } from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { buildTripEvents } from '@/lib/domain/timeline';
import { TripCalendar } from '@/components/itinerary/trip-calendar';
import { PageHeader } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { googleCalendarUrlForEvent } from '@/lib/calendar/google-calendar';
import { formatShortWeekday, formatTime } from '@/lib/format/date';

export const metadata: Metadata = { title: 'Calendário' };
export const dynamic = 'force-dynamic';

export default async function CalendarPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip } = await loadTripAccess(tripId);
  const bundle = await loadTripBundle(tripId, trip);

  const events = buildTripEvents({
    tripId,
    flights: bundle.flights,
    accommodations: bundle.accommodations,
    carRentals: bundle.carRentals,
    itinerary: bundle.itinerary,
    places: bundle.places,
  });

  // Compromissos principais que fazem sentido levar para o calendário pessoal.
  const highlights = events
    .filter((e) => ['flight', 'accommodation', 'car', 'tour', 'event'].includes(e.category) && e.startsAt)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendário"
        description="A viagem inteira em formato de calendário: mês, semana, dia ou lista."
        action={
          <Button asChild variant="outline" size="sm">
            <a href={`/api/viagens/${tripId}/ics`} download>
              <Download className="h-4 w-4" aria-hidden />
              Baixar .ics
            </a>
          </Button>
        }
      />

      <TripCalendar
        events={events}
        startDate={trip.start_date}
        endDate={trip.end_date}
        timezone={trip.timezone}
      />

      {highlights.length > 0 && (
        <section>
          <h2 className="mb-2 text-[13px] font-semibold text-ink">Adicionar ao Google Calendar</h2>
          <p className="mb-3 text-[12px] text-ink-soft">
            Opcional. O sistema tem calendário próprio — isto serve para quem quer o compromisso também na
            agenda pessoal. O link abre o Google já preenchido, sem exigir nenhuma permissão.
          </p>
          <Card>
            <CardContent className="divide-y divide-line p-0">
              {highlights.map((event) => {
                const url = googleCalendarUrlForEvent(event);
                if (!url) return null;
                return (
                  <div key={event.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-medium text-ink">{event.title}</p>
                      <p className="text-[12px] text-ink-soft tabular">
                        {event.dayDate && formatShortWeekday(event.dayDate)} ·{' '}
                        {formatTime(event.startsAt, event.timezone)}
                      </p>
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-accent hover:underline"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" aria-hidden />
                      Adicionar
                    </a>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
