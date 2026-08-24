import type { Metadata } from 'next';
import { BedDouble } from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { AccommodationCard } from '@/components/stays/accommodation-card';
import { AddAccommodationButton } from '@/components/stays/add-accommodation-button';
import { formatMoney } from '@/lib/format/money';

export const metadata: Metadata = { title: 'Hospedagens' };
export const dynamic = 'force-dynamic';

export default async function AccommodationsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data: accommodations } = await supabase
    .from('accommodations')
    .select('*')
    .eq('trip_id', tripId)
    .order('check_in_at');

  const list = accommodations ?? [];
  const total = list.reduce((acc, a) => acc + (Number(a.total_price) || 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hospedagens"
        description="Endereço, check-in, código da reserva e instruções de entrada — tudo à mão na chegada."
        action={canEdit && <AddAccommodationButton tripId={tripId} label="Adicionar" />}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={BedDouble}
          title="Nenhuma hospedagem cadastrada"
          description="Adicione onde você vai ficar para ter o endereço, o telefone e o código da reserva sempre por perto."
          action={canEdit && <AddAccommodationButton tripId={tripId} />}
        />
      ) : (
        <div className="space-y-4">
          {list.map((accommodation) => (
            <AccommodationCard
              key={accommodation.id}
              accommodation={accommodation}
              tripId={tripId}
              canEdit={canEdit}
            />
          ))}
          {total > 0 && (
            <p className="border-t border-line pt-4 text-right text-[13px] text-ink-soft">
              Total em hospedagem:{' '}
              <span className="font-semibold text-ink tabular">{formatMoney(total, trip.base_currency)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
