import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { ContactsBoard } from '@/components/trip/contacts-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Informações rápidas' };
export const dynamic = 'force-dynamic';

export default async function ContactsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('important_contacts')
    .select('*')
    .eq('trip_id', tripId)
    .order('position');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Informações rápidas"
        description="Telefones, endereços e números que você pode precisar em um aperto."
      />
      <ContactsBoard tripId={tripId} contacts={data ?? []} canEdit={canEdit} />
    </div>
  );
}
