'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Car, ExternalLink, Fuel, MoreVertical, Pencil, Phone, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { EditDialog } from '@/components/shared/resource-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentBadge, ReservationBadge } from '@/components/shared/payment-badge';
import { CarForm } from '@/components/cars/car-form';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { deleteCarRentalAction } from '@/server/actions/cars';
import { toast } from '@/components/ui/toaster';
import { dateInZone, formatDate, timeInZone } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import type { CarRentalRow } from '@/types/database';

export function CarCard({ car, tripId, canEdit }: { car: CarRentalRow; tripId: string; canEdit: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteCarRentalAction(tripId, car.id);
    setDeleting(false);
    if (result.ok) {
      toast.success('Reserva removida.');
      setConfirming(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const balance = car.total_price != null ? Number(car.total_price) - Number(car.paid_amount ?? 0) : null;

  return (
    <Card id={`carro-${car.id}`} className="scroll-mt-24 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-cat-car)]/10 text-[var(--color-cat-car)]">
            <Car className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-ink">{car.company}</h3>
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">
              {[car.category, car.vehicle_model].filter(Boolean).join(' · ') || 'Veículo não informado'}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PaymentBadge status={car.payment_status} />
          {canEdit && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ações da reserva">
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </DropdownItem>
                <DropdownItem destructive onSelect={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Excluir
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      </div>

      <div className="grid gap-4 border-y border-line bg-surface-muted/40 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Retirada</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink tabular">
            {formatDate(dateInZone(car.pickup_at, car.pickup_timezone))} · {timeInZone(car.pickup_at, car.pickup_timezone)}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">{car.pickup_location ?? car.pickup_address ?? '—'}</p>
          {(car.pickup_address || car.pickup_location) && (
            <OpenRouteLink
              destination={{ address: car.pickup_address ?? car.pickup_location, name: car.pickup_location }}
              label="Rota"
              className="mt-1 text-[12px]"
            />
          )}
        </div>
        <ArrowRight className="hidden h-4 w-4 text-ink-faint sm:block" aria-hidden />
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Devolução</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink tabular">
            {formatDate(dateInZone(car.dropoff_at, car.dropoff_timezone))} · {timeInZone(car.dropoff_at, car.dropoff_timezone)}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {car.dropoff_location ?? car.dropoff_address ?? car.pickup_location ?? '—'}
          </p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <ReservationBadge code={car.booking_reference} />
          {car.days_count && <Badge tone="neutral">{car.days_count} diárias</Badge>}
          {car.insurance && <Badge tone="accent">{car.insurance}</Badge>}
          {car.fuel_policy && (
            <Badge tone="neutral">
              <Fuel className="h-3 w-3" aria-hidden />
              {car.fuel_policy}
            </Badge>
          )}
          {car.mileage_policy && <Badge tone="neutral">{car.mileage_policy}</Badge>}
        </div>

        {(car.total_price != null || car.deposit_amount != null) && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
            {car.total_price != null && (
              <span className="font-semibold text-ink tabular">{formatMoney(car.total_price, car.currency)}</span>
            )}
            {car.daily_rate != null && (
              <span className="text-ink-soft tabular">{formatMoney(car.daily_rate, car.currency)}/dia</span>
            )}
            {balance != null && balance > 0 && (
              <span className="text-warning tabular">saldo {formatMoney(balance, car.currency)}</span>
            )}
            {car.deposit_amount != null && (
              <span className="text-ink-faint tabular">caução {formatMoney(car.deposit_amount, car.currency)}</span>
            )}
          </div>
        )}

        {(car.main_driver || car.additional_driver) && (
          <p className="text-[12px] text-ink-soft">
            Motorista: {car.main_driver ?? '—'}
            {car.additional_driver && ` · Adicional: ${car.additional_driver}`}
          </p>
        )}

        <div className="flex flex-wrap gap-3 text-[12px]">
          {car.company_phone && (
            <a
              href={`tel:${car.company_phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {car.company_phone}
            </a>
          )}
          {car.booking_url && (
            <a
              href={car.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Abrir reserva
            </a>
          )}
        </div>

        {car.notes && (
          <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink-soft">{car.notes}</p>
        )}
      </div>

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar reserva do carro">
            <CarForm tripId={tripId} car={car} onDone={() => setEditing(false)} />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir esta reserva?"
            description="A reserva do veículo será removida da viagem."
            confirmLabel="Excluir reserva"
            loading={deleting}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Card>
  );
}
