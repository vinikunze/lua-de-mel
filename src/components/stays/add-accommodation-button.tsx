'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { AccommodationForm } from '@/components/stays/accommodation-form';

export function AddAccommodationButton({ tripId, label = 'Adicionar hospedagem' }: { tripId: string; label?: string }) {
  return (
    <ResourceDialog
      title="Adicionar hospedagem"
      description="Hotel, Airbnb, pousada ou casa — os campos se ajustam ao tipo escolhido."
      autoOpenParam="novo"
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden />
          {label}
        </Button>
      }
    >
      {(close) => <AccommodationForm tripId={tripId} onDone={close} />}
    </ResourceDialog>
  );
}
