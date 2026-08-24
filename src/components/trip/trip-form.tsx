'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CalendarDays } from 'lucide-react';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from '@/components/ui/toaster';
import { COMMON_TIMEZONES, CURRENCIES } from '@/lib/config';
import { TRIP_STATUS_LABEL, TRIP_STATUSES } from '@/lib/validators/trip';
import { formatCountdown, nightsBetween, timezoneLabel, tripDayCount } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { TripRow } from '@/types/database';

interface TripFormProps {
  action: (prev: unknown, formData: FormData) => Promise<ActionResult<{ tripId: string } | { saved: true }>>;
  trip?: TripRow;
  destinationsHint?: string;
  submitLabel: string;
}

export function TripForm({ action, trip, destinationsHint, submitLabel }: TripFormProps) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult<{ tripId: string } | { saved: true }> | null, FormData>(
    action,
    null,
  );

  const [startDate, setStartDate] = useState(trip?.start_date ?? '');
  const [endDate, setEndDate] = useState(trip?.end_date ?? '');

  const summary = useMemo(() => {
    if (!startDate || !endDate || endDate < startDate) return null;
    return {
      days: tripDayCount(startDate, endDate),
      nights: nightsBetween(startDate, endDate),
      countdown: formatCountdown(startDate),
    };
  }, [startDate, endDate]);

  useEffect(() => {
    if (!state?.ok) return;
    if ('tripId' in state.data) {
      toast.success('Viagem criada.');
      router.replace(`/viagens/${state.data.tripId}`);
      router.refresh();
    } else {
      toast.success('Alterações salvas.');
      router.refresh();
    }
  }, [state, router]);

  // Ao escolher a ida, sugere a volta no mesmo dia se ainda estiver vazia.
  useEffect(() => {
    if (startDate && !endDate) setEndDate(startDate);
  }, [startDate, endDate]);

  return (
    <form action={formAction} className="space-y-8" noValidate>
      <FormError state={state} />

      <FieldGroup title="Identificação" description="Como você quer chamar esta viagem.">
        <Field label="Nome da viagem" error={fieldError(state, 'name')} required full>
          <Input
            name="name"
            defaultValue={trip?.name}
            placeholder="Ex.: Gramado 2027"
            maxLength={120}
            autoFocus={!trip}
            required
          />
        </Field>

        <Field
          label="Destino principal"
          error={fieldError(state, 'destinationLabel')}
          hint="Aparece nos cards e no PDF."
        >
          <Input
            name="destinationLabel"
            defaultValue={trip?.destination_label ?? ''}
            placeholder="Ex.: Gramado & Serra Gaúcha"
          />
        </Field>

        <Field label="País" hint="Deixe em branco se forem vários.">
          <Input name="country" placeholder="Ex.: Brasil" defaultValue="" />
        </Field>

        {!trip && (
          <Field
            label="Cidades"
            hint={destinationsHint ?? 'Separe por vírgula. Ex.: Gramado, Canela, Bento Gonçalves'}
            full
          >
            <Input name="cities" placeholder="Gramado, Canela, Bento Gonçalves" />
          </Field>
        )}
      </FieldGroup>

      <FieldGroup title="Datas" description="O sistema calcula dias, noites e contagem regressiva.">
        <Field label="Ida" error={fieldError(state, 'startDate')} required>
          <Input
            name="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            required
          />
        </Field>

        <Field label="Volta" error={fieldError(state, 'endDate')} required>
          <Input
            name="endDate"
            type="date"
            value={endDate}
            min={startDate || undefined}
            onChange={(e) => setEndDate(e.target.value)}
            required
          />
        </Field>

        {summary && (
          <Card className="sm:col-span-2">
            <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-1 p-4 text-[13px]">
              <span className="flex items-center gap-2 font-medium text-ink">
                <CalendarDays className="h-4 w-4 text-ink-faint" aria-hidden />
                {summary.days} {summary.days === 1 ? 'dia' : 'dias'}
              </span>
              <span className="text-ink-soft tabular">
                {summary.nights} {summary.nights === 1 ? 'noite' : 'noites'}
              </span>
              <span className="text-accent">{summary.countdown}</span>
            </CardContent>
          </Card>
        )}

        <Field
          label="Fuso horário principal"
          error={fieldError(state, 'timezone')}
          hint="Usado como padrão nos novos eventos. Cada voo pode ter o seu."
          full
        >
          <Select name="timezone" defaultValue={trip?.timezone ?? 'America/Sao_Paulo'}>
            {COMMON_TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {timezoneLabel(tz)}
              </option>
            ))}
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup title="Viajantes e orçamento">
        <Field label="Quantidade de viajantes" error={fieldError(state, 'travelersCount')} required>
          <Input
            name="travelersCount"
            type="number"
            inputMode="numeric"
            min={1}
            max={50}
            defaultValue={trip?.travelers_count ?? 2}
            required
          />
        </Field>

        <Field label="Moeda principal" error={fieldError(state, 'baseCurrency')}>
          <Select name="baseCurrency" defaultValue={trip?.base_currency ?? 'BRL'}>
            {CURRENCIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.symbol} — {c.label}
              </option>
            ))}
          </Select>
        </Field>

        <Field
          label="Orçamento estimado"
          error={fieldError(state, 'estimatedBudget')}
          hint="Opcional. Serve de referência no financeiro."
        >
          <Input
            name="estimatedBudget"
            inputMode="decimal"
            placeholder="10.000,00"
            defaultValue={trip?.estimated_budget ?? ''}
          />
        </Field>

        {trip && (
          <Field label="Situação" error={fieldError(state, 'status')}>
            <Select name="status" defaultValue={trip.status}>
              {TRIP_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {TRIP_STATUS_LABEL[status]}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </FieldGroup>

      <FieldGroup title="Detalhes" description="Tudo opcional — dá para preencher depois.">
        <Field
          label="Imagem de capa"
          error={fieldError(state, 'coverImageUrl')}
          hint="Endereço de uma imagem. Sem imagem, geramos uma capa automática."
          full
        >
          <Input name="coverImageUrl" inputMode="url" placeholder="https://…" defaultValue={trip?.cover_image_url ?? ''} />
        </Field>

        <Field label="Descrição" error={fieldError(state, 'description')} full>
          <Textarea
            name="description"
            rows={3}
            placeholder="Um resumo do que é essa viagem."
            defaultValue={trip?.description ?? ''}
          />
        </Field>

        <Field label="Observações" error={fieldError(state, 'notes')} full>
          <Textarea
            name="notes"
            rows={3}
            placeholder="Anotações gerais, combinados, lembretes."
            defaultValue={trip?.notes ?? ''}
          />
        </Field>
      </FieldGroup>

      <div className="flex justify-end gap-2 border-t border-line pt-6">
        <SubmitButton size="lg">{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
