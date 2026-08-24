'use client';

import { useState } from 'react';
import { ArrowRight, ExternalLink, MoreVertical, Pencil, Plane, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { EditDialog } from '@/components/shared/resource-dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { PaymentBadge, ReservationBadge } from '@/components/shared/payment-badge';
import { FlightForm } from '@/components/flights/flight-form';
import { deleteFlightAction } from '@/server/actions/flights';
import { toast } from '@/components/ui/toaster';
import { useRouter } from 'next/navigation';
import {
  dateInZone, dayShift, formatDate, formatSpan, timeInZone, timezoneAbbreviation,
} from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import type { FlightWithPassengers } from '@/server/queries/trips';

export function FlightCard({
  flight,
  tripId,
  canEdit,
  defaultTimezone,
  defaultCurrency,
}: {
  flight: FlightWithPassengers;
  tripId: string;
  canEdit: boolean;
  defaultTimezone: string;
  defaultCurrency: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const departureDay = dateInZone(flight.departure_at, flight.origin_timezone);
  const shift = flight.arrival_at
    ? dayShift(flight.departure_at, flight.origin_timezone, flight.arrival_at, flight.destination_timezone)
    : 0;
  const differentZones = flight.origin_timezone !== flight.destination_timezone;

  async function handleDelete() {
    setDeleting(true);
    const result = await deleteFlightAction(tripId, flight.id);
    setDeleting(false);
    if (result.ok) {
      toast.success('Voo removido.');
      setConfirming(false);
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Card id={`voo-${flight.id}`} className="scroll-mt-24 overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line bg-surface-muted/50 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <Plane className="h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
          <span className="truncate text-[13px] font-medium text-ink">
            {[flight.airline, flight.flight_number].filter(Boolean).join(' ') || 'Voo'}
          </span>
          {flight.group_label && <Badge tone="neutral">{flight.group_label}</Badge>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <PaymentBadge status={flight.payment_status} />
          {canEdit && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label="Ações do voo">
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

      {/* Timeline do trecho */}
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-5">
        <div className="min-w-0">
          <p className="text-2xl font-semibold leading-none text-ink tabular">
            {timeInZone(flight.departure_at, flight.origin_timezone)}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-ink">{flight.origin_iata ?? '—'}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft">{flight.origin_airport}</p>
          {differentZones && (
            <p className="mt-0.5 text-[11px] text-ink-faint">{timezoneAbbreviation(flight.origin_timezone)}</p>
          )}
          {flight.origin_terminal && (
            <p className="mt-1 text-[11px] text-ink-faint">Terminal {flight.origin_terminal}</p>
          )}
        </div>

        <div className="flex flex-col items-center px-1 text-center">
          <span className="text-[11px] text-ink-faint tabular">
            {formatSpan(flight.departure_at, flight.arrival_at)}
          </span>
          <span className="my-1 flex items-center gap-1 text-line-strong" aria-hidden>
            <span className="h-px w-6 bg-current sm:w-10" />
            <ArrowRight className="h-3.5 w-3.5" />
          </span>
          <span className="text-[11px] text-ink-faint">{formatDate(departureDay)}</span>
        </div>

        <div className="min-w-0 text-right">
          <p className="text-2xl font-semibold leading-none text-ink tabular">
            {flight.arrival_at ? timeInZone(flight.arrival_at, flight.destination_timezone) : '—'}
            {shift > 0 && <sup className="ml-0.5 text-[11px] font-medium text-warning">+{shift}</sup>}
          </p>
          <p className="mt-1 text-[15px] font-semibold text-ink">{flight.destination_iata ?? '—'}</p>
          <p className="mt-0.5 truncate text-[12px] text-ink-soft">{flight.destination_airport}</p>
          {differentZones && (
            <p className="mt-0.5 text-[11px] text-ink-faint">{timezoneAbbreviation(flight.destination_timezone)}</p>
          )}
          {flight.destination_terminal && (
            <p className="mt-1 text-[11px] text-ink-faint">Terminal {flight.destination_terminal}</p>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-[12px] sm:grid-cols-4">
        {flight.booking_reference && (
          <div>
            <dt className="text-ink-faint">Localizador</dt>
            <dd className="mt-0.5">
              <ReservationBadge code={flight.booking_reference} />
            </dd>
          </div>
        )}
        {flight.seats && (
          <div>
            <dt className="text-ink-faint">Assentos</dt>
            <dd className="mt-0.5 font-medium text-ink">{flight.seats}</dd>
          </div>
        )}
        {flight.checked_baggage && (
          <div>
            <dt className="text-ink-faint">Bagagem despachada</dt>
            <dd className="mt-0.5 font-medium text-ink">{flight.checked_baggage}</dd>
          </div>
        )}
        {flight.carry_on_baggage && (
          <div>
            <dt className="text-ink-faint">Bagagem de mão</dt>
            <dd className="mt-0.5 font-medium text-ink">{flight.carry_on_baggage}</dd>
          </div>
        )}
        {flight.total_price != null && (
          <div>
            <dt className="text-ink-faint">Total</dt>
            <dd className="mt-0.5 font-medium text-ink tabular">
              {formatMoney(flight.total_price, flight.currency)}
            </dd>
          </div>
        )}
        {flight.gate && (
          <div>
            <dt className="text-ink-faint">Portão</dt>
            <dd className="mt-0.5 font-medium text-ink">{flight.gate}</dd>
          </div>
        )}
      </dl>

      {flight.passengers && flight.passengers.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Passageiros</p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-ink">
            {flight.passengers.map((passenger) => (
              <li key={passenger.id}>
                {passenger.full_name}
                {passenger.seat && <span className="text-ink-faint"> · {passenger.seat}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {(flight.booking_url || flight.airline_url || flight.notes) && (
        <div className="space-y-2 border-t border-line px-4 py-3">
          {flight.notes && <p className="text-[12px] leading-relaxed text-ink-soft">{flight.notes}</p>}
          <div className="flex flex-wrap gap-3">
            {flight.booking_url && (
              <a
                href={flight.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Abrir reserva
              </a>
            )}
            {flight.airline_url && (
              <a
                href={flight.airline_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-accent hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                Site da companhia
              </a>
            )}
          </div>
        </div>
      )}

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar voo">
            <FlightForm
              tripId={tripId}
              flight={flight}
              defaultTimezone={defaultTimezone}
              defaultCurrency={defaultCurrency}
              onDone={() => setEditing(false)}
            />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir este voo?"
            description="As informações do trecho e os passageiros serão removidos. Documentos anexados continuam na viagem."
            confirmLabel="Excluir voo"
            loading={deleting}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Card>
  );
}
