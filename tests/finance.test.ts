import { describe, expect, it } from 'vitest';
import {
  effectiveAmount, memberBalances, plannedAmount, settlements, summarizeExpenses,
  totalsByCategory, upcomingPayments,
} from '@/lib/domain/finance';
import type { ExpenseWithSplits } from '@/server/queries/trips';
import type { ExpenseCategory, PaymentStatus } from '@/types/database';

/** Monta uma despesa completa a partir de poucos campos, para os testes ficarem legíveis. */
function expense(partial: Partial<ExpenseWithSplits>): ExpenseWithSplits {
  return {
    id: partial.id ?? crypto.randomUUID(),
    trip_id: 'trip',
    description: partial.description ?? 'Despesa',
    category: (partial.category ?? 'other') as ExpenseCategory,
    planned_amount: partial.planned_amount ?? null,
    actual_amount: partial.actual_amount ?? null,
    currency: partial.currency ?? 'BRL',
    exchange_rate: partial.exchange_rate ?? 1,
    payment_status: (partial.payment_status ?? 'unpaid') as PaymentStatus,
    paid_amount: partial.paid_amount ?? 0,
    due_date: partial.due_date ?? null,
    paid_at: null,
    payment_method: null,
    installments: 1,
    paid_by_member_id: partial.paid_by_member_id ?? null,
    split_enabled: partial.split_enabled ?? false,
    expense_date: null,
    flight_id: null,
    accommodation_id: null,
    car_rental_id: null,
    itinerary_item_id: null,
    notes: null,
    created_by: null,
    created_at: '2027-01-01T00:00:00Z',
    updated_at: '2027-01-01T00:00:00Z',
    splits: partial.splits ?? [],
  };
}

function split(expenseId: string, memberId: string, share = 0) {
  return {
    id: crypto.randomUUID(),
    expense_id: expenseId,
    member_id: memberId,
    share_amount: share,
    is_settled: false,
    created_at: '2027-01-01T00:00:00Z',
  };
}

describe('valor considerado de uma despesa', () => {
  it('prefere o valor real quando existe', () => {
    expect(effectiveAmount({ planned_amount: 200, actual_amount: 173, exchange_rate: 1 })).toBe(173);
  });

  it('cai para o planejado quando ainda não há valor real', () => {
    expect(effectiveAmount({ planned_amount: 200, actual_amount: null, exchange_rate: 1 })).toBe(200);
  });

  it('converte pelo câmbio informado', () => {
    expect(effectiveAmount({ planned_amount: null, actual_amount: 100, exchange_rate: 5.4 })).toBe(540);
  });

  it('planejado usa o real quando só existe o real', () => {
    expect(plannedAmount({ planned_amount: null, actual_amount: 90, exchange_rate: 1 })).toBe(90);
  });
});

describe('resumo financeiro', () => {
  const despesas = [
    expense({ planned_amount: 3000, actual_amount: 2850, paid_amount: 2850, payment_status: 'paid' }),
    expense({ planned_amount: 2500, actual_amount: null, paid_amount: 1000, payment_status: 'partial' }),
    expense({ planned_amount: 800, actual_amount: 900, paid_amount: 0, payment_status: 'unpaid' }),
  ];

  it('soma planejado, real, pago e o que falta pagar', () => {
    const resumo = summarizeExpenses(despesas, 10000);
    expect(resumo.planned).toBe(6300);
    expect(resumo.actual).toBe(6250);
    expect(resumo.paid).toBe(3850);
    expect(resumo.outstanding).toBe(2400);
    expect(resumo.available).toBe(3750);
    expect(resumo.overBudget).toBe(false);
  });

  it('acusa estouro de orçamento', () => {
    const resumo = summarizeExpenses(despesas, 5000);
    expect(resumo.overBudget).toBe(true);
    expect(resumo.available).toBe(-1250);
  });

  it('ignora despesas canceladas e reembolsadas', () => {
    const resumo = summarizeExpenses(
      [
        ...despesas,
        expense({ actual_amount: 5000, payment_status: 'cancelled' }),
        expense({ actual_amount: 700, payment_status: 'refunded' }),
      ],
      10000,
    );
    expect(resumo.actual).toBe(6250);
  });

  it('funciona sem orçamento definido', () => {
    const resumo = summarizeExpenses(despesas, null);
    expect(resumo.budget).toBeNull();
    expect(resumo.available).toBeNull();
    expect(resumo.overBudget).toBe(false);
  });

  it('nunca devolve saldo negativo a pagar', () => {
    const resumo = summarizeExpenses(
      [expense({ actual_amount: 100, paid_amount: 150, payment_status: 'paid' })],
      null,
    );
    expect(resumo.outstanding).toBe(0);
  });
});

