'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { readPlaceForm, upsertPlace } from '@/server/places';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { accommodationSchema } from '@/lib/validators/accommodation';
import { zonedToUtc } from '@/lib/format/date';

export async function saveAccommodationAction(
  tripId: string,
  accommodationId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('saveAccommodation:access', error));
  }

  const selected = readPlaceForm(formData, 'place');
  const raw = Object.fromEntries(formData.entries());

  // O local escolhido na busca preenche nome e endereço automaticamente.
  const parsed = accommodationSchema.safeParse({
    ...raw,
    name: String(raw.name ?? '').trim() || selected?.name || '',
    address: String(raw.address ?? '').trim() || selected?.formattedAddress || '',
    googlePlaceId: selected?.googlePlaceId ?? '',
    latitude: selected?.latitude ?? null,
    longitude: selected?.longitude ?? null,
    phone: String(raw.phone ?? '').trim() || selected?.phone || '',
    website: String(raw.website ?? '').trim() || selected?.website || '',
  });

  if (!parsed.success) return zodFailure(parsed.error);
  const input = parsed.data;

  const place = selected ? await upsertPlace(tripId, selected, 'accommodation', userId) : null;

  const row = {
    place_id: place?.id ?? null,
    name: input.name,
    kind: input.kind,
    address: input.address,
    google_place_id: input.googlePlaceId,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
    phone: input.phone,
    website: input.website,
    booking_url: input.bookingUrl,
    platform: input.platform,
    booking_reference: input.bookingReference,
    check_in_at: zonedToUtc(input.checkInDate, input.checkInTime, input.timezone).toISOString(),
    check_out_at: zonedToUtc(input.checkOutDate, input.checkOutTime, input.timezone).toISOString(),
    timezone: input.timezone,
    check_in_window: input.checkInWindow,
    check_out_window: input.checkOutWindow,
    guests: input.guests ?? null,
    room_type: input.roomType,
    breakfast_included: input.breakfastIncluded,
    parking_included: input.parkingIncluded,
    nightly_rate: input.nightlyRate,
    taxes: input.taxes,
    total_price: input.totalPrice,
    paid_amount: input.paidAmount ?? 0,
    currency: input.currency,
    payment_method: input.paymentMethod,
    payment_status: input.paymentStatus,
    cancellation_policy: input.cancellationPolicy,
    host_name: input.hostName,
    host_contact: input.hostContact,
    wifi_password: input.wifiPassword,
    access_instructions: input.accessInstructions,
    house_rules: input.houseRules,
    notes: input.notes,
  };

  const supabase = await createClient();

  if (accommodationId) {
    const { error } = await supabase
      .from('accommodations')
      .update(row)
      .eq('id', accommodationId)
      .eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveAccommodation:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: accommodationId });
  }

  const { data, error } = await supabase
    .from('accommodations')
    .insert({ ...row, trip_id: tripId })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('saveAccommodation:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteAccommodationAction(
  tripId: string,
  accommodationId: string,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteAccommodation:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('accommodations')
    .delete()
    .eq('id', accommodationId)
    .eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteAccommodation', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
