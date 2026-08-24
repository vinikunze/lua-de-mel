'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { CarForm } from '@/components/cars/car-form';

export function AddCarButton({ tripId, label = 'Adicionar carro' }: { tripId: string; label?: string }) {
  return (
    <ResourceDialog
      title="Adicionar aluguel de carro"
      description="Retirada, devolução, valores e condições da locadora."
      autoOpenParam="novo"
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden />
          {label}
        </Button>
      }
    >
      {(close) => <CarForm tripId={tripId} onDone={close} />}
    </ResourceDialog>
  );
}
