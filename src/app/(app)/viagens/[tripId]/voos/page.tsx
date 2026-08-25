import type { Metadata } from 'next';
import { Plane } from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { FlightCard } from '@/components/flights/flight-card';
import { AddFlightButton } from '@/components/flights/add-flight-button';
import { formatMoney } from '@/lib/format/money';
import { groupBy } from '@/lib/utils';
import type { FlightWithPassengers } from '@/server/queries/trips';

export const metadata: Metadata = { title: 'Voos' };
export const dynamic = 'force-dynamic';

export default async function FlightsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('flights')
    .select('*, passengers:flight_passengers(*)')
    .eq('trip_id', tripId)
    .order('departure_at');

  const flights = (data ?? []) as FlightWithPassengers[];
  const total = flights.reduce((acc, f) => acc + (Number(f.total_price) || 0), 0);
  const groups = groupBy(flights, (f) => f.group_label ?? 'Trechos');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Voos"
        description="Todos os trechos com horário no fuso certo, localizador, bagagem e assentos."
        action={
          canEdit && (
            <AddFlightButton
              tripId={tripId}
              defaultTimezone={trip.timezone}
              defaultCurrency={trip.base_currency}
            />
          )
        }
      />

      {flights.length === 0 ? (
        <EmptyState
          icon={Plane}
          title="Nenhum voo cadastrado"
          description="Adicione sua passagem para ver aqui os horários, o localizador e a bagagem — e para que o voo entre no roteiro e no PDF."
          action={
            canEdit && (
              <AddFlightButton
                tripId={tripId}
                defaultTimezone={trip.timezone}
                defaultCurrency={trip.base_currency}
                label="Adicionar voo"
              />
            )
          }
        />
      ) : (
        <div className="space-y-8">
          {[...groups.entries()].map(([label, list]) => (
            <section key={label}>
              <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                {label}
              </h2>
              <div className="space-y-4">
                {list.map((flight) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    tripId={tripId}
                    canEdit={canEdit}
                    defaultTimezone={trip.timezone}
                    defaultCurrency={trip.base_currency}
                  />
                ))}
              </div>
            </section>
          ))}

          {total > 0 && (
            <p className="border-t border-line pt-4 text-right text-[13px] text-ink-soft">
              Total em passagens:{' '}
              <span className="font-semibold text-ink tabular">{formatMoney(total, trip.base_currency)}</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
