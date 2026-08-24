'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowDownToLine, Check, Download, MoreVertical, Pencil, Plus, Receipt, Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Stat } from '@/components/ui/section';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog, EditDialog } from '@/components/shared/resource-dialog';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { PaymentBadge } from '@/components/shared/payment-badge';
import { ExpenseForm } from '@/components/finance/expense-form';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import {
  deleteExpenseAction, importReservationExpensesAction, markExpensePaidAction,
} from '@/server/actions/expenses';
import {
  memberBalances, settlements, summarizeExpenses, totalsByCategory, effectiveAmount,
} from '@/lib/domain/finance';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/validators/expense';
import { formatDate } from '@/lib/format/date';
import { formatMoney, formatPercent } from '@/lib/format/money';
import { cn } from '@/lib/utils';
import type { ExpenseWithSplits } from '@/server/queries/trips';

const CATEGORY_BAR_COLORS = [
  'var(--color-cat-accommodation)',
  'var(--color-cat-flight)',
  'var(--color-cat-restaurant)',
  'var(--color-cat-attraction)',
  'var(--color-cat-car)',
  'var(--color-cat-shopping)',
  'var(--color-cat-event)',
  'var(--color-cat-other)',
];

export function FinanceBoard({
  tripId,
  expenses,
  canEdit,
}: {
  tripId: string;
  expenses: ExpenseWithSplits[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { trip, members } = useTrip();
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [pending, startTransition] = useTransition();

  const summary = useMemo(
    () => summarizeExpenses(expenses, trip.estimated_budget),
    [expenses, trip.estimated_budget],
  );
  const byCategory = useMemo(() => totalsByCategory(expenses), [expenses]);
  const balances = useMemo(
    () => memberBalances(expenses, members.map((m) => m.id)),
    [expenses, members],
  );
  const acertos = useMemo(() => settlements(balances), [balances]);
  const hasSplits = expenses.some((e) => e.split_enabled);

  const filtered = useMemo(
    () =>
      expenses.filter((expense) => {
        if (category && expense.category !== category) return false;
        if (status && expense.payment_status !== status) return false;
        return true;
      }),
    [expenses, category, status],
  );

  function importReservations() {
    startTransition(async () => {
      const result = await importReservationExpensesAction(tripId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.data.created === 0
          ? 'Todas as reservas já estão no financeiro.'
          : `${result.data.created} ${result.data.created === 1 ? 'despesa criada' : 'despesas criadas'} a partir das reservas.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 gap-5 lg:grid-cols-5">
            <Stat
              label="Orçamento"
              value={summary.budget != null ? formatMoney(summary.budget, trip.base_currency) : '—'}
              hint={summary.budget == null ? 'Defina nas configurações' : undefined}
            />
            <Stat label="Planejado" value={formatMoney(summary.planned, trip.base_currency)} />
            <Stat label="Previsto / real" value={formatMoney(summary.actual, trip.base_currency)} />
            <Stat label="Já pago" value={formatMoney(summary.paid, trip.base_currency)} tone="positive" />
            <Stat
              label="A pagar"
              value={formatMoney(summary.outstanding, trip.base_currency)}
              tone={summary.outstanding > 0 ? 'warning' : 'default'}
            />
          </div>

          {summary.budget != null && (
            <div className="mt-5">
              <div className="mb-1.5 flex items-baseline justify-between text-[12px]">
                <span className="text-ink-soft">
                  {summary.overBudget ? 'Acima do orçamento' : 'Disponível no orçamento'}
                </span>
                <span
                  className={cn(
                    'font-semibold tabular',
                    summary.overBudget ? 'text-danger' : 'text-positive',
                  )}
                >
                  {formatMoney(Math.abs(summary.available ?? 0), trip.base_currency)}
                </span>
              </div>
              <Progress
                value={summary.actual}
                max={summary.budget}
                tone={summary.overBudget ? 'danger' : summary.actual / summary.budget > 0.85 ? 'warning' : 'accent'}
                label="Uso do orçamento"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gastos por categoria */}
      {byCategory.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Gastos por categoria</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {byCategory.map((entry, index) => (
              <div key={entry.category}>
                <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
                  <span className="truncate text-ink">{EXPENSE_CATEGORY_LABEL[entry.category]}</span>
                  <span className="shrink-0 text-ink-soft tabular">
                    {formatMoney(entry.total, trip.base_currency)}
                    <span className="ml-2 text-ink-faint">{formatPercent(entry.share)}</span>
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.max(entry.share * 100, 1)}%`,
                      backgroundColor: CATEGORY_BAR_COLORS[index % CATEGORY_BAR_COLORS.length],
                    }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Balanço entre participantes */}
      {hasSplits && members.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Balanço entre viajantes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="space-y-2">
              {balances.map((balance) => {
                const member = members.find((m) => m.id === balance.memberId);
                if (!member) return null;
                return (
                  <li key={balance.memberId} className="flex items-baseline justify-between gap-3 text-[13px]">
                    <span className="truncate text-ink">{member.name}</span>
                    <span className="shrink-0 text-right">
                      <span
                        className={cn(
                          'block font-semibold tabular',
                          balance.balance > 0 ? 'text-positive' : balance.balance < 0 ? 'text-danger' : 'text-ink',
                        )}
                      >
                        {balance.balance > 0 ? 'a receber ' : balance.balance < 0 ? 'a pagar ' : ''}
                        {formatMoney(Math.abs(balance.balance), trip.base_currency)}
                      </span>
                      <span className="block text-[11px] text-ink-faint tabular">
                        pagou {formatMoney(balance.paid, trip.base_currency)} · cota{' '}
                        {formatMoney(balance.owes, trip.base_currency)}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>

            {acertos.length > 0 && (
              <div className="border-t border-line pt-3">
                <p className="mb-1.5 text-[12px] font-medium text-ink">Como acertar</p>
                <ul className="space-y-1">
                  {acertos.map((settlement, index) => {
                    const from = members.find((m) => m.id === settlement.fromMemberId);
                    const to = members.find((m) => m.id === settlement.toMemberId);
                    return (
                      <li key={index} className="text-[13px] text-ink-soft">
                        {from?.name} paga{' '}
                        <span className="font-semibold text-ink tabular">
                          {formatMoney(settlement.amount, trip.base_currency)}
                        </span>{' '}
                        para {to?.name}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Lista de despesas */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-ink">
            Despesas
            <span className="ml-2 text-[12px] font-normal text-ink-faint tabular">{expenses.length}</span>
          </h2>

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="filtro-cat" className="sr-only">
              Categoria
            </label>
            <Select
              id="filtro-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-auto text-[13px]"
            >
              <option value="">Todas as categorias</option>
              {EXPENSE_CATEGORIES.map((value) => (
                <option key={value} value={value}>
                  {EXPENSE_CATEGORY_LABEL[value]}
                </option>
              ))}
            </Select>

            <label htmlFor="filtro-status" className="sr-only">
              Situação
            </label>
            <Select
              id="filtro-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-9 w-auto text-[13px]"
            >
              <option value="">Todas as situações</option>
              {Object.entries(PAYMENT_STATUS_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </Select>

            <Button asChild variant="outline" size="sm">
              <a href={`/api/viagens/${tripId}/despesas.csv`} download>
                <Download className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">CSV</span>
              </a>
            </Button>

            {canEdit && (
              <>
                <Button variant="outline" size="sm" onClick={importReservations} loading={pending}>
                  <ArrowDownToLine className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Importar reservas</span>
                </Button>
                <ResourceDialog
                  title="Registrar despesa"
                  description="Planejado, real, pagamento e divisão entre viajantes."
                  autoOpenParam="novo"
                  trigger={
                    <Button size="sm">
                      <Plus className="h-4 w-4" aria-hidden />
                      Despesa
                    </Button>
                  }
                >
                  {(close) => <ExpenseForm tripId={tripId} onDone={close} />}
                </ResourceDialog>
              </>
            )}
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title={expenses.length === 0 ? 'Nenhuma despesa registrada' : 'Nenhuma despesa com esses filtros'}
            description={
              expenses.length === 0
                ? 'Registre gastos para acompanhar o orçamento — ou importe automaticamente os valores das reservas já cadastradas.'
                : 'Ajuste os filtros para ver outras despesas.'
            }
            action={
              expenses.length === 0 &&
              canEdit && (
                <Button variant="outline" onClick={importReservations} loading={pending}>
                  <ArrowDownToLine className="h-4 w-4" aria-hidden />
                  Importar das reservas
                </Button>
              )
            }
          />
        ) : (
          <Card className="divide-y divide-line">
            {filtered.map((expense) => (
              <ExpenseRow key={expense.id} expense={expense} tripId={tripId} canEdit={canEdit} />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function ExpenseRow({
  expense,
  tripId,
  canEdit,
}: {
  expense: ExpenseWithSplits;
  tripId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { trip, members } = useTrip();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const planned = expense.planned_amount != null ? Number(expense.planned_amount) : null;
  const actual = expense.actual_amount != null ? Number(expense.actual_amount) : null;
  const difference = planned != null && actual != null ? actual - planned : null;
  const foreign = expense.currency !== trip.base_currency;
  const paidBy = members.find((m) => m.id === expense.paid_by_member_id);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteExpenseAction(tripId, expense.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Despesa removida.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  async function markPaid() {
    const result = await markExpensePaidAction(tripId, expense.id, 'paid');
    if (result.ok) {
      toast.success('Marcada como paga.');
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-[13.5px] font-medium text-ink">{expense.description}</p>
          <Badge tone="neutral">{EXPENSE_CATEGORY_LABEL[expense.category]}</Badge>
          <PaymentBadge status={expense.payment_status} />
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-ink-soft">
          {expense.expense_date && <span className="tabular">{formatDate(expense.expense_date)}</span>}
          {expense.due_date && expense.payment_status !== 'paid' && (
            <span className="text-warning tabular">vence {formatDate(expense.due_date)}</span>
          )}
          {expense.installments > 1 && <span>{expense.installments}x</span>}
          {paidBy && <span>pago por {paidBy.name}</span>}
          {expense.split_enabled && expense.splits && expense.splits.length > 0 && (
            <span>dividido entre {expense.splits.length}</span>
          )}
        </div>

        {expense.notes && <p className="mt-1 text-[12px] text-ink-faint">{expense.notes}</p>}
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[13.5px] font-semibold text-ink tabular">
          {formatMoney(actual ?? planned, expense.currency)}
        </p>
        {foreign && (
          <p className="text-[11px] text-ink-faint tabular">
            ≈ {formatMoney(effectiveAmount(expense), trip.base_currency)}
          </p>
        )}
        {difference != null && difference !== 0 && (
          <p className={cn('text-[11px] tabular', difference > 0 ? 'text-danger' : 'text-positive')}>
            {difference > 0 ? '+' : '−'} {formatMoney(Math.abs(difference), expense.currency)}
          </p>
        )}
        {planned != null && actual != null && difference === 0 && (
          <p className="text-[11px] text-ink-faint">no orçado</p>
        )}
      </div>

      {canEdit && (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${expense.description}`}>
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem onSelect={() => setEditing(true)}>
              <Pencil className="h-4 w-4" aria-hidden />
              Editar
            </DropdownItem>
            {expense.payment_status !== 'paid' && (
              <DropdownItem onSelect={() => void markPaid()}>
                <Check className="h-4 w-4" aria-hidden />
                Marcar como paga
              </DropdownItem>
            )}
            <DropdownItem destructive onSelect={() => setConfirming(true)}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Excluir
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar despesa">
            <ExpenseForm tripId={tripId} expense={expense} onDone={() => setEditing(false)} />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir esta despesa?"
            description={`"${expense.description}" sairá do controle financeiro da viagem.`}
            confirmLabel="Excluir despesa"
            loading={busy}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}
