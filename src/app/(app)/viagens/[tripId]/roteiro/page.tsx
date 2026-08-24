import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { buildTripEvents } from '@/lib/domain/timeline';
import { eachDayInRange } from '@/lib/format/date';
import { ItineraryBoard } from '@/components/itinerary/itinerary-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Roteiro' };
export const dynamic = 'force-dynamic';

export default async function ItineraryPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit } = await loadTripAccess(tripId);
  const bundle = await loadTripBundle(tripId, trip);

  const events = buildTripEvents({
    tripId,
    flights: bundle.flights,
    accommodations: bundle.accommodations,
    carRentals: bundle.carRentals,
    itinerary: bundle.itinerary,
    places: bundle.places,
  });

  const days = eachDayInRange(trip.start_date, trip.end_date);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Roteiro"
        description="A agenda dia a dia, com voos e reservas já posicionados. Arraste para reordenar — os horários só mudam quando você quiser."
      />

      <ItineraryBoard
        tripId={tripId}
        days={days}
        events={events}
        items={bundle.itinerary}
        places={bundle.places}
        canEdit={canEdit}
      />
    </div>
  );
}
