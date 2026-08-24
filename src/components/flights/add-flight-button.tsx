'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { FlightForm } from '@/components/flights/flight-form';

export function AddFlightButton({
  tripId,
  defaultTimezone,
  defaultCurrency,
  label = 'Adicionar voo',
}: {
  tripId: string;
  defaultTimezone: string;
  defaultCurrency: string;
  label?: string;
}) {
  return (
    <ResourceDialog
      title="Adicionar voo"
      description="Um registro por trecho. Ida e volta são dois voos."
      autoOpenParam="novo"
      trigger={
        <Button size="sm">
          <Plus className="h-4 w-4" aria-hidden />
          {label}
        </Button>
      }
    >
      {(close) => (
        <FlightForm
          tripId={tripId}
          defaultTimezone={defaultTimezone}
          defaultCurrency={defaultCurrency}
          onDone={close}
        />
      )}
    </ResourceDialog>
  );
}
