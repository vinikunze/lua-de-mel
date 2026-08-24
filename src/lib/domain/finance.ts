/**
 * Cálculos financeiros da viagem.
 *
 * Tudo aqui é função pura sobre números — nada de formatação — para que os
 * mesmos valores apareçam na tela, no PDF e nos testes.
 */
import { convertToBase, round2, splitEvenly, toNumber } from '@/lib/format/money';
import type { ExpenseCategory, PaymentStatus } from '@/types/database';
import type { ExpenseWithSplits } from '@/server/queries/trips';

export interface FinanceSummary {
  /** Orçamento definido na viagem. */
  budget: number | null;
  /** Soma dos valores planejados (usa o real quando não há planejado). */
  planned: number;
  /** Soma dos valores reais (usa o planejado quando ainda não há real). */
  actual: number;
  paid: number;
  outstanding: number;
  /** Quanto ainda cabe no orçamento. Negativo = estourou. */
  available: number | null;
  overBudget: boolean;
}

/** Valor que "vale" para o total: o real quando existe, senão o planejado. */
export function effectiveAmount(expense: {
  planned_amount: number | string | null;
  actual_amount: number | string | null;
  exchange_rate: number | string;
}): number {
  const actual = toNumber(expense.actual_amount);
  const planned = toNumber(expense.planned_amount);
  return convertToBase(actual ?? planned ?? 0, expense.exchange_rate);
}

export function plannedAmount(expense: {
  planned_amount: number | string | null;
  actual_amount: number | string | null;
  exchange_rate: number | string;
}): number {
  const planned = toNumber(expense.planned_amount);
  const actual = toNumber(expense.actual_amount);
  return convertToBase(planned ?? actual ?? 0, expense.exchange_rate);
}

const IGNORED_STATUSES: PaymentStatus[] = ['cancelled', 'refunded'];

export function summarizeExpenses(
  expenses: Array<{
    planned_amount: number | string | null;
    actual_amount: number | string | null;
    paid_amount: number | string;
    exchange_rate: number | string;
    payment_status: PaymentStatus;
  }>,
  budget: number | string | null,
): FinanceSummary {
  const active = expenses.filter((e) => !IGNORED_STATUSES.includes(e.payment_status));

  const planned = round2(active.reduce((acc, e) => acc + plannedAmount(e), 0));
  const actual = round2(active.reduce((acc, e) => acc + effectiveAmount(e), 0));
  const paid = round2(
    active.reduce((acc, e) => acc + convertToBase(e.paid_amount, e.exchange_rate), 0),
  );
  const outstanding = round2(Math.max(actual - paid, 0));
  const budgetValue = toNumber(budget);

  return {
    budget: budgetValue,
    planned,
    actual,
    paid,
    outstanding,
    available: budgetValue === null ? null : round2(budgetValue - actual),
    overBudget: budgetValue !== null && actual > budgetValue,
  };
}

export interface CategoryTotal {
  category: ExpenseCategory;
  total: number;
  share: number;
}

export function totalsByCategory(
  expenses: Array<{
    category: ExpenseCategory;
    planned_amount: number | string | null;
    actual_amount: number | string | null;
    exchange_rate: number | string;
    payment_status: PaymentStatus;
  }>,
): CategoryTotal[] {
  const map = new Map<ExpenseCategory, number>();
  for (const expense of expenses) {
    if (IGNORED_STATUSES.includes(expense.payment_status)) continue;
    map.set(expense.category, round2((map.get(expense.category) ?? 0) + effectiveAmount(expense)));
  }
  const total = round2([...map.values()].reduce((a, b) => a + b, 0));
  return [...map.entries()]
    .map(([category, value]) => ({
      category,
      total: value,
      share: total > 0 ? value / total : 0,
    }))
    .sort((a, b) => b.total - a.total);
}

export interface MemberBalance {
  memberId: string;
  /** Quanto essa pessoa pagou. */
  paid: number;
  /** Quanto era a parte dela. */
  owes: number;
  /** Positivo: tem a receber. Negativo: deve. */
  balance: number;
}

/**
 * Balanço entre participantes, considerando apenas as despesas com divisão
 * habilitada. Quem pagou entra como crédito; a cota de cada um, como débito.
 */
export function memberBalances(expenses: ExpenseWithSplits[], memberIds: string[]): MemberBalance[] {
  const paid = new Map<string, number>();
  const owes = new Map<string, number>();
  for (const id of memberIds) {
    paid.set(id, 0);
    owes.set(id, 0);
  }

  for (const expense of expenses) {
    if (!expense.split_enabled) continue;
    if (IGNORED_STATUSES.includes(expense.payment_status)) continue;

    const total = effectiveAmount(expense);
    if (total <= 0) continue;

    if (expense.paid_by_member_id && paid.has(expense.paid_by_member_id)) {
      paid.set(expense.paid_by_member_id, round2((paid.get(expense.paid_by_member_id) ?? 0) + total));
    }

    const splits = expense.splits ?? [];
    if (splits.length === 0) continue;

    const declared = splits.reduce((acc, s) => acc + (toNumber(s.share_amount) ?? 0), 0);
    // Se as cotas não foram definidas, divide igualmente sem perder centavos.
    const shares =
      declared > 0
        ? splits.map((s) => convertToBase(s.share_amount, expense.exchange_rate))
        : splitEvenly(total, splits.length);

    splits.forEach((split, index) => {
      if (!owes.has(split.member_id)) return;
      owes.set(split.member_id, round2((owes.get(split.member_id) ?? 0) + (shares[index] ?? 0)));
    });
  }

  return memberIds.map((memberId) => {
    const paidValue = paid.get(memberId) ?? 0;
    const owesValue = owes.get(memberId) ?? 0;
    return {
      memberId,
      paid: paidValue,
      owes: owesValue,
      balance: round2(paidValue - owesValue),
    };
  });
}

/** Sugestão de acertos: quem paga quanto para quem, no menor número de transferências. */
export interface Settlement {
  fromMemberId: string;
  toMemberId: string;
  amount: number;
}

export function settlements(balances: MemberBalance[]): Settlement[] {
  const debtors = balances.filter((b) => b.balance < -0.009).map((b) => ({ ...b }));
  const creditors = balances.filter((b) => b.balance > 0.009).map((b) => ({ ...b }));
  const result: Settlement[] = [];

  let i = 0;
  let j = 0;
  while (i < debtors.length && j < creditors.length) {
    const debt = -debtors[i].balance;
    const credit = creditors[j].balance;
    const amount = round2(Math.min(debt, credit));
    if (amount > 0) {
      result.push({
        fromMemberId: debtors[i].memberId,
        toMemberId: creditors[j].memberId,
        amount,
      });
    }
    debtors[i].balance = round2(debtors[i].balance + amount);
    creditors[j].balance = round2(creditors[j].balance - amount);
    if (Math.abs(debtors[i].balance) < 0.01) i += 1;
    if (Math.abs(creditors[j].balance) < 0.01) j += 1;
  }

  return result;
}

/** Pagamentos vencidos ou vencendo em breve. */
export function upcomingPayments<T extends { due_date: string | null; payment_status: PaymentStatus }>(
  expenses: T[],
  today: string,
  withinDays = 14,
): T[] {
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + withinDays);
  const limitStr = limit.toISOString().slice(0, 10);

  return expenses
    .filter(
      (e) =>
        e.due_date &&
        e.due_date <= limitStr &&
        (e.payment_status === 'unpaid' || e.payment_status === 'partial'),
    )
    .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''));
}
