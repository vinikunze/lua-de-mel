import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { buildTripEvents } from '@/lib/domain/timeline';
import { eachDayInRange } from '@/lib/format/date';
import { TripMap } from '@/components/maps/trip-map';
import { PageHeader } from '@/components/ui/section';
import { Alert } from '@/components/ui/alert';
import { GOOGLE_MAPS_BROWSER_KEY, GOOGLE_MAPS_MAP_ID } from '@/lib/env';
import { googleCapabilities } from '@/lib/google/config';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Mapa' };
export const dynamic = 'force-dynamic';

export default async function MapPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip } = await loadTripAccess(tripId);
  const bundle = await loadTripBundle(tripId, trip);
  const caps = googleCapabilities();

  const events = buildTripEvents({
    tripId,
    flights: bundle.flights,
    accommodations: bundle.accommodations,
    carRentals: bundle.carRentals,
    itinerary: bundle.itinerary,
    places: bundle.places,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mapa"
        description="Todos os locais da viagem. Filtre por dia para ver o trajeto daquele dia na ordem do roteiro."
      />

      {!caps.interactiveMap && (
        <Alert tone="info" title="Mapa interativo desativado">
          Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para ver o mapa aqui dentro. Enquanto isso,
          todos os locais continuam listados e cada um abre direto no Google Maps.{' '}
          <Link href="/configurar" className="font-semibold underline">
            Como configurar
          </Link>
        </Alert>
      )}

      <TripMap
        tripId={tripId}
        events={events}
        places={bundle.places}
        days={eachDayInRange(trip.start_date, trip.end_date)}
        apiKey={GOOGLE_MAPS_BROWSER_KEY ?? null}
        mapId={GOOGLE_MAPS_MAP_ID ?? null}
      />
    </div>
  );
}
