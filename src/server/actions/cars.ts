'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { readPlaceForm, upsertPlace } from '@/server/places';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { carRentalSchema } from '@/lib/validators/car';
import { zonedToUtc } from '@/lib/format/date';

export async function saveCarRentalAction(
  tripId: string,
  carId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('saveCarRental:access', error));
  }

  const pickupPlace = readPlaceForm(formData, 'pickupPlace');
  const dropoffPlace = readPlaceForm(formData, 'dropoffPlace');
  const raw = Object.fromEntries(formData.entries());

  const parsed = carRentalSchema.safeParse({
    ...raw,
    pickupLocation: String(raw.pickupLocation ?? '').trim() || pickupPlace?.name || '',
    pickupAddress: String(raw.pickupAddress ?? '').trim() || pickupPlace?.formattedAddress || '',
    dropoffLocation: String(raw.dropoffLocation ?? '').trim() || dropoffPlace?.name || '',
    dropoffAddress: String(raw.dropoffAddress ?? '').trim() || dropoffPlace?.formattedAddress || '',
  });

  if (!parsed.success) return zodFailure(parsed.error);
  const input = parsed.data;

  const pickup = pickupPlace ? await upsertPlace(tripId, pickupPlace, 'car_rental', userId) : null;
  const dropoff = dropoffPlace ? await upsertPlace(tripId, dropoffPlace, 'car_rental', userId) : null;

  const row = {
    company: input.company,
    category: input.category,
    vehicle_model: input.vehicleModel,
    booking_reference: input.bookingReference,
    pickup_place_id: pickup?.id ?? null,
    pickup_location: input.pickupLocation,
    pickup_address: input.pickupAddress,
    pickup_at: zonedToUtc(input.pickupDate, input.pickupTime, input.pickupTimezone).toISOString(),
    pickup_timezone: input.pickupTimezone,
    dropoff_place_id: dropoff?.id ?? null,
    dropoff_location: input.dropoffLocation,
    dropoff_address: input.dropoffAddress,
    dropoff_at: zonedToUtc(input.dropoffDate, input.dropoffTime, input.dropoffTimezone).toISOString(),
    dropoff_timezone: input.dropoffTimezone,
    daily_rate: input.dailyRate,
    days_count: input.daysCount ?? null,
    total_price: input.totalPrice,
    paid_amount: input.paidAmount ?? 0,
    deposit_amount: input.depositAmount,
    currency: input.currency,
    payment_status: input.paymentStatus,
    insurance: input.insurance,
    fuel_policy: input.fuelPolicy,
    mileage_policy: input.mileagePolicy,
    main_driver: input.mainDriver,
    additional_driver: input.additionalDriver,
    company_phone: input.companyPhone,
    booking_url: input.bookingUrl,
    notes: input.notes,
  };

  const supabase = await createClient();

  if (carId) {
    const { error } = await supabase.from('car_rentals').update(row).eq('id', carId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveCarRental:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: carId });
  }

  const { data, error } = await supabase
    .from('car_rentals')
    .insert({ ...row, trip_id: tripId })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('saveCarRental:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteCarRentalAction(tripId: string, carId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteCarRental:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('car_rentals').delete().eq('id', carId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteCarRental', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
