/**
 * Construção de links do Google Maps.
 * Funções puras — não dependem de API key e funcionam offline.
 * Documentação: https://developers.google.com/maps/documentation/urls/get-started
 */
import type { TravelMode } from '@/types/database';

export interface MapPoint {
  /** Preferir sempre o Place ID: é estável e leva ao local exato. */
  googlePlaceId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  name?: string | null;
}

const MODE_PARAM: Record<TravelMode, string> = {
  DRIVE: 'driving',
  WALK: 'walking',
  TRANSIT: 'transit',
  BICYCLE: 'bicycling',
  TWO_WHEELER: 'two-wheeler',
};

/** Texto que identifica o ponto na URL, na melhor precisão disponível. */
export function pointQuery(point: MapPoint): string | null {
  if (point.latitude != null && point.longitude != null) {
    return `${point.latitude},${point.longitude}`;
  }
  const text = point.address || point.name;
  return text ? text : null;
}

/** Abre um local específico no Google Maps. */
export function buildPlaceUrl(point: MapPoint): string | null {
  const query = pointQuery(point);
  if (!query && !point.googlePlaceId) return null;

  const params = new URLSearchParams({ api: '1' });
  params.set('query', query ?? point.name ?? '');
  if (point.googlePlaceId) params.set('query_place_id', point.googlePlaceId);
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/**
 * Rota com origem, destino, paradas intermediárias e modo de transporte.
 * O usuário abre no celular e já inicia a navegação.
 */
export function buildDirectionsUrl(
  origin: MapPoint,
  destination: MapPoint,
  waypoints: MapPoint[] = [],
  mode: TravelMode = 'DRIVE',
): string | null {
  const originQuery = pointQuery(origin);
  const destinationQuery = pointQuery(destination);
  if (!originQuery || !destinationQuery) return null;

  const params = new URLSearchParams({ api: '1' });
  params.set('origin', originQuery);
  if (origin.googlePlaceId) params.set('origin_place_id', origin.googlePlaceId);
  params.set('destination', destinationQuery);
  if (destination.googlePlaceId) params.set('destination_place_id', destination.googlePlaceId);
  params.set('travelmode', MODE_PARAM[mode] ?? 'driving');

  const stops = waypoints.map(pointQuery).filter((q): q is string => Boolean(q));
  if (stops.length > 0) {
    params.set('waypoints', stops.join('|'));
    const ids = waypoints.map((w) => w.googlePlaceId ?? '');
    if (ids.some(Boolean)) params.set('waypoint_place_ids', ids.join('|'));
  }

  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Rota a partir de uma sequência de pontos (o primeiro é a origem). */
export function buildRouteUrlFromStops(stops: MapPoint[], mode: TravelMode = 'DRIVE'): string | null {
  if (stops.length < 2) return null;
  const origin = stops[0];
  const destination = stops[stops.length - 1];
  return buildDirectionsUrl(origin, destination, stops.slice(1, -1), mode);
}

/** Link "como chegar" a partir da localização atual do usuário. */
export function buildNavigateFromHereUrl(destination: MapPoint, mode: TravelMode = 'DRIVE'): string | null {
  const query = pointQuery(destination);
  if (!query) return null;
  const params = new URLSearchParams({ api: '1', destination: query, travelmode: MODE_PARAM[mode] });
  if (destination.googlePlaceId) params.set('destination_place_id', destination.googlePlaceId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function hasCoordinates(point: MapPoint | null | undefined): boolean {
  return Boolean(point && point.latitude != null && point.longitude != null);
}
