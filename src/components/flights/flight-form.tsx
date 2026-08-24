'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import { saveFlightAction } from '@/server/actions/flights';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { CurrencySelect, MoneyInput, PaymentStatusSelect, TimezoneSelect } from '@/components/shared/form-fields';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { dateInZone, timeInZone } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { FlightWithPassengers } from '@/server/queries/trips';

const CABIN_CLASSES = ['Econômica', 'Econômica premium', 'Executiva', 'Primeira classe'];

export function FlightForm({
  tripId,
  flight,
  defaultTimezone,
  defaultCurrency,
  onDone,
}: {
  tripId: string;
  flight?: FlightWithPassengers;
  defaultTimezone: string;
  defaultCurrency: string;
  onDone: () => void;
}) {
  const router = useRouter();
  const action = saveFlightAction.bind(null, tripId, flight?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  const originTz = flight?.origin_timezone ?? defaultTimezone;
  const destinationTz = flight?.destination_timezone ?? defaultTimezone;

  const [passengers, setPassengers] = useState<Array<{ fullName: string; seat: string; ticketNumber: string }>>(
    flight?.passengers?.map((p) => ({
      fullName: p.full_name,
      seat: p.seat ?? '',
      ticketNumber: p.ticket_number ?? '',
    })) ?? [],
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success(flight ? 'Voo atualizado.' : 'Voo adicionado.');
      onDone();
      router.refresh();
    }
  }, [state, flight, onDone, router]);

  return (
    <form action={formAction} noValidate>
      <DialogBody className="space-y-7">
        <FormError state={state} />

        <FieldGroup title="Companhia e reserva">
          <Field label="Companhia aérea" error={fieldError(state, 'airline')}>
            <Input name="airline" defaultValue={flight?.airline ?? ''} placeholder="Ex.: LATAM" />
          </Field>
          <Field label="Número do voo" error={fieldError(state, 'flightNumber')}>
            <Input name="flightNumber" defaultValue={flight?.flight_number ?? ''} placeholder="Ex.: LA3542" />
          </Field>
          <Field label="Localizador da reserva" hint="O código de 6 letras do bilhete." error={fieldError(state, 'bookingReference')}>
            <Input
              name="bookingReference"
              defaultValue={flight?.booking_reference ?? ''}
              placeholder="Ex.: ABC123"
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Trecho" hint="Para separar ida e volta.">
            <Select name="groupLabel" defaultValue={flight?.group_label ?? 'Ida'}>
              <option value="Ida">Ida</option>
              <option value="Volta">Volta</option>
              <option value="Conexão">Conexão</option>
              <option value="">Sem rótulo</option>
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup title="Origem">
          <Field label="Aeroporto de origem" error={fieldError(state, 'originAirport')} required>
            <Input
              name="originAirport"
              defaultValue={flight?.origin_airport ?? ''}
              placeholder="Ex.: Cuiabá — Marechal Rondon"
              required
            />
          </Field>
          <Field label="Código IATA" error={fieldError(state, 'originIata')} hint="Três letras.">
            <Input
              name="originIata"
              defaultValue={flight?.origin_iata ?? ''}
              placeholder="CGB"
              maxLength={3}
              className="uppercase"
            />
          </Field>
          <Field label="Terminal">
            <Input name="originTerminal" defaultValue={flight?.origin_terminal ?? ''} placeholder="Ex.: 2" />
          </Field>
          <Field
            label="Fuso da origem"
            error={fieldError(state, 'originTimezone')}
            hint="Os horários abaixo são os do relógio local."
          >
            <TimezoneSelect name="originTimezone" defaultValue={originTz} />
          </Field>
          <Field label="Data da partida" error={fieldError(state, 'departureDate')} required>
            <Input
              name="departureDate"
              type="date"
              defaultValue={flight ? dateInZone(flight.departure_at, originTz) : ''}
              required
            />
          </Field>
          <Field label="Horário da partida" error={fieldError(state, 'departureTime')} required>
            <Input
              name="departureTime"
              type="time"
              defaultValue={flight ? timeInZone(flight.departure_at, originTz) : ''}
              required
            />
          </Field>
          <Field label="Horário de embarque" error={fieldError(state, 'boardingTime')}>
            <Input
              name="boardingTime"
              type="time"
              defaultValue={flight?.boarding_at ? timeInZone(flight.boarding_at, originTz) : ''}
            />
          </Field>
          <Field label="Portão">
            <Input name="gate" defaultValue={flight?.gate ?? ''} placeholder="Ex.: 12" />
          </Field>
        </FieldGroup>

        <FieldGroup title="Destino">
          <Field label="Aeroporto de destino" error={fieldError(state, 'destinationAirport')} required>
            <Input
              name="destinationAirport"
              defaultValue={flight?.destination_airport ?? ''}
              placeholder="Ex.: Porto Alegre — Salgado Filho"
              required
            />
          </Field>
          <Field label="Código IATA" error={fieldError(state, 'destinationIata')}>
            <Input
              name="destinationIata"
              defaultValue={flight?.destination_iata ?? ''}
              placeholder="POA"
              maxLength={3}
              className="uppercase"
            />
          </Field>
          <Field label="Terminal">
            <Input name="destinationTerminal" defaultValue={flight?.destination_terminal ?? ''} />
          </Field>
          <Field
            label="Fuso do destino"
            error={fieldError(state, 'destinationTimezone')}
            hint="Fusos diferentes são tratados corretamente."
          >
            <TimezoneSelect name="destinationTimezone" defaultValue={destinationTz} />
          </Field>
          <Field label="Data da chegada" error={fieldError(state, 'arrivalDate')} required>
            <Input
              name="arrivalDate"
              type="date"
              defaultValue={flight?.arrival_at ? dateInZone(flight.arrival_at, destinationTz) : ''}
              required
            />
          </Field>
          <Field label="Horário da chegada" error={fieldError(state, 'arrivalTime')} required>
            <Input
              name="arrivalTime"
              type="time"
              defaultValue={flight?.arrival_at ? timeInZone(flight.arrival_at, destinationTz) : ''}
              required
            />
          </Field>
        </FieldGroup>

        <FieldGroup title="Assentos e bagagem">
          <Field label="Classe">
            <Select name="cabinClass" defaultValue={flight?.cabin_class ?? ''}>
              <option value="">Não informada</option>
              {CABIN_CLASSES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Assentos">
            <Input name="seats" defaultValue={flight?.seats ?? ''} placeholder="Ex.: 12A, 12B" />
          </Field>
          <Field label="Bagagem de mão">
            <Input name="carryOnBaggage" defaultValue={flight?.carry_on_baggage ?? ''} placeholder="Ex.: 1 peça de 10 kg" />
          </Field>
          <Field label="Bagagem despachada">
            <Input name="checkedBaggage" defaultValue={flight?.checked_baggage ?? ''} placeholder="Ex.: 2 peças de 23 kg" />
          </Field>
        </FieldGroup>

        <fieldset className="space-y-3">
          <legend className="text-sm font-semibold text-ink">Passageiros</legend>
          {passengers.length === 0 && (
            <p className="text-[13px] text-ink-soft">Nenhum passageiro informado.</p>
          )}
          <div className="space-y-2">
            {passengers.map((passenger, index) => (
              <div key={index} className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <Input
                  name={`passengers[${index}].fullName`}
                  defaultValue={passenger.fullName}
                  placeholder="Nome completo"
                  aria-label={`Nome do passageiro ${index + 1}`}
                />
                <Input
                  name={`passengers[${index}].seat`}
                  defaultValue={passenger.seat}
                  placeholder="Assento"
                  aria-label={`Assento do passageiro ${index + 1}`}
                />
                <Input
                  name={`passengers[${index}].ticketNumber`}
                  defaultValue={passenger.ticketNumber}
                  placeholder="Bilhete"
                  aria-label={`Bilhete do passageiro ${index + 1}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Remover passageiro ${index + 1}`}
                  onClick={() => setPassengers((list) => list.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            ))}
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPassengers((list) => [...list, { fullName: '', seat: '', ticketNumber: '' }])}
          >
            <Plus className="h-4 w-4" aria-hidden />
            Adicionar passageiro
          </Button>
        </fieldset>

        <FieldGroup title="Valores">
          <Field label="Valor por passageiro" error={fieldError(state, 'pricePerPassenger')}>
            <MoneyInput name="pricePerPassenger" defaultValue={flight?.price_per_passenger ?? ''} />
          </Field>
          <Field label="Taxas" error={fieldError(state, 'taxes')}>
            <MoneyInput name="taxes" defaultValue={flight?.taxes ?? ''} />
          </Field>
          <Field label="Valor total" error={fieldError(state, 'totalPrice')}>
            <MoneyInput name="totalPrice" defaultValue={flight?.total_price ?? ''} />
          </Field>
          <Field label="Moeda">
            <CurrencySelect name="currency" defaultValue={flight?.currency ?? defaultCurrency} />
          </Field>
          <Field label="Forma de pagamento">
            <Input name="paymentMethod" defaultValue={flight?.payment_method ?? ''} placeholder="Ex.: Cartão de crédito" />
          </Field>
          <Field label="Situação do pagamento">
            <PaymentStatusSelect name="paymentStatus" defaultValue={flight?.payment_status ?? 'unpaid'} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Links e observações">
          <Field label="Site da companhia" error={fieldError(state, 'airlineUrl')}>
            <Input name="airlineUrl" inputMode="url" defaultValue={flight?.airline_url ?? ''} placeholder="https://…" />
          </Field>
          <Field label="Link da reserva" error={fieldError(state, 'bookingUrl')}>
            <Input name="bookingUrl" inputMode="url" defaultValue={flight?.booking_url ?? ''} placeholder="https://…" />
          </Field>
          <Field label="Observações" full>
            <Textarea name="notes" rows={3} defaultValue={flight?.notes ?? ''} />
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{flight ? 'Salvar alterações' : 'Adicionar voo'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
