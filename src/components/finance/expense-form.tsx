'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveExpenseAction } from '@/server/actions/expenses';
import { Field, FieldGroup } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { CurrencySelect, MoneyInput, PaymentStatusSelect } from '@/components/shared/form-fields';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL } from '@/lib/validators/expense';
import { formatMoney, splitEvenly, toNumber } from '@/lib/format/money';
import type { ActionResult } from '@/server/action-result';
import type { ExpenseWithSplits } from '@/server/queries/trips';

export function ExpenseForm({
  tripId,
  expense,
  onDone,
}: {
  tripId: string;
  expense?: ExpenseWithSplits;
  onDone: () => void;
}) {
  const router = useRouter();
  const { trip, members } = useTrip();
  const action = saveExpenseAction.bind(null, tripId, expense?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  const [currency, setCurrency] = useState(expense?.currency ?? trip.base_currency);
  const [splitEnabled, setSplitEnabled] = useState(expense?.split_enabled ?? false);
  const [splitMembers, setSplitMembers] = useState<string[]>(
    expense?.splits?.map((s) => s.member_id) ?? members.map((m) => m.id),
  );
  const [amount, setAmount] = useState(String(expense?.actual_amount ?? expense?.planned_amount ?? ''));

  const foreign = currency !== trip.base_currency;
  const total = toNumber(amount) ?? 0;
  const shares = splitEnabled && splitMembers.length > 0 ? splitEvenly(total, splitMembers.length) : [];

  useEffect(() => {
    if (state?.ok) {
      toast.success(expense ? 'Despesa atualizada.' : 'Despesa registrada.');
      onDone();
      router.refresh();
    }
  }, [state, expense, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-7">
        <FormError state={state} />

        <FieldGroup title="O que foi">
          <Field label="Descrição" error={fieldError(state, 'description')} required full>
            <Input
              name="description"
              defaultValue={expense?.description ?? ''}
              placeholder="Ex.: Jantar no Belle du Valais"
              required
              autoFocus
            />
          </Field>
          <Field label="Categoria" error={fieldError(state, 'category')}>
            <Select name="category" defaultValue={expense?.category ?? 'other'}>
              {EXPENSE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {EXPENSE_CATEGORY_LABEL[value]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Data do gasto">
            <Input name="expenseDate" type="date" defaultValue={expense?.expense_date ?? ''} />
          </Field>
        </FieldGroup>

        <FieldGroup
          title="Valores"
          description="Planejado é a estimativa; real é quanto saiu de fato. Guardamos os dois."
        >
          <Field label="Valor planejado" error={fieldError(state, 'plannedAmount')}>
            <MoneyInput name="plannedAmount" defaultValue={expense?.planned_amount ?? ''} />
          </Field>
          <Field label="Valor real" error={fieldError(state, 'actualAmount')}>
            <MoneyInput
              name="actualAmount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </Field>
          <Field label="Moeda">
            <CurrencySelect
              name="currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            />
          </Field>
          {foreign && (
            <Field
              label={`Câmbio para ${trip.base_currency}`}
              error={fieldError(state, 'exchangeRate')}
              hint="Quanto vale 1 unidade da moeda estrangeira. O valor original é preservado."
            >
              <Input
                name="exchangeRate"
                inputMode="decimal"
                defaultValue={expense?.exchange_rate ?? ''}
                placeholder="Ex.: 5,40"
              />
            </Field>
          )}
          {!foreign && <input type="hidden" name="exchangeRate" value="1" />}
        </FieldGroup>

        <FieldGroup title="Pagamento">
          <Field label="Situação">
            <PaymentStatusSelect name="paymentStatus" defaultValue={expense?.payment_status ?? 'unpaid'} />
          </Field>
          <Field label="Valor já pago" error={fieldError(state, 'paidAmount')}>
            <MoneyInput name="paidAmount" defaultValue={expense?.paid_amount ?? ''} />
          </Field>
          <Field label="Vencimento">
            <Input name="dueDate" type="date" defaultValue={expense?.due_date ?? ''} />
          </Field>
          <Field label="Data do pagamento">
            <Input name="paidAt" type="date" defaultValue={expense?.paid_at ?? ''} />
          </Field>
          <Field label="Forma de pagamento">
            <Input
              name="paymentMethod"
              defaultValue={expense?.payment_method ?? ''}
              placeholder="Ex.: Cartão de crédito"
            />
          </Field>
          <Field label="Parcelas" error={fieldError(state, 'installments')}>
            <Input
              name="installments"
              type="number"
              inputMode="numeric"
              min={1}
              max={60}
              defaultValue={expense?.installments ?? 1}
            />
          </Field>
        </FieldGroup>

        {members.length > 1 && (
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-ink">Divisão entre viajantes</legend>

            <Field label="Pago por">
              <Select name="paidByMemberId" defaultValue={expense?.paid_by_member_id ?? ''}>
                <option value="">Não informado</option>
                {members.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name}
                  </option>
                ))}
              </Select>
            </Field>

            <label className="flex items-center gap-2.5 text-[13px] text-ink">
              <input
                type="checkbox"
                name="splitEnabled"
                checked={splitEnabled}
                onChange={(e) => setSplitEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
              />
              Dividir este gasto entre os participantes
            </label>

            {splitEnabled && (
              <div className="space-y-2 rounded-[12px] bg-surface-muted p-3">
                {members.map((member, index) => {
                  const checked = splitMembers.includes(member.id);
                  const position = splitMembers.indexOf(member.id);
                  return (
                    <label key={member.id} className="flex items-center justify-between gap-3 text-[13px]">
                      <span className="flex items-center gap-2.5">
                        <input
                          type="checkbox"
                          name="splitMemberIds"
                          value={member.id}
                          checked={checked}
                          onChange={(e) =>
                            setSplitMembers((current) =>
                              e.target.checked
                                ? [...current, member.id]
                                : current.filter((id) => id !== member.id),
                            )
                          }
                          className="h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
                        />
                        {member.name}
                      </span>
                      {checked && shares.length > 0 && (
                        <span className="text-ink-soft tabular">
                          {formatMoney(shares[position] ?? 0, currency)}
                        </span>
                      )}
                      {index === -1 && null}
                    </label>
                  );
                })}
                {fieldError(state, 'splitMemberIds') && (
                  <p className="text-xs font-medium text-danger">{fieldError(state, 'splitMemberIds')}</p>
                )}
                <p className="text-[11px] text-ink-faint">
                  A divisão é igual entre os selecionados; os centavos que sobram vão para os primeiros da
                  lista, então a soma bate exatamente com o total.
                </p>
              </div>
            )}
          </fieldset>
        )}

        <Field label="Observações">
          <Textarea name="notes" rows={2} defaultValue={expense?.notes ?? ''} />
        </Field>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{expense ? 'Salvar alterações' : 'Registrar despesa'}</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
