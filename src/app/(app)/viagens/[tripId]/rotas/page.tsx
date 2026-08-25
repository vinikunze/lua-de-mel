import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { RoutePlanner } from '@/components/maps/route-planner';
import { PageHeader } from '@/components/ui/section';
import { eachDayInRange } from '@/lib/format/date';
import type { RouteWithWaypoints } from '@/server/queries/trips';

export const metadata: Metadata = { title: 'Rotas' };
export const dynamic = 'force-dynamic';

export default async function RoutesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const [{ data: places }, { data: routes }] = await Promise.all([
    supabase.from('places').select('*').eq('trip_id', tripId).order('name'),
    supabase
      .from('routes')
      .select('*, waypoints:route_waypoints(*)')
      .eq('trip_id', tripId)
      .order('created_at', { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rotas"
        description="Trajetos com várias paradas: distância, tempo por trecho e um link que abre tudo no Google Maps."
      />

      <RoutePlanner
        tripId={tripId}
        places={places ?? []}
        routes={(routes ?? []) as RouteWithWaypoints[]}
        days={eachDayInRange(trip.start_date, trip.end_date)}
        canEdit={canEdit}
      />
    </div>
  );
}
