import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { QuickLinksBoard } from '@/components/trip/quick-links-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Links rápidos' };
export const dynamic = 'force-dynamic';

export default async function QuickLinksPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase.from('quick_links').select('*').eq('trip_id', tripId).order('position');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Links rápidos"
        description="Os endereços que você mais abre durante a viagem, a um toque de distância."
      />
      <QuickLinksBoard tripId={tripId} links={data ?? []} canEdit={canEdit} />
    </div>
  );
}