describe('gastos por categoria', () => {
  it('agrupa, ordena por valor e calcula a participação', () => {
    const totais = totalsByCategory([
      expense({ category: 'accommodation', actual_amount: 3200 }),
      expense({ category: 'flights', actual_amount: 2800 }),
      expense({ category: 'food', actual_amount: 1500 }),
      expense({ category: 'flights', actual_amount: 200 }),
    ]);

    expect(totais[0].category).toBe('accommodation');
    expect(totais[1].category).toBe('flights');
    expect(totais[1].total).toBe(3000);
    expect(totais.reduce((acc, entry) => acc + entry.share, 0)).toBeCloseTo(1, 5);
  });
});

describe('balanço entre viajantes', () => {
  const vinicius = 'membro-1';
  const sophia = 'membro-2';

  it('credita quem pagou e debita a cota de cada um', () => {
    const hotel = expense({
      id: 'hotel',
      actual_amount: 1500,
      split_enabled: true,
      paid_by_member_id: vinicius,
    });
    hotel.splits = [split('hotel', vinicius, 750), split('hotel', sophia, 750)];

    const saldos = memberBalances([hotel], [vinicius, sophia]);
    const dele = saldos.find((s) => s.memberId === vinicius);
    const dela = saldos.find((s) => s.memberId === sophia);

    expect(dele?.paid).toBe(1500);
    expect(dele?.owes).toBe(750);
    expect(dele?.balance).toBe(750);
    expect(dela?.balance).toBe(-750);
  });

  it('divide igualmente quando as cotas não foram informadas', () => {
    const jantar = expense({
      id: 'jantar',
      actual_amount: 100,
      split_enabled: true,
      paid_by_member_id: sophia,
    });
    jantar.splits = [split('jantar', vinicius), split('jantar', sophia)];

    const saldos = memberBalances([jantar], [vinicius, sophia]);
    expect(saldos.find((s) => s.memberId === vinicius)?.owes).toBe(50);
    expect(saldos.find((s) => s.memberId === sophia)?.balance).toBe(50);
  });

  it('ignora despesas sem divisão habilitada', () => {
    const saldos = memberBalances(
      [expense({ actual_amount: 900, paid_by_member_id: vinicius, split_enabled: false })],
      [vinicius, sophia],
    );
    expect(saldos.every((s) => s.balance === 0)).toBe(true);
  });

  it('fecha em zero: o que um deve, o outro tem a receber', () => {
    const a = expense({ id: 'a', actual_amount: 300, split_enabled: true, paid_by_member_id: vinicius });
    a.splits = [split('a', vinicius, 150), split('a', sophia, 150)];
    const b = expense({ id: 'b', actual_amount: 100, split_enabled: true, paid_by_member_id: sophia });
    b.splits = [split('b', vinicius, 50), split('b', sophia, 50)];

    const saldos = memberBalances([a, b], [vinicius, sophia]);
    expect(saldos.reduce((acc, s) => acc + s.balance, 0)).toBeCloseTo(0, 5);
    expect(saldos.find((s) => s.memberId === vinicius)?.balance).toBe(100);
  });
});

describe('sugestão de acerto de contas', () => {
  it('propõe uma transferência entre quem deve e quem tem a receber', () => {
    const acertos = settlements([
      { memberId: 'a', paid: 1500, owes: 750, balance: 750 },
      { memberId: 'b', paid: 0, owes: 750, balance: -750 },
    ]);
    expect(acertos).toEqual([{ fromMemberId: 'b', toMemberId: 'a', amount: 750 }]);
  });

  it('resolve três pessoas com o menor número de transferências', () => {
    const acertos = settlements([
      { memberId: 'a', paid: 300, owes: 100, balance: 200 },
      { memberId: 'b', paid: 0, owes: 100, balance: -100 },
      { memberId: 'c', paid: 0, owes: 100, balance: -100 },
    ]);
    expect(acertos).toHaveLength(2);
    expect(acertos.every((s) => s.toMemberId === 'a')).toBe(true);
    expect(acertos.reduce((acc, s) => acc + s.amount, 0)).toBe(200);
  });

  it('não sugere nada quando está tudo equilibrado', () => {
    expect(settlements([{ memberId: 'a', paid: 100, owes: 100, balance: 0 }])).toEqual([]);
  });
});

describe('pagamentos a vencer', () => {
  it('lista apenas o que vence na janela e ainda não foi pago', () => {
    const lista = upcomingPayments(
      [
        expense({ description: 'Hotel', due_date: '2027-08-01', payment_status: 'unpaid' }),
        expense({ description: 'Ingresso', due_date: '2027-08-10', payment_status: 'partial' }),
        expense({ description: 'Voo', due_date: '2027-08-02', payment_status: 'paid' }),
        expense({ description: 'Seguro', due_date: '2027-09-30', payment_status: 'unpaid' }),
      ],
      '2027-07-28',
      14,
    );

    expect(lista.map((e) => e.description)).toEqual(['Hotel', 'Ingresso']);
  });
});
