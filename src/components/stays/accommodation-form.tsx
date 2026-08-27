'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAccommodationAction } from '@/server/actions/accommodations';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { CurrencySelect, MoneyInput, PaymentStatusSelect, TimezoneSelect } from '@/components/shared/form-fields';
import { PlaceAutocomplete, type PlaceValue } from '@/components/maps/place-autocomplete';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import { ACCOMMODATION_KINDS, ACCOMMODATION_KIND_LABEL } from '@/lib/validators/accommodation';
import { dateInZone, timeInZone } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { AccommodationRow } from '@/types/database';

/** Plataformas comuns — apenas sugestão, o campo é livre. */
const PLATFORMS = ['Booking.com', 'Airbnb', 'Direto com o hotel', 'Decolar', 'Expedia', 'Outro'];

export function AccommodationForm({
  tripId,
  accommodation,
  onDone,
}: {
  tripId: string;
  accommodation?: AccommodationRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const { trip, google } = useTrip();
  const action = saveAccommodationAction.bind(null, tripId, accommodation?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  const [place, setPlace] = useState<PlaceValue | null>(
    accommodation && (accommodation.google_place_id || accommodation.latitude)
      ? {
          name: accommodation.name,
          formattedAddress: accommodation.address,
          googlePlaceId: accommodation.google_place_id,
          latitude: accommodation.latitude,
          longitude: accommodation.longitude,
          phone: accommodation.phone,
          website: accommodation.website,
        }
      : null,
  );
  const [kind, setKind] = useState(accommodation?.kind ?? 'hotel');
  const tz = accommodation?.timezone ?? trip.timezone;
  const isRental = kind === 'airbnb' || kind === 'house' || kind === 'apartment';

  useEffect(() => {
    if (state?.ok) {
      toast.success(accommodation ? 'Hospedagem atualizada.' : 'Hospedagem adicionada.');
      onDone();
      router.refresh();
    }
  }, [state, accommodation, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-7">
        <FormError state={state} />

        <div className="space-y-4">
          <Field
            label="Buscar hospedagem"
            hint="Escolha na lista para o endereço, o telefone e a localização no mapa virem prontos."
          >
            <PlaceAutocomplete
              namePrefix="place"
              value={place}
              onChange={(value) => setPlace(value)}
              available={google.places}
              placeholder="Ex.: Hotel Casa da Montanha, Gramado"
              bias={
                trip.timezone && place?.latitude && place?.longitude
                  ? { lat: place.latitude, lng: place.longitude }
                  : null
              }
            />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Nome da hospedagem" error={fieldError(state, 'name')} required>
              <Input
                name="name"
                defaultValue={accommodation?.name ?? ''}
                placeholder={place?.name ?? 'Ex.: Hotel Casa da Montanha'}
                required={!place}
              />
            </Field>
            <Field label="Tipo" error={fieldError(state, 'kind')}>
              <Select name="kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
                {ACCOMMODATION_KINDS.map((k) => (
                  <option key={k} value={k}>
                    {ACCOMMODATION_KIND_LABEL[k]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Endereço" error={fieldError(state, 'address')} full>
              <Input
                name="address"
                defaultValue={accommodation?.address ?? ''}
                placeholder={place?.formattedAddress ?? 'Rua, número, bairro, cidade'}
              />
            </Field>
          </div>
        </div>

        <FieldGroup title="Reserva">
          <Field label="Plataforma">
            <Select name="platform" defaultValue={accommodation?.platform ?? ''}>
              <option value="">Não informada</option>
              {PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Código da reserva">
            <Input
              name="bookingReference"
              defaultValue={accommodation?.booking_reference ?? ''}
              className="font-mono"
              placeholder="Ex.: 4821096374"
            />
          </Field>
          <Field label="Link da reserva" error={fieldError(state, 'bookingUrl')}>
            <Input name="bookingUrl" inputMode="url" defaultValue={accommodation?.booking_url ?? ''} placeholder="https://…" />
          </Field>
          <Field label="Telefone">
            <Input name="phone" type="tel" defaultValue={accommodation?.phone ?? ''} placeholder={place?.phone ?? '(54) 3286-0000'} />
          </Field>
          <Field label="Site" error={fieldError(state, 'website')}>
            <Input name="website" inputMode="url" defaultValue={accommodation?.website ?? ''} placeholder="https://…" />
          </Field>
        </FieldGroup>

        <FieldGroup title="Período">
          <Field label="Data do check-in" error={fieldError(state, 'checkInDate')} required>
            <Input
              name="checkInDate"
              type="date"
              defaultValue={accommodation ? dateInZone(accommodation.check_in_at, tz) : trip.start_date}
              required
            />
          </Field>
          <Field label="Horário do check-in" error={fieldError(state, 'checkInTime')} required>
            <Input
              name="checkInTime"
              type="time"
              defaultValue={accommodation ? timeInZone(accommodation.check_in_at, tz) : '14:00'}
              required
            />
          </Field>
          <Field label="Data do check-out" error={fieldError(state, 'checkOutDate')} required>
            <Input
              name="checkOutDate"
              type="date"
              defaultValue={accommodation ? dateInZone(accommodation.check_out_at, tz) : trip.end_date}
              required
            />
          </Field>
          <Field label="Horário do check-out" error={fieldError(state, 'checkOutTime')} required>
            <Input
              name="checkOutTime"
              type="time"
              defaultValue={accommodation ? timeInZone(accommodation.check_out_at, tz) : '11:00'}
              required
            />
          </Field>
          <Field label="Fuso horário" full>
            <TimezoneSelect name="timezone" defaultValue={tz} />
          </Field>
          <Field label="Janela de check-in" hint="Ex.: a partir das 14:00">
            <Input name="checkInWindow" defaultValue={accommodation?.check_in_window ?? ''} />
          </Field>
          <Field label="Janela de check-out" hint="Ex.: até as 11:00">
            <Input name="checkOutWindow" defaultValue={accommodation?.check_out_window ?? ''} />
          </Field>
        </FieldGroup>

        <FieldGroup title="Acomodação">
          <Field label="Hóspedes" error={fieldError(state, 'guests')}>
            <Input
              name="guests"
              type="number"
              inputMode="numeric"
              min={1}
              defaultValue={accommodation?.guests ?? trip.travelers_count}
            />
          </Field>
          <Field label="Tipo de quarto">
            <Input name="roomType" defaultValue={accommodation?.room_type ?? ''} placeholder="Ex.: Casal superior" />
          </Field>
          <div className="flex flex-col gap-3 sm:col-span-2">
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <Checkbox name="breakfastIncluded" defaultChecked={accommodation?.breakfast_included} value="on" />
              Café da manhã incluso
            </label>
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <Checkbox name="parkingIncluded" defaultChecked={accommodation?.parking_included} value="on" />
              Estacionamento incluso
            </label>
          </div>
        </FieldGroup>

        {isRental && (
          <FieldGroup
            title="Aluguel por temporada"
            description="Campos úteis para Airbnb e similares — anfitrião, entrada e Wi-Fi."
          >
            <Field label="Anfitrião">
              <Input name="hostName" defaultValue={accommodation?.host_name ?? ''} />
            </Field>
            <Field label="Contato do anfitrião">
              <Input name="hostContact" defaultValue={accommodation?.host_contact ?? ''} placeholder="Telefone ou e-mail" />
            </Field>
            <Field label="Senha do Wi-Fi">
              <Input name="wifiPassword" defaultValue={accommodation?.wifi_password ?? ''} />
            </Field>
            <Field label="Forma de entrada" hint="Ex.: cofre com senha ao lado da porta.">
              <Input name="accessInstructions" defaultValue={accommodation?.access_instructions ?? ''} />
            </Field>
            <Field label="Regras da casa" full>
              <Textarea name="houseRules" rows={3} defaultValue={accommodation?.house_rules ?? ''} />
            </Field>
          </FieldGroup>
        )}

        <FieldGroup title="Valores">
          <Field label="Valor da diária" error={fieldError(state, 'nightlyRate')}>
            <MoneyInput name="nightlyRate" defaultValue={accommodation?.nightly_rate ?? ''} />
          </Field>
          <Field label="Taxas" error={fieldError(state, 'taxes')}>
            <MoneyInput name="taxes" defaultValue={accommodation?.taxes ?? ''} />
          </Field>
          <Field label="Valor total" error={fieldError(state, 'totalPrice')}>
            <MoneyInput name="totalPrice" defaultValue={accommodation?.total_price ?? ''} />
          </Field>
          <Field label="Valor já pago" error={fieldError(state, 'paidAmount')}>
            <MoneyInput name="paidAmount" defaultValue={accommodation?.paid_amount ?? ''} />
          </Field>
          <Field label="Moeda">
            <CurrencySelect name="currency" defaultValue={accommodation?.currency ?? trip.base_currency} />
          </Field>
          <Field label="Situação do pagamento">
            <PaymentStatusSelect name="paymentStatus" defaultValue={accommodation?.payment_status ?? 'unpaid'} />
          </Field>
          <Field label="Forma de pagamento">
            <Input name="paymentMethod" defaultValue={accommodation?.payment_method ?? ''} />
          </Field>
          <Field label="Política de cancelamento" full>
            <Textarea name="cancellationPolicy" rows={2} defaultValue={accommodation?.cancellation_policy ?? ''} />
          </Field>
          <Field label="Observações" full>
            <Textarea name="notes" rows={3} defaultValue={accommodation?.notes ?? ''} />
          </Field>
        </FieldGroup>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{accommodation ? 'Salvar alterações' : 'Adicionar hospedagem'}</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
