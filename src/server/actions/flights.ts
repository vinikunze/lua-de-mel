'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { flightSchema } from '@/lib/validators/flight';
import { zonedToUtc } from '@/lib/format/date';

/**
 * Converte o FormData em objeto, agrupando os passageiros que vêm como
 * `passengers[0].fullName`, `passengers[0].seat`, …
 */
function parseFlightForm(formData: FormData) {
  const raw: Record<string, unknown> = {};
  const passengers: Array<Record<string, string>> = [];

  for (const [key, value] of formData.entries()) {
    const match = key.match(/^passengers\[(\d+)\]\.(\w+)$/);
    if (match) {
      const index = Number(match[1]);
      passengers[index] = { ...(passengers[index] ?? {}), [match[2]]: String(value) };
      continue;
    }
    raw[key] = value;
  }

  raw.passengers = passengers.filter((p) => p && p.fullName?.trim());
  return raw;
}

function flightRow(input: ReturnType<typeof flightSchema.parse>) {
  return {
    group_label: input.groupLabel,
    airline: input.airline,
    airline_iata: input.airlineIata,
    flight_number: input.flightNumber,
    booking_reference: input.bookingReference,
    origin_airport: input.originAirport,
    origin_iata: input.originIata,
    origin_terminal: input.originTerminal,
    origin_timezone: input.originTimezone,
    destination_airport: input.destinationAirport,
    destination_iata: input.destinationIata,
    destination_terminal: input.destinationTerminal,
    destination_timezone: input.destinationTimezone,
    gate: input.gate,
    // Cada horário é gravado no fuso do seu próprio aeroporto.
    boarding_at: input.boardingTime
      ? zonedToUtc(input.departureDate, input.boardingTime, input.originTimezone).toISOString()
      : null,
    departure_at: zonedToUtc(input.departureDate, input.departureTime, input.originTimezone).toISOString(),
    arrival_at: zonedToUtc(input.arrivalDate, input.arrivalTime, input.destinationTimezone).toISOString(),
    cabin_class: input.cabinClass,
    seats: input.seats,
    carry_on_baggage: input.carryOnBaggage,
    checked_baggage: input.checkedBaggage,
    price_per_passenger: input.pricePerPassenger,
    taxes: input.taxes,
    total_price: input.totalPrice,
    currency: input.currency,
    payment_method: input.paymentMethod,
    payment_status: input.paymentStatus,
    airline_url: input.airlineUrl,
    booking_url: input.bookingUrl,
    notes: input.notes,
  };
}

export async function saveFlightAction(
  tripId: string,
  flightId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = flightSchema.safeParse(parseFlightForm(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('saveFlight:access', error));
  }

  const supabase = await createClient();
  const row = flightRow(parsed.data);

  let id = flightId;

  if (flightId) {
    const { error } = await supabase.from('flights').update(row).eq('id', flightId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveFlight:update', error));
  } else {
    const { count } = await supabase
      .from('flights')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId);
    const { data, error } = await supabase
      .from('flights')
      .insert({ ...row, trip_id: tripId, position: count ?? 0 })
      .select('id')
      .single();
    if (error || !data) return failure(logAndFriendly('saveFlight:insert', error));
    id = data.id;
  }

  if (!id) return failure('Não foi possível salvar o voo.');

  // Passageiros são substituídos por completo — é a operação mais previsível.
  await supabase.from('flight_passengers').delete().eq('flight_id', id);
  if (parsed.data.passengers.length > 0) {
    await supabase.from('flight_passengers').insert(
      parsed.data.passengers.map((p) => ({
        flight_id: id,
        full_name: p.fullName,
        seat: p.seat,
        ticket_number: p.ticketNumber,
      })),
    );
  }

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id });
}

export async function deleteFlightAction(tripId: string, flightId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteFlight:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('flights').delete().eq('id', flightId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteFlight', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function updateFlightPaymentAction(
  tripId: string,
  flightId: string,
  status: 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled',
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('updateFlightPayment:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('flights')
    .update({ payment_status: status })
    .eq('id', flightId)
    .eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('updateFlightPayment', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
