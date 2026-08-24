'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { expenseSchema } from '@/lib/validators/expense';
import { splitEvenly, toNumber } from '@/lib/format/money';
import type { PaymentStatus } from '@/types/database';

function parseForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'splitMemberIds') continue;
    raw[key] = value;
  }
  raw.splitMemberIds = formData.getAll('splitMemberIds').map(String).filter(Boolean);
  raw.splitEnabled = formData.get('splitEnabled') === 'on';
  return raw;
}

export async function saveExpenseAction(
  tripId: string,
  expenseId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('saveExpense:access', error));
  }

  const parsed = expenseSchema.safeParse(parseForm(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const input = parsed.data;
  const supabase = await createClient();
  const user = await getCurrentUser();

  const row = {
    description: input.description,
    category: input.category,
    planned_amount: input.plannedAmount,
    actual_amount: input.actualAmount,
    currency: input.currency,
    exchange_rate: input.exchangeRate,
    payment_status: input.paymentStatus,
    paid_amount: input.paidAmount ?? 0,
    expense_date: input.expenseDate,
    due_date: input.dueDate,
    paid_at: input.paidAt,
    payment_method: input.paymentMethod,
    installments: input.installments,
    paid_by_member_id: input.paidByMemberId,
    split_enabled: input.splitEnabled,
    notes: input.notes,
    flight_id: input.flightId,
    accommodation_id: input.accommodationId,
    car_rental_id: input.carRentalId,
    itinerary_item_id: input.itineraryItemId,
  };

  let id = expenseId;

  if (expenseId) {
    const { error } = await supabase.from('expenses').update(row).eq('id', expenseId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveExpense:update', error));
  } else {
    const { data, error } = await supabase
      .from('expenses')
      .insert({ ...row, trip_id: tripId, created_by: user?.id ?? null })
      .select('id')
      .single();
    if (error || !data) return failure(logAndFriendly('saveExpense:insert', error));
    id = data.id;
  }

  if (!id) return failure('Não foi possível salvar a despesa.');

  // A divisão é recriada a cada gravação: mais simples e sem estados órfãos.
  await supabase.from('expense_splits').delete().eq('expense_id', id);

  if (input.splitEnabled && input.splitMemberIds.length > 0) {
    const total = toNumber(input.actualAmount ?? input.plannedAmount) ?? 0;
    const shares = splitEvenly(total, input.splitMemberIds.length);
    const { error } = await supabase.from('expense_splits').insert(
      input.splitMemberIds.map((memberId, index) => ({
        expense_id: id,
        member_id: memberId,
        share_amount: shares[index] ?? 0,
      })),
    );
    if (error) console.error('[saveExpense:splits]', error);
  }

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id });
}

export async function deleteExpenseAction(tripId: string, expenseId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteExpense:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteExpense', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/** Marca como pago em um clique, preenchendo o valor pago com o total. */
export async function markExpensePaidAction(
  tripId: string,
  expenseId: string,
  status: PaymentStatus,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('markExpensePaid:access', error));
  }

  const supabase = await createClient();
  const { data: expense } = await supabase
    .from('expenses')
    .select('planned_amount, actual_amount')
    .eq('id', expenseId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!expense) return failure('Despesa não encontrada.');

  const total = toNumber(expense.actual_amount ?? expense.planned_amount) ?? 0;
  const update =
    status === 'paid'
      ? { payment_status: status, paid_amount: total, paid_at: new Date().toISOString().slice(0, 10) }
      : { payment_status: status };

  const { error } = await supabase.from('expenses').update(update).eq('id', expenseId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('markExpensePaid', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/**
 * Cria despesas a partir das reservas já cadastradas.
 * Evita digitar duas vezes o mesmo valor de voo, hotel e carro.
 */
export async function importReservationExpensesAction(
  tripId: string,
): Promise<ActionResult<{ created: number }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('importReservationExpenses:access', error));
  }

  const supabase = await createClient();

  const [{ data: flights }, { data: stays }, { data: cars }, { data: existing }] = await Promise.all([
    supabase.from('flights').select('*').eq('trip_id', tripId),
    supabase.from('accommodations').select('*').eq('trip_id', tripId),
    supabase.from('car_rentals').select('*').eq('trip_id', tripId),
    supabase
      .from('expenses')
      .select('flight_id, accommodation_id, car_rental_id')
      .eq('trip_id', tripId),
  ]);

  const linkedFlights = new Set((existing ?? []).map((e) => e.flight_id).filter(Boolean));
  const linkedStays = new Set((existing ?? []).map((e) => e.accommodation_id).filter(Boolean));
  const linkedCars = new Set((existing ?? []).map((e) => e.car_rental_id).filter(Boolean));

  const rows: Array<Record<string, unknown>> = [];

  for (const flight of flights ?? []) {
    if (linkedFlights.has(flight.id) || flight.total_price == null) continue;
    rows.push({
      trip_id: tripId,
      description: `Passagem ${flight.origin_iata ?? ''} → ${flight.destination_iata ?? ''}`.trim(),
      category: 'flights',
      planned_amount: flight.total_price,
      actual_amount: flight.total_price,
      currency: flight.currency,
      payment_status: flight.payment_status,
      paid_amount: flight.payment_status === 'paid' ? flight.total_price : 0,
      payment_method: flight.payment_method,
      flight_id: flight.id,
      created_by: userId ?? null,
    });
  }

  for (const stay of stays ?? []) {
    if (linkedStays.has(stay.id) || stay.total_price == null) continue;
    rows.push({
      trip_id: tripId,
      description: `Hospedagem — ${stay.name}`,
      category: 'accommodation',
      planned_amount: stay.total_price,
      actual_amount: stay.total_price,
      currency: stay.currency,
      payment_status: stay.payment_status,
      paid_amount: stay.paid_amount ?? 0,
      payment_method: stay.payment_method,
      accommodation_id: stay.id,
      created_by: userId ?? null,
    });
  }

  for (const car of cars ?? []) {
    if (linkedCars.has(car.id) || car.total_price == null) continue;
    rows.push({
      trip_id: tripId,
      description: `Aluguel de carro — ${car.company}`,
      category: 'car_rental',
      planned_amount: car.total_price,
      actual_amount: car.total_price,
      currency: car.currency,
      payment_status: car.payment_status,
      paid_amount: car.paid_amount ?? 0,
      car_rental_id: car.id,
      created_by: userId ?? null,
    });
  }

  if (rows.length === 0) return success({ created: 0 });

  const { error } = await supabase.from('expenses').insert(rows as never);
  if (error) return failure(logAndFriendly('importReservationExpenses', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ created: rows.length });
}
