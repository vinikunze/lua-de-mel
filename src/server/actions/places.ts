'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { readPlaceForm, upsertPlace } from '@/server/places';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { placeSchema, PLACE_CATEGORIES } from '@/lib/validators/place';
import type { PlaceCategory } from '@/types/database';

export async function savePlaceAction(
  tripId: string,
  placeId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('savePlace:access', error));
  }

  const selected = readPlaceForm(formData, 'place');
  const category = String(formData.get('category') ?? 'other') as PlaceCategory;
  const validCategory = PLACE_CATEGORIES.includes(category) ? category : 'other';

  const parsed = placeSchema.safeParse({
    name: selected?.name ?? formData.get('name') ?? '',
    formattedAddress: selected?.formattedAddress ?? formData.get('address') ?? '',
    googlePlaceId: selected?.googlePlaceId ?? '',
    latitude: selected?.latitude ?? null,
    longitude: selected?.longitude ?? null,
    city: selected?.city ?? '',
    country: selected?.country ?? '',
    phone: selected?.phone ?? formData.get('phone') ?? '',
    website: selected?.website ?? formData.get('website') ?? '',
    googleMapsUrl: selected?.googleMapsUrl ?? '',
    category: validCategory,
    notes: formData.get('notes') ?? '',
    isFavorite: formData.get('isFavorite') === 'on',
  });

  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const user = await getCurrentUser();
  const input = parsed.data;

  const row = {
    name: input.name,
    category: input.category,
    formatted_address: input.formattedAddress,
    google_place_id: input.googlePlaceId,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    city: input.city,
    country: input.country,
    phone: input.phone,
    website: input.website,
    google_maps_url: input.googleMapsUrl,
    notes: input.notes,
    is_favorite: input.isFavorite,
  };

  if (placeId) {
    const { error } = await supabase.from('places').update(row).eq('id', placeId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('savePlace:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: placeId });
  }

  const { data, error } = await supabase
    .from('places')
    .insert({ ...row, trip_id: tripId, created_by: user?.id ?? null })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('savePlace:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deletePlaceAction(tripId: string, placeId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deletePlace:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('places').delete().eq('id', placeId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deletePlace', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function toggleFavoritePlaceAction(
  tripId: string,
  placeId: string,
  isFavorite: boolean,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('toggleFavorite:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('places')
    .update({ is_favorite: isFavorite })
    .eq('id', placeId)
    .eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('toggleFavorite', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/**
 * Cria um local a partir da busca e já o vincula a um dia do roteiro.
 * É o fluxo "salvar local rapidamente" usado durante a viagem.
 */
export async function quickAddPlaceAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ placeId: string; itemId: string | null }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('quickAddPlace:access', error));
  }

  const selected = readPlaceForm(formData, 'place');
  if (!selected) return failure('Escolha um local antes de salvar.');

  const category = String(formData.get('category') ?? 'other') as PlaceCategory;
  const place = await upsertPlace(
    tripId,
    selected,
    PLACE_CATEGORIES.includes(category) ? category : 'other',
    userId,
  );
  if (!place) return failure('Não foi possível salvar o local.');

  const day = String(formData.get('dayDate') ?? '').trim();
  let itemId: string | null = null;

  if (day) {
    const supabase = await createClient();
    const { count } = await supabase
      .from('itinerary_items')
      .select('id', { count: 'exact', head: true })
      .eq('trip_id', tripId)
      .eq('day_date', day);

    const { data } = await supabase
      .from('itinerary_items')
      .insert({
        trip_id: tripId,
        place_id: place.id,
        day_date: day,
        title: place.name,
        category: place.category === 'restaurant' ? 'restaurant' : 'attraction',
        address: place.formatted_address,
        position: count ?? 0,
        created_by: userId ?? null,
      })
      .select('id')
      .single();
    itemId = data?.id ?? null;
  }

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ placeId: place.id, itemId });
}
