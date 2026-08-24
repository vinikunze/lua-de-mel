'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { readPlaceForm, upsertPlace } from '@/server/places';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { itineraryItemSchema } from '@/lib/validators/itinerary';
import { zonedToUtc } from '@/lib/format/date';
import type { ItineraryCategory, ItineraryStatus, PlaceCategory } from '@/types/database';

const CATEGORY_TO_PLACE: Record<string, PlaceCategory> = {
  restaurant: 'restaurant',
  attraction: 'attraction',
  tour: 'attraction',
  shopping: 'shopping',
  event: 'event',
  transport: 'transport',
  accommodation: 'accommodation',
  car: 'car_rental',
  flight: 'airport',
};

export async function saveItineraryItemAction(
  tripId: string,
  itemId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('saveItineraryItem:access', error));
  }

  const selected = readPlaceForm(formData, 'place');
  const raw = Object.fromEntries(formData.entries());

  const parsed = itineraryItemSchema.safeParse({
    ...raw,
    title: String(raw.title ?? '').trim() || selected?.name || '',
    address: String(raw.address ?? '').trim() || selected?.formattedAddress || '',
    placeId: String(raw.placeId ?? '') || null,
  });

  if (!parsed.success) return zodFailure(parsed.error);
  const input = parsed.data;

  const supabase = await createClient();

  // Um local novo escolhido na busca é gravado e vinculado ao evento.
  let placeId = input.placeId;
  if (selected && !placeId) {
    const place = await upsertPlace(
      tripId,
      selected,
      CATEGORY_TO_PLACE[input.category] ?? 'other',
      userId,
    );
    placeId = place?.id ?? null;
  }

  const startsAt =
    input.dayDate && input.startTime
      ? zonedToUtc(input.dayDate, input.startTime, input.timezone).toISOString()
      : null;
  const endsAt =
    input.dayDate && input.endTime
      ? zonedToUtc(input.dayDate, input.endTime, input.timezone).toISOString()
      : null;

  const row = {
    place_id: placeId,
    day_date: input.dayDate,
    starts_at: startsAt,
    ends_at: endsAt,
    timezone: input.timezone,
    title: input.title,
    category: input.category as ItineraryCategory,
    description: input.description,
    address: input.address,
    cost: input.cost,
    currency: input.currency,
    reservation_code: input.reservationCode,
    url: input.url,
    phone: input.phone,
    status: input.status as ItineraryStatus,
    notes: input.notes,
  };

  if (itemId) {
    const { error } = await supabase
      .from('itinerary_items')
      .update(row)
      .eq('id', itemId)
      .eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveItineraryItem:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: itemId });
  }

  // Novo evento entra no fim do dia escolhido.
  const positionQuery = supabase
    .from('itinerary_items')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  const { count } = input.dayDate
    ? await positionQuery.eq('day_date', input.dayDate)
    : await positionQuery.is('day_date', null);

  const { data, error } = await supabase
    .from('itinerary_items')
    .insert({ ...row, trip_id: tripId, position: count ?? 0, created_by: userId ?? null })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('saveItineraryItem:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteItineraryItemAction(tripId: string, itemId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteItineraryItem:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('itinerary_items').delete().eq('id', itemId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteItineraryItem', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/**
 * Reordena os eventos de um dia (arrastar e soltar).
 * Nunca mexemos nos horários — apenas na ordem. Se o usuário quiser trocar o
 * horário, ele edita o evento.
 */
export async function reorderItineraryAction(
  tripId: string,
  dayDate: string | null,
  itemIds: string[],
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('reorderItinerary:access', error));
  }

  if (itemIds.length === 0) return success(null);

  const supabase = await createClient();
  const { error } = await supabase.rpc('reorder_itinerary_items', {
    p_trip_id: tripId,
    p_item_ids: itemIds,
    p_day: dayDate,
  });

  if (error) return failure(logAndFriendly('reorderItinerary', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function updateItineraryStatusAction(
  tripId: string,
  itemId: string,
  status: ItineraryStatus,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('updateItineraryStatus:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('itinerary_items')
    .update({ status })
    .eq('id', itemId)
    .eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('updateItineraryStatus', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/** Move um evento para outro dia mantendo o horário do relógio. */
export async function moveItineraryItemAction(
  tripId: string,
  itemId: string,
  dayDate: string | null,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('moveItineraryItem:access', error));
  }

  const supabase = await createClient();
  const { data: item } = await supabase
    .from('itinerary_items')
    .select('starts_at, ends_at, timezone')
    .eq('id', itemId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!item) return failure('Evento não encontrado.');

  const shift = (iso: string | null): string | null => {
    if (!iso || !dayDate) return null;
    const time = new Intl.DateTimeFormat('en-GB', {
      timeZone: item.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso));
    return zonedToUtc(dayDate, time, item.timezone).toISOString();
  };

  const { error } = await supabase
    .from('itinerary_items')
    .update({ day_date: dayDate, starts_at: shift(item.starts_at), ends_at: shift(item.ends_at) })
    .eq('id', itemId)
    .eq('trip_id', tripId);

  if (error) return failure(logAndFriendly('moveItineraryItem', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
