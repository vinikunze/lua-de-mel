'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { failure, success, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { computeRoute, type RoutePoint } from '@/lib/google/routes';
import { GoogleNotConfiguredError } from '@/lib/google/places';
import { buildRouteUrlFromStops } from '@/lib/google/maps-url';
import type { PlaceRow, TravelMode } from '@/types/database';

const MODES: TravelMode[] = ['DRIVE', 'WALK', 'TRANSIT', 'BICYCLE', 'TWO_WHEELER'];

/**
 * Cria ou atualiza uma rota com várias paradas.
 *
 * O cálculo acontece aqui, no servidor: a chave do Google não sai daqui e os
 * números guardados são os mesmos que aparecem na tela e no PDF. Sem a API
 * configurada, a rota ainda é salva — apenas sem distância e duração, e o
 * link para o Google Maps continua funcionando.
 */
export async function saveRouteAction(
  tripId: string,
  routeId: string | null,
  input: {
    name: string;
    dayDate: string | null;
    travelMode: string;
    placeIds: string[];
    optimize: boolean;
  },
): Promise<ActionResult<{ id: string; computed: boolean; message?: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('saveRoute:access', error));
  }

  if (input.placeIds.length < 2) {
    return failure('Escolha pelo menos dois locais para montar a rota.');
  }

  const travelMode: TravelMode = MODES.includes(input.travelMode as TravelMode)
    ? (input.travelMode as TravelMode)
    : 'DRIVE';

  const supabase = await createClient();

  const { data: placeRows, error: placesError } = await supabase
    .from('places')
    .select('*')
    .eq('trip_id', tripId)
    .in('id', input.placeIds);

  if (placesError) return failure(logAndFriendly('saveRoute:places', placesError));

  // Mantém exatamente a ordem escolhida pelo usuário.
  const places = input.placeIds
    .map((id) => (placeRows ?? []).find((p) => p.id === id))
    .filter((p): p is PlaceRow => Boolean(p));

  if (places.length < 2) return failure('Não encontramos os locais selecionados.');

  const toPoint = (place: PlaceRow): RoutePoint => ({
    placeId: place.google_place_id,
    latitude: place.latitude,
    longitude: place.longitude,
    address: place.formatted_address,
  });

  let computed = false;
  let message: string | undefined;
  let distance: number | null = null;
  let duration: number | null = null;
  let trafficDuration: number | null = null;
  let polyline: string | null = null;
  let tolls: Record<string, unknown> | null = null;
  let legs: Array<{ distanceMeters: number; durationSeconds: number }> = [];
  let ordered = places;

  try {
    const result = await computeRoute(
      toPoint(places[0]),
      toPoint(places[places.length - 1]),
      places.slice(1, -1).map(toPoint),
      { travelMode, optimize: input.optimize },
    );

    computed = true;
    distance = result.distanceMeters;
    duration = result.durationSeconds;
    trafficDuration = result.durationInTrafficSeconds;
    polyline = result.encodedPolyline;
    tolls = result.tolls ? { estimated: result.tolls } : null;
    legs = result.legs;

    // Quando pedimos otimização, o Google devolve a nova ordem das paradas.
    if (input.optimize && result.optimizedIntermediateWaypointIndex) {
      const middle = places.slice(1, -1);
      ordered = [
        places[0],
        ...result.optimizedIntermediateWaypointIndex.map((i) => middle[i]).filter(Boolean),
        places[places.length - 1],
      ];
    }
  } catch (error) {
    if (error instanceof GoogleNotConfiguredError) {
      message = 'Rota salva sem cálculo automático: a API do Google não está configurada.';
    } else {
      console.error('[saveRoute:compute]', error);
      message = 'Rota salva, mas não foi possível calcular distância e duração agora.';
    }
  }

  const googleMapsUrl = buildRouteUrlFromStops(
    ordered.map((place) => ({
      latitude: place.latitude,
      longitude: place.longitude,
      address: place.formatted_address,
      name: place.name,
      googlePlaceId: place.google_place_id,
    })),
    travelMode,
  );

  const row = {
    name: input.name || `Rota de ${ordered.length} paradas`,
    day_date: input.dayDate,
    travel_mode: travelMode,
    optimize_waypoint_order: input.optimize,
    distance_meters: distance,
    duration_seconds: duration,
    duration_in_traffic_seconds: trafficDuration,
    encoded_polyline: polyline,
    toll_info: tolls,
    google_maps_url: googleMapsUrl,
    computed_at: computed ? new Date().toISOString() : null,
    stale: !computed,
  };

  let id = routeId;

  if (routeId) {
    const { error } = await supabase.from('routes').update(row).eq('id', routeId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveRoute:update', error));
    await supabase.from('route_waypoints').delete().eq('route_id', routeId);
  } else {
    const { data, error } = await supabase
      .from('routes')
      .insert({ ...row, trip_id: tripId })
      .select('id')
      .single();
    if (error || !data) return failure(logAndFriendly('saveRoute:insert', error));
    id = data.id;
  }

  if (!id) return failure('Não foi possível salvar a rota.');

  await supabase.from('route_waypoints').insert(
    ordered.map((place, index) => ({
      route_id: id,
      place_id: place.id,
      position: index,
      label: place.name,
      address: place.formatted_address,
      latitude: place.latitude,
      longitude: place.longitude,
      // A distância de cada trecho vem na mesma ordem das pernas devolvidas.
      leg_distance_meters: legs[index]?.distanceMeters ?? null,
      leg_duration_seconds: legs[index]?.durationSeconds ?? null,
    })),
  );

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id, computed, message });
}

export async function deleteRouteAction(tripId: string, routeId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteRoute:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('routes').delete().eq('id', routeId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteRoute', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
