/**
 * Routes API — cálculo de distância, duração e polyline.
 * Sempre no servidor, com field mask e resultado guardado em cache no banco.
 */
import 'server-only';
import { serverMapsKey } from '@/lib/env';
import type { TravelMode } from '@/types/database';
import { GoogleNotConfiguredError } from '@/lib/google/places';

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes';

export interface RoutePoint {
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface RouteLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds: number | null;
  encodedPolyline: string | null;
  legs: RouteLeg[];
  /** Ordem otimizada das paradas intermediárias, quando solicitada. */
  optimizedIntermediateWaypointIndex: number[] | null;
  tolls: { currency: string; amount: number }[] | null;
}

function toWaypoint(point: RoutePoint) {
  if (point.placeId) return { placeId: point.placeId };
  if (point.latitude != null && point.longitude != null) {
    return { location: { latLng: { latitude: point.latitude, longitude: point.longitude } } };
  }
  if (point.address) return { address: point.address };
  return null;
}

export function isRoutable(point: RoutePoint | null | undefined): boolean {
  return Boolean(point && toWaypoint(point));
}

function parseDuration(value: string | undefined): number {
  if (!value) return 0;
  return Math.round(Number(value.replace(/s$/, '')) || 0);
}

interface ComputeRoutesResponse {
  routes?: Array<{
    distanceMeters?: number;
    duration?: string;
    staticDuration?: string;
    polyline?: { encodedPolyline?: string };
    optimizedIntermediateWaypointIndex?: number[];
    travelAdvisory?: {
      tollInfo?: { estimatedPrice?: Array<{ currencyCode?: string; units?: string; nanos?: number }> };
    };
    legs?: Array<{ distanceMeters?: number; duration?: string }>;
  }>;
  error?: { message?: string };
}

export async function computeRoute(
  origin: RoutePoint,
  destination: RoutePoint,
  intermediates: RoutePoint[] = [],
  options: { travelMode?: TravelMode; optimize?: boolean; departureTime?: string } = {},
): Promise<RouteResult> {
  const key = serverMapsKey();
  if (!key) throw new GoogleNotConfiguredError();

  const originWaypoint = toWaypoint(origin);
  const destinationWaypoint = toWaypoint(destination);
  if (!originWaypoint || !destinationWaypoint) {
    throw new Error('Origem e destino precisam de endereço ou coordenadas.');
  }

  const travelMode = options.travelMode ?? 'DRIVE';
  const supportsTraffic = travelMode === 'DRIVE' || travelMode === 'TWO_WHEELER';

  const body: Record<string, unknown> = {
    origin: originWaypoint,
    destination: destinationWaypoint,
    travelMode,
    languageCode: 'pt-BR',
    units: 'METRIC',
  };

  const stops = intermediates.map(toWaypoint).filter((w): w is NonNullable<typeof w> => Boolean(w));
  if (stops.length > 0) {
    body.intermediates = stops;
    if (options.optimize) body.optimizeWaypointOrder = true;
  }

  if (supportsTraffic) {
    body.routingPreference = 'TRAFFIC_AWARE';
    body.extraComputations = ['TOLLS'];
    if (options.departureTime) body.departureTime = options.departureTime;
  }

  const fieldMask = [
    'routes.distanceMeters',
    'routes.duration',
    'routes.staticDuration',
    'routes.polyline.encodedPolyline',
    'routes.legs.distanceMeters',
    'routes.legs.duration',
    'routes.optimizedIntermediateWaypointIndex',
    'routes.travelAdvisory.tollInfo',
  ].join(',');

  const response = await fetch(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': fieldMask,
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });

  const data = (await response.json()) as ComputeRoutesResponse;

  if (!response.ok) {
    throw new Error(data.error?.message ?? `Routes API falhou (${response.status}).`);
  }

  const route = data.routes?.[0];
  if (!route) throw new Error('Não foi possível encontrar uma rota entre estes pontos.');

  const tolls =
    route.travelAdvisory?.tollInfo?.estimatedPrice?.map((price) => ({
      currency: price.currencyCode ?? 'BRL',
      amount: Number(price.units ?? 0) + (price.nanos ?? 0) / 1e9,
    })) ?? null;

  const trafficAware = supportsTraffic ? parseDuration(route.duration) : null;
  const staticDuration = parseDuration(route.staticDuration ?? route.duration);

  return {
    distanceMeters: route.distanceMeters ?? 0,
    durationSeconds: staticDuration || parseDuration(route.duration),
    durationInTrafficSeconds: trafficAware && trafficAware !== staticDuration ? trafficAware : null,
    encodedPolyline: route.polyline?.encodedPolyline ?? null,
    legs: (route.legs ?? []).map((leg) => ({
      distanceMeters: leg.distanceMeters ?? 0,
      durationSeconds: parseDuration(leg.duration),
    })),
    optimizedIntermediateWaypointIndex: route.optimizedIntermediateWaypointIndex ?? null,
    tolls: tolls && tolls.length > 0 ? tolls : null,
  };
}

/** Chave estável de cache para um par origem/destino + modo. */
export function legCacheKey(origin: RoutePoint, destination: RoutePoint, mode: TravelMode): string {
  const id = (p: RoutePoint) =>
    p.placeId ??
    (p.latitude != null && p.longitude != null
      ? `${p.latitude.toFixed(5)},${p.longitude.toFixed(5)}`
      : (p.address ?? '?'));
  return `${mode}|${id(origin)}|${id(destination)}`;
}
