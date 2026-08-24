import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { PlacesBoard } from '@/components/maps/places-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Locais' };
export const dynamic = 'force-dynamic';

export default async function PlacesPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const [{ data: places }, { data: accommodations }] = await Promise.all([
    supabase.from('places').select('*').eq('trip_id', tripId).order('is_favorite', { ascending: false }).order('name'),
    supabase.from('accommodations').select('*').eq('trip_id', tripId).order('check_in_at'),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Locais"
        description="Restaurantes, atrações e pontos de interesse salvos. Reaproveite-os no roteiro e veja a distância da hospedagem."
      />

      <PlacesBoard
        tripId={tripId}
        places={places ?? []}
        accommodations={accommodations ?? []}
        canEdit={canEdit}
      />
    </div>
  );
}
