'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveCarRentalAction } from '@/server/actions/cars';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { CurrencySelect, MoneyInput, PaymentStatusSelect, TimezoneSelect } from '@/components/shared/form-fields';
import { PlaceAutocomplete, type PlaceValue } from '@/components/maps/place-autocomplete';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import { dateInZone, timeInZone } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { CarRentalRow } from '@/types/database';

export function CarForm({
  tripId,
  car,
  onDone,
}: {
  tripId: string;
  car?: CarRentalRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const { trip, google } = useTrip();
  const action = saveCarRentalAction.bind(null, tripId, car?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  const [pickupPlace, setPickupPlace] = useState<PlaceValue | null>(null);
  const [dropoffPlace, setDropoffPlace] = useState<PlaceValue | null>(null);
  const pickupTz = car?.pickup_timezone ?? trip.timezone;
  const dropoffTz = car?.dropoff_timezone ?? trip.timezone;

  useEffect(() => {
    if (state?.ok) {
      toast.success(car ? 'Reserva atualizada.' : 'Carro adicionado.');
      onDone();
      router.refresh();
    }
  }, [state, car, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-7">
        <FormError state={state} />

        <FieldGroup title="Locadora e veículo">
          <Field label="Locadora" error={fieldError(state, 'company')} required>
            <Input name="company" defaultValue={car?.company ?? ''} placeholder="Ex.: Localiza" required />
          </Field>
          <Field label="Código da reserva">
            <Input name="bookingReference" defaultValue={car?.booking_reference ?? ''} className="font-mono" />
          </Field>
          <Field label="Categoria" hint="Como aparece na reserva.">
            <Input name="category" defaultValue={car?.category ?? ''} placeholder="Ex.: Compacto com ar" />
          </Field>
          <Field label="Modelo previsto">
            <Input name="vehicleModel" defaultValue={car?.vehicle_model ?? ''} placeholder="Ex.: Onix ou similar" />
          </Field>
        </FieldGroup>

        <FieldGroup title="Retirada">
          <Field label="Buscar local de retirada" full>
            <PlaceAutocomplete
              namePrefix="pickupPlace"
              value={pickupPlace}
              onChange={setPickupPlace}
              available={google.places}
              placeholder="Ex.: Localiza Aeroporto Salgado Filho"
            />
          </Field>
          <Field label="Local de retirada">
            <Input name="pickupLocation" defaultValue={car?.pickup_location ?? ''} placeholder={pickupPlace?.name ?? 'Ex.: Aeroporto POA'} />
          </Field>
          <Field label="Endereço de retirada">
            <Input name="pickupAddress" defaultValue={car?.pickup_address ?? ''} placeholder={pickupPlace?.formattedAddress ?? ''} />
          </Field>
          <Field label="Data" error={fieldError(state, 'pickupDate')} required>
            <Input
              name="pickupDate"
              type="date"
              defaultValue={car ? dateInZone(car.pickup_at, pickupTz) : trip.start_date}
              required
            />
          </Field>
          <Field label="Horário" error={fieldError(state, 'pickupTime')} required>
            <Input
              name="pickupTime"
              type="time"
              defaultValue={car ? timeInZone(car.pickup_at, pickupTz) : '10:00'}
              required
            />
          </Field>
          <Field label="Fuso horário" full>
            <TimezoneSelect name="pickupTimezone" defaultValue={pickupTz} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Devolução">
          <Field label="Buscar local de devolução" full>
            <PlaceAutocomplete
              namePrefix="dropoffPlace"
              value={dropoffPlace}
              onChange={setDropoffPlace}
              available={google.places}
              placeholder="Deixe em branco se for o mesmo da retirada"
            />
          </Field>
          <Field label="Local de devolução">
            <Input name="dropoffLocation" defaultValue={car?.dropoff_location ?? ''} placeholder={dropoffPlace?.name ?? ''} />
          </Field>
          <Field label="Endereço de devolução">
            <Input name="dropoffAddress" defaultValue={car?.dropoff_address ?? ''} placeholder={dropoffPlace?.formattedAddress ?? ''} />
          </Field>
          <Field label="Data" error={fieldError(state, 'dropoffDate')} required>
            <Input
              name="dropoffDate"
              type="date"
              defaultValue={car ? dateInZone(car.dropoff_at, dropoffTz) : trip.end_date}
              required
            />
          </Field>
          <Field label="Horário" error={fieldError(state, 'dropoffTime')} required>
            <Input
              name="dropoffTime"
              type="time"
              defaultValue={car ? timeInZone(car.dropoff_at, dropoffTz) : '10:00'}
              required
            />
          </Field>
          <Field label="Fuso horário" full>
            <TimezoneSelect name="dropoffTimezone" defaultValue={dropoffTz} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Valores">
          <Field label="Valor da diária" error={fieldError(state, 'dailyRate')}>
            <MoneyInput name="dailyRate" defaultValue={car?.daily_rate ?? ''} />
          </Field>
          <Field label="Número de diárias" error={fieldError(state, 'daysCount')}>
            <Input name="daysCount" type="number" inputMode="numeric" min={1} defaultValue={car?.days_count ?? ''} />
          </Field>
          <Field label="Valor total" error={fieldError(state, 'totalPrice')}>
            <MoneyInput name="totalPrice" defaultValue={car?.total_price ?? ''} />
          </Field>
          <Field label="Valor já pago" error={fieldError(state, 'paidAmount')}>
            <MoneyInput name="paidAmount" defaultValue={car?.paid_amount ?? ''} />
          </Field>
          <Field label="Caução" error={fieldError(state, 'depositAmount')} hint="Valor bloqueado no cartão.">
            <MoneyInput name="depositAmount" defaultValue={car?.deposit_amount ?? ''} />
          </Field>
          <Field label="Moeda">
            <CurrencySelect name="currency" defaultValue={car?.currency ?? trip.base_currency} />
          </Field>
          <Field label="Situação do pagamento">
            <PaymentStatusSelect name="paymentStatus" defaultValue={car?.payment_status ?? 'unpaid'} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Condições e contatos">
          <Field label="Proteção / seguro">
            <Input name="insurance" defaultValue={car?.insurance ?? ''} placeholder="Ex.: Proteção total" />
          </Field>
          <Field label="Política de combustível">
            <Input name="fuelPolicy" defaultValue={car?.fuel_policy ?? ''} placeholder="Ex.: Devolver com o mesmo nível" />
          </Field>
          <Field label="Quilometragem">
            <Input name="mileagePolicy" defaultValue={car?.mileage_policy ?? ''} placeholder="Ex.: Livre" />
          </Field>
          <Field label="Telefone da locadora">
            <Input name="companyPhone" type="tel" defaultValue={car?.company_phone ?? ''} />
          </Field>
          <Field label="Motorista principal">
            <Input name="mainDriver" defaultValue={car?.main_driver ?? ''} />
          </Field>
          <Field label="Motorista adicional">
            <Input name="additionalDriver" defaultValue={car?.additional_driver ?? ''} />
          </Field>
          <Field label="Link da reserva" error={fieldError(state, 'bookingUrl')} full>
            <Input name="bookingUrl" inputMode="url" defaultValue={car?.booking_url ?? ''} placeholder="https://…" />
          </Field>
          <Field label="Observações" full>
            <Textarea name="notes" rows={3} defaultValue={car?.notes ?? ''} />
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{car ? 'Salvar alterações' : 'Adicionar carro'}</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
