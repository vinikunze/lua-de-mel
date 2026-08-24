import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { PlaceCategory, PlaceRow } from '@/types/database';

export interface PlaceFormValue {
  name: string;
  formattedAddress: string | null;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUrl: string | null;
  city: string | null;
  country: string | null;
}

const num = (value: FormDataEntryValue | null): number | null => {
  if (value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const text = (value: FormDataEntryValue | null): string | null => {
  const str = value === null ? '' : String(value).trim();
  return str === '' ? null : str;
};

/** Lê os campos ocultos gravados pelo `PlaceAutocomplete`. */
export function readPlaceForm(formData: FormData, prefix = 'place'): PlaceFormValue | null {
  const name = text(formData.get(`${prefix}.name`));
  if (!name) return null;
  return {
    name,
    formattedAddress: text(formData.get(`${prefix}.formattedAddress`)),
    googlePlaceId: text(formData.get(`${prefix}.googlePlaceId`)),
    latitude: num(formData.get(`${prefix}.latitude`)),
    longitude: num(formData.get(`${prefix}.longitude`)),
    phone: text(formData.get(`${prefix}.phone`)),
    website: text(formData.get(`${prefix}.website`)),
    googleMapsUrl: text(formData.get(`${prefix}.googleMapsUrl`)),
    city: text(formData.get(`${prefix}.city`)),
    country: text(formData.get(`${prefix}.country`)),
  };
}

/**
 * Grava (ou reaproveita) o local na tabela `places`.
 *
 * Reaproveitar pelo Place ID evita duplicar o mesmo hotel em vários registros
 * e economiza chamadas futuras ao Google — as coordenadas já ficam salvas.
 */
export async function upsertPlace(
  tripId: string,
  value: PlaceFormValue,
  category: PlaceCategory,
  userId?: string,
): Promise<PlaceRow | null> {
  const supabase = await createClient();

  if (value.googlePlaceId) {
    const { data: existing } = await supabase
      .from('places')
      .select('*')
      .eq('trip_id', tripId)
      .eq('google_place_id', value.googlePlaceId)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await supabase
    .from('places')
    .insert({
      trip_id: tripId,
      name: value.name,
      category,
      formatted_address: value.formattedAddress,
      google_place_id: value.googlePlaceId,
      latitude: value.latitude,
      longitude: value.longitude,
      city: value.city,
      country: value.country,
      phone: value.phone,
      website: value.website,
      google_maps_url: value.googleMapsUrl,
      created_by: userId ?? null,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[upsertPlace]', error);
    return null;
  }
  return data;
}
