import { NextResponse } from 'next/server';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { effectiveAmount } from '@/lib/domain/finance';
import { EXPENSE_CATEGORY_LABEL, PAYMENT_STATUS_LABEL } from '@/lib/validators/expense';
import { slugify } from '@/lib/utils';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

/** Escapa um campo para CSV (aspas duplicadas e envolto em aspas). */
function cell(value: unknown): string {
  const text = value === null || value === undefined ? '' : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/**
 * Exportação das despesas em CSV.
 * Usamos ponto e vírgula: é o separador que o Excel em português espera.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  try {
    const { trip } = await loadTripAccess(tripId);
    const supabase = await createClient();
    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
      .eq('trip_id', tripId)
      .order('expense_date', { ascending: true, nullsFirst: false });

    const header = [
      'Descrição', 'Categoria', 'Data', 'Vencimento', 'Situação',
      'Planejado', 'Real', 'Moeda', 'Câmbio', `Equivalente (${trip.base_currency})`,
      'Pago', 'Parcelas', 'Forma de pagamento', 'Observações',
    ];

    const rows = (expenses ?? []).map((expense) =>
      [
        expense.description,
        EXPENSE_CATEGORY_LABEL[expense.category] ?? expense.category,
        expense.expense_date ?? '',
        expense.due_date ?? '',
        PAYMENT_STATUS_LABEL[expense.payment_status] ?? expense.payment_status,
        expense.planned_amount ?? '',
        expense.actual_amount ?? '',
        expense.currency,
        expense.exchange_rate,
        effectiveAmount(expense).toFixed(2),
        expense.paid_amount,
        expense.installments,
        expense.payment_method ?? '',
        expense.notes ?? '',
      ].map(cell).join(';'),
    );

    // BOM para o Excel reconhecer o UTF-8 e não quebrar os acentos.
    const csv = `﻿${[header.map(cell).join(';'), ...rows].join('\r\n')}\r\n`;

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="despesas-${slugify(trip.name) || 'viagem'}.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return new NextResponse(error.message, { status: 403 });
    }
    console.error('[api/viagens/despesas.csv]', error);
    return new NextResponse('Não foi possível exportar as despesas.', { status: 500 });
  }
}
