import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { DocumentsBoard } from '@/components/documents/documents-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Documentos' };
export const dynamic = 'force-dynamic';

export default async function DocumentsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('documents')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Documentos"
        description="Vouchers, cartões de embarque, ingressos e comprovantes da viagem."
      />
      <DocumentsBoard tripId={tripId} documents={data ?? []} canEdit={canEdit} />
    </div>
  );
}
