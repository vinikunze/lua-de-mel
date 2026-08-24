'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveItineraryItemAction } from '@/server/actions/itinerary';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { CurrencySelect, MoneyInput, TimezoneSelect } from '@/components/shared/form-fields';
import { PlaceAutocomplete, type PlaceValue } from '@/components/maps/place-autocomplete';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import {
  ITINERARY_CATEGORIES, ITINERARY_CATEGORY_LABEL, ITINERARY_STATUS_LABEL, ITINERARY_STATUSES,
} from '@/lib/validators/itinerary';
import { eachDayInRange, formatShortWeekday, timeInZone } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { ItineraryItemRow, PlaceRow } from '@/types/database';

export function ItineraryForm({
  tripId,
  item,
  places,
  defaultDay,
  onDone,
}: {
  tripId: string;
  item?: ItineraryItemRow;
  places: PlaceRow[];
  defaultDay?: string | null;
  onDone: () => void;
}) {
  const router = useRouter();
  const { trip, google } = useTrip();
  const action = saveItineraryItemAction.bind(null, tripId, item?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  const tz = item?.timezone ?? trip.timezone;
  const [place, setPlace] = useState<PlaceValue | null>(null);
  const [existingPlaceId, setExistingPlaceId] = useState(item?.place_id ?? '');
  const [hasTime, setHasTime] = useState(Boolean(item?.starts_at));
  const [dayDate, setDayDate] = useState(item?.day_date ?? defaultDay ?? trip.start_date);

  const days = eachDayInRange(trip.start_date, trip.end_date);

  useEffect(() => {
    if (state?.ok) {
      toast.success(item ? 'Evento atualizado.' : 'Evento adicionado ao roteiro.');
      onDone();
      router.refresh();
    }
  }, [state, item, onDone, router]);

  return (
    <form action={formAction} noValidate>
      <DialogBody className="space-y-7">
        <FormError state={state} />

        <FieldGroup title="O que é">
          <Field label="Nome do evento" error={fieldError(state, 'title')} required full>
            <Input
              name="title"
              defaultValue={item?.title ?? ''}
              placeholder="Ex.: Almoço no Bela Vista"
              required={!place}
              autoFocus
            />
          </Field>
          <Field label="Categoria" error={fieldError(state, 'category')}>
            <Select name="category" defaultValue={item?.category ?? 'attraction'}>
              {ITINERARY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {ITINERARY_CATEGORY_LABEL[category]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Situação">
            <Select name="status" defaultValue={item?.status ?? 'planned'}>
              {ITINERARY_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {ITINERARY_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
        </FieldGroup>

        <FieldGroup title="Onde" description="O local salvo entra no mapa e no cálculo de deslocamento.">
          {places.length > 0 && (
            <Field label="Usar um local já salvo" full>
              <Select
                name="placeId"
                value={existingPlaceId}
                onChange={(e) => {
                  setExistingPlaceId(e.target.value);
                  if (e.target.value) setPlace(null);
                }}
              >
                <option value="">Escolher outro local…</option>
                {places.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {!existingPlaceId && (
            <Field label="Buscar novo local" full>
              <PlaceAutocomplete
                namePrefix="place"
                value={place}
                onChange={setPlace}
                available={google.places}
                placeholder="Ex.: Lago Negro, Gramado"
              />
            </Field>
          )}

          <Field label="Endereço" hint="Preenchido automaticamente quando você escolhe na busca." full>
            <Input
              name="address"
              defaultValue={item?.address ?? ''}
              placeholder={place?.formattedAddress ?? 'Rua, número, cidade'}
            />
          </Field>
        </FieldGroup>

        <FieldGroup title="Quando">
          <Field label="Dia" error={fieldError(state, 'dayDate')} full>
            <Select name="dayDate" value={dayDate ?? ''} onChange={(e) => setDayDate(e.target.value)}>
              <option value="">Sem dia definido</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {formatShortWeekday(day)}
                </option>
              ))}
            </Select>
          </Field>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={hasTime}
                onChange={(e) => setHasTime(e.target.checked)}
                className="h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
              />
              Este evento tem horário definido
            </label>
            {!hasTime && (
              <p className="mt-1.5 text-[12px] text-ink-faint">
                Eventos sem horário aparecem separados, como &ldquo;a qualquer momento do dia&rdquo;.
              </p>
            )}
          </div>

          {hasTime && (
            <>
              <Field label="Início" error={fieldError(state, 'startTime')}>
                <Input
                  name="startTime"
                  type="time"
                  defaultValue={item?.starts_at ? timeInZone(item.starts_at, tz) : ''}
                />
              </Field>
              <Field label="Término" error={fieldError(state, 'endTime')}>
                <Input
                  name="endTime"
                  type="time"
                  defaultValue={item?.ends_at ? timeInZone(item.ends_at, tz) : ''}
                />
              </Field>
              <Field label="Fuso horário" full>
                <TimezoneSelect name="timezone" defaultValue={tz} />
              </Field>
            </>
          )}
          {!hasTime && <input type="hidden" name="timezone" value={tz} />}
        </FieldGroup>

        <FieldGroup title="Detalhes">
          <Field label="Custo previsto" error={fieldError(state, 'cost')}>
            <MoneyInput name="cost" defaultValue={item?.cost ?? ''} />
          </Field>
          <Field label="Moeda">
            <CurrencySelect name="currency" defaultValue={item?.currency ?? trip.base_currency} />
          </Field>
          <Field label="Código da reserva">
            <Input name="reservationCode" defaultValue={item?.reservation_code ?? ''} className="font-mono" />
          </Field>
          <Field label="Telefone">
            <Input name="phone" type="tel" defaultValue={item?.phone ?? ''} />
          </Field>
          <Field label="Link" error={fieldError(state, 'url')} full>
            <Input name="url" inputMode="url" defaultValue={item?.url ?? ''} placeholder="https://…" />
          </Field>
          <Field label="Descrição" full>
            <Textarea name="description" rows={2} defaultValue={item?.description ?? ''} />
          </Field>
          <Field label="Observações" full>
            <Textarea name="notes" rows={2} defaultValue={item?.notes ?? ''} />
          </Field>
        </FieldGroup>

        {!google.places && (
          <Alert tone="info">
            A busca de endereços está desativada neste ambiente. Você pode digitar o endereço normalmente —
            o mapa e o cálculo de distâncias é que ficam indisponíveis.
          </Alert>
        )}
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{item ? 'Salvar alterações' : 'Adicionar ao roteiro'}</SubmitButton>
      </DialogFooter>
    </form>
  );
}
