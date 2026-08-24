/**
 * Places API (New) — sempre chamada do servidor.
 *
 * Controle de custo:
 *  - Field masks: pedimos apenas os campos que usamos.
 *  - Session token: autocomplete + details na mesma sessão contam como uma cobrança.
 *  - Debounce no cliente (ver `usePlaceAutocomplete`).
 *  - O resultado (Place ID + coordenadas) é gravado no banco e reaproveitado.
 */
import 'server-only';
import { serverMapsKey } from '@/lib/env';

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places';

export interface PlaceSuggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface PlaceDetails {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  city: string | null;
  country: string | null;
  types: string[];
}

export class GoogleNotConfiguredError extends Error {
  constructor() {
    super('Google Places não está configurado neste ambiente.');
    this.name = 'GoogleNotConfiguredError';
  }
}

interface AutocompleteResponse {
  suggestions?: Array<{
    placePrediction?: {
      placeId: string;
      structuredFormat?: {
        mainText?: { text?: string };
        secondaryText?: { text?: string };
      };
      text?: { text?: string };
    };
  }>;
}

export async function autocompletePlaces(
  input: string,
  options: { sessionToken?: string; languageCode?: string; regionCode?: string; bias?: { latitude: number; longitude: number; radius?: number } } = {},
): Promise<PlaceSuggestion[]> {
  const key = serverMapsKey();
  if (!key) throw new GoogleNotConfiguredError();
  if (input.trim().length < 3) return [];

  const body: Record<string, unknown> = {
    input,
    languageCode: options.languageCode ?? 'pt-BR',
    regionCode: options.regionCode ?? 'BR',
  };
  if (options.sessionToken) body.sessionToken = options.sessionToken;
  if (options.bias) {
    body.locationBias = {
      circle: {
        center: { latitude: options.bias.latitude, longitude: options.bias.longitude },
        radius: options.bias.radius ?? 50_000,
      },
    };
  }

  const response = await fetch(AUTOCOMPLETE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      // Field mask: só o necessário para montar a lista de sugestões.
      'X-Goog-FieldMask':
        'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Places autocomplete falhou (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as AutocompleteResponse;
  return (data.suggestions ?? [])
    .map((s) => s.placePrediction)
    .filter((p): p is NonNullable<typeof p> => Boolean(p?.placeId))
    .map((p) => ({
      placeId: p.placeId,
      mainText: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
      secondaryText: p.structuredFormat?.secondaryText?.text ?? '',
    }));
}

interface DetailsResponse {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  internationalPhoneNumber?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  types?: string[];
  addressComponents?: Array<{ longText?: string; shortText?: string; types?: string[] }>;
}

export async function getPlaceDetails(
  placeId: string,
  options: { sessionToken?: string; languageCode?: string } = {},
): Promise<PlaceDetails> {
  const key = serverMapsKey();
  if (!key) throw new GoogleNotConfiguredError();

  const params = new URLSearchParams({ languageCode: options.languageCode ?? 'pt-BR' });
  if (options.sessionToken) params.set('sessionToken', options.sessionToken);

  const response = await fetch(`${DETAILS_URL}/${encodeURIComponent(placeId)}?${params}`, {
    headers: {
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'internationalPhoneNumber',
        'nationalPhoneNumber',
        'websiteUri',
        'googleMapsUri',
        'types',
        'addressComponents',
      ].join(','),
    },
    // Detalhes de um local mudam pouco: cache de 24 h reduz custo.
    next: { revalidate: 86_400 },
  });

  if (!response.ok) {
    throw new Error(`Places details falhou (${response.status}): ${await response.text()}`);
  }

  const data = (await response.json()) as DetailsResponse;
  const component = (type: string) =>
    data.addressComponents?.find((c) => c.types?.includes(type))?.longText ?? null;

  return {
    placeId: data.id ?? placeId,
    name: data.displayName?.text ?? '',
    formattedAddress: data.formattedAddress ?? null,
    latitude: data.location?.latitude ?? null,
    longitude: data.location?.longitude ?? null,
    phone: data.internationalPhoneNumber ?? data.nationalPhoneNumber ?? null,
    website: data.websiteUri ?? null,
    googleMapsUri: data.googleMapsUri ?? null,
    city:
      component('administrative_area_level_2') ??
      component('locality') ??
      component('administrative_area_level_1'),
    country: component('country'),
    types: data.types ?? [],
  };
}

/** Traduz os `types` do Google para a categoria usada no sistema. */
export function inferPlaceCategory(types: string[]): string {
  const has = (...values: string[]) => values.some((v) => types.includes(v));
  if (has('lodging', 'hotel', 'motel', 'resort_hotel', 'guest_house', 'hostel')) return 'accommodation';
  if (has('restaurant', 'cafe', 'bar', 'bakery', 'meal_takeaway', 'food')) return 'restaurant';
  if (has('airport', 'international_airport')) return 'airport';
  if (has('parking')) return 'parking';
  if (has('car_rental')) return 'car_rental';
  if (has('shopping_mall', 'store', 'clothing_store', 'supermarket')) return 'shopping';
  if (has('tourist_attraction', 'museum', 'park', 'zoo', 'amusement_park', 'church', 'point_of_interest'))
    return 'attraction';
  return 'other';
}
