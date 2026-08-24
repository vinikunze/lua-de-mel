'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  BedDouble, Car, Coffee, ExternalLink, KeyRound, MoreVertical, Pencil, Phone, Trash2, Wifi,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { EditDialog } from '@/components/shared/resource-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentBadge, ReservationBadge } from '@/components/shared/payment-badge';
import { AccommodationForm } from '@/components/stays/accommodation-form';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { deleteAccommodationAction } from '@/server/actions/accommodations';
import { toast } from '@/components/ui/toaster';
import { dateInZone, formatDate, nightsBetween, timeInZone } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { ACCOMMODATION_KIND_LABEL } from '@/lib/validators/accommodation';
import type { AccommodationRow } from '@/types/database';

export function AccommodationCard({
  accommodation,
  tripId,
  canEdit,
}: {
  accommodation: AccommodationRow;
  tripId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const tz = accommodation.timezone;
  const checkInDay = dateInZone(accommodation.check_in_at, tz);
  const checkOutDay = dateInZone(accommodation.check_out_at, tz);
  const nights = nightsBetween(checkInDay, checkOutDay);
  const balance =
    accommodation.total_price != null
      ? Number(accommodation.total_price) - Number(accommodation.paid_amount ?? 0)
      : null;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteAccommodationAction(tripId, accommodation.id);
    setDeleting(false);
    if (result.ok) {
      toast.success('Hospedagem removida.');
      setConfirming(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card id={`hospedagem-${accommodation.id}`} className="scroll-mt-24 overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4 pb-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-[var(--color-cat-accommodation)]/10 text-[var(--color-cat-accommodation)]">
            <BedDouble className="h-4.5 w-4.5" aria-hidden />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold text-ink">{accommodation.name}</h3>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-soft">
              <span>{ACCOMMODATION_KIND_LABEL[accommodation.kind]}</span>
              {accommodation.platform && (
                <>
                  <span className="text-ink-faint">·</span>
                  <span>{accommodation.platform}</span>
                </>
              )}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PaymentBadge status={accommodation.payment_status} />
          {canEdit && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ações da hospedagem">
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

      <div className="grid grid-cols-3 gap-2 border-y border-line bg-surface-muted/40 px-4 py-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Check-in</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink tabular">{formatDate(checkInDay)}</p>
          <p className="text-[11px] text-ink-soft tabular">{timeInZone(accommodation.check_in_at, tz)}</p>
        </div>
        <div className="border-x border-line">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Noites</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink tabular">{nights}</p>
          {accommodation.guests && (
            <p className="text-[11px] text-ink-soft">{accommodation.guests} hóspedes</p>
          )}
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Check-out</p>
          <p className="mt-0.5 text-[13px] font-semibold text-ink tabular">{formatDate(checkOutDay)}</p>
          <p className="text-[11px] text-ink-soft tabular">{timeInZone(accommodation.check_out_at, tz)}</p>
        </div>
      </div>

      <div className="space-y-3 p-4">
        {accommodation.address && (
          <div className="flex items-start justify-between gap-3">
            <p className="min-w-0 text-[13px] leading-relaxed text-ink-soft">{accommodation.address}</p>
            <OpenRouteLink
              destination={{
                latitude: accommodation.latitude,
                longitude: accommodation.longitude,
                address: accommodation.address,
                name: accommodation.name,
                googlePlaceId: accommodation.google_place_id,
              }}
              label="Rota"
              className="shrink-0"
            />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <ReservationBadge code={accommodation.booking_reference} />
          {accommodation.room_type && <Badge tone="neutral">{accommodation.room_type}</Badge>}
          {accommodation.breakfast_included && (
            <Badge tone="positive">
              <Coffee className="h-3 w-3" aria-hidden />
              Café incluso
            </Badge>
          )}
          {accommodation.parking_included && (
            <Badge tone="positive">
              <Car className="h-3 w-3" aria-hidden />
              Estacionamento
            </Badge>
          )}
        </div>

        {(accommodation.wifi_password || accommodation.access_instructions || accommodation.host_name) && (
          <dl className="space-y-1.5 rounded-[10px] bg-surface-muted px-3 py-2.5 text-[12px]">
            {accommodation.host_name && (
              <div className="flex gap-2">
                <dt className="text-ink-faint">Anfitrião:</dt>
                <dd className="text-ink">{accommodation.host_name}{accommodation.host_contact ? ` · ${accommodation.host_contact}` : ''}</dd>
              </div>
            )}
            {accommodation.wifi_password && (
              <div className="flex gap-2">
                <dt className="flex items-center gap-1 text-ink-faint">
                  <Wifi className="h-3 w-3" aria-hidden />
                  Wi-Fi:
                </dt>
                <dd className="font-mono text-ink">{accommodation.wifi_password}</dd>
              </div>
            )}
            {accommodation.access_instructions && (
              <div className="flex gap-2">
                <dt className="flex items-center gap-1 text-ink-faint">
                  <KeyRound className="h-3 w-3" aria-hidden />
                  Entrada:
                </dt>
                <dd className="text-ink">{accommodation.access_instructions}</dd>
              </div>
            )}
          </dl>
        )}

        {accommodation.total_price != null && (
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-[13px]">
            <span className="font-semibold text-ink tabular">
              {formatMoney(accommodation.total_price, accommodation.currency)}
            </span>
            {Number(accommodation.paid_amount) > 0 && (
              <span className="text-ink-soft tabular">
                pago {formatMoney(accommodation.paid_amount, accommodation.currency)}
              </span>
            )}
            {balance != null && balance > 0 && (
              <span className="text-warning tabular">
                saldo {formatMoney(balance, accommodation.currency)}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-3 text-[12px]">
          {accommodation.phone && (
            <a
              href={`tel:${accommodation.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden />
              {accommodation.phone}
            </a>
          )}
          {accommodation.booking_url && (
            <a
              href={accommodation.booking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Abrir reserva
            </a>
          )}
        </div>

        {accommodation.notes && (
          <p className="border-t border-line pt-3 text-[12px] leading-relaxed text-ink-soft">
            {accommodation.notes}
          </p>
        )}
      </div>

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar hospedagem">
            <AccommodationForm tripId={tripId} accommodation={accommodation} onDone={() => setEditing(false)} />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir esta hospedagem?"
            description="A reserva será removida da viagem. Documentos anexados continuam disponíveis."
            confirmLabel="Excluir hospedagem"
            loading={deleting}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Card>
  );
}
