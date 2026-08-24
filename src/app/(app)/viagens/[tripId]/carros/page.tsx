import type { Metadata } from 'next';
import { Car } from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { CarCard } from '@/components/cars/car-card';
import { AddCarButton } from '@/components/cars/add-car-button';

export const metadata: Metadata = { title: 'Aluguel de carro' };
export const dynamic = 'force-dynamic';

export default async function CarsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data: cars } = await supabase
    .from('car_rentals')
    .select('*')
    .eq('trip_id', tripId)
    .order('pickup_at');

  const list = cars ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Aluguel de carro"
        description="Onde retirar, quando devolver, o que está incluso e o telefone da locadora."
        action={canEdit && <AddCarButton tripId={tripId} label="Adicionar" />}
      />

      {list.length === 0 ? (
        <EmptyState
          icon={Car}
          title="Nenhum carro reservado"
          description="Cadastre a reserva para ter o local de retirada, o código e as condições sempre à mão."
          action={canEdit && <AddCarButton tripId={tripId} />}
        />
      ) : (
        <div className="space-y-4">
          {list.map((car) => (
            <CarCard key={car.id} car={car} tripId={tripId} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}
