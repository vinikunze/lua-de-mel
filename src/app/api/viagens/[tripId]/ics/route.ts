import { NextResponse } from 'next/server';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { buildTripEvents } from '@/lib/domain/timeline';
import { buildIcsCalendar } from '@/lib/calendar/ics';
import { slugify } from '@/lib/utils';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

/** Exporta o roteiro em .ics para qualquer aplicativo de calendário. */
export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  try {
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

    const ics = buildIcsCalendar(trip.name, events);

    return new NextResponse(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(trip.name) || 'viagem'}.ics"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return new NextResponse(error.message, { status: 403 });
    }
    console.error('[api/viagens/ics]', error);
    return new NextResponse('Não foi possível gerar o calendário.', { status: 500 });
  }
}
