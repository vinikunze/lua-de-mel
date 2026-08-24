import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { loadTripAccess } from '@/server/trip-access';
import { computeRoute, legCacheKey, type RoutePoint } from '@/lib/google/routes';
import { GoogleNotConfiguredError } from '@/lib/google/places';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

const pointSchema = z.object({
  placeId: z.string().nullish(),
  latitude: z.number().nullish(),
  longitude: z.number().nullish(),
  address: z.string().nullish(),
});

const bodySchema = z.object({
  tripId: z.string().uuid(),
  origin: pointSchema,
  destination: pointSchema,
  intermediates: z.array(pointSchema).max(23).default([]),
  travelMode: z.enum(['DRIVE', 'WALK', 'TRANSIT', 'BICYCLE', 'TWO_WHEELER']).default('DRIVE'),
  optimize: z.boolean().default(false),
  /** Ignora o cache e consulta o Google de novo (botão "Atualizar rota"). */
  refresh: z.boolean().default(false),
});

/** Trechos ficam em cache por 30 dias — distância entre dois pontos não muda. */
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: 'Requisição inválida.' }, { status: 400 });
  }

  try {
    await loadTripAccess(body.tripId);
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  const supabase = await createClient();
  const simpleLeg = body.intermediates.length === 0;
  const cacheKey = simpleLeg
    ? legCacheKey(body.origin as RoutePoint, body.destination as RoutePoint, body.travelMode)
    : null;

  // 1) Cache: evita pagar de novo pela mesma rota a cada renderização.
  if (cacheKey && !body.refresh) {
    const { data: cached } = await supabase
      .from('route_legs_cache')
      .select('*')
      .eq('trip_id', body.tripId)
      .eq('cache_key', cacheKey)
      .maybeSingle();

    if (cached && Date.now() - new Date(cached.computed_at).getTime() < CACHE_TTL_MS) {
      return NextResponse.json({
        route: {
          distanceMeters: cached.distance_meters ?? 0,
          durationSeconds: cached.duration_seconds ?? 0,
          durationInTrafficSeconds: null,
          encodedPolyline: cached.encoded_polyline,
          legs: [],
          optimizedIntermediateWaypointIndex: null,
          tolls: null,
        },
        cached: true,
      });
    }
  }

  // 2) Consulta o Google.
  try {
    const route = await computeRoute(
      body.origin as RoutePoint,
      body.destination as RoutePoint,
      body.intermediates as RoutePoint[],
      { travelMode: body.travelMode, optimize: body.optimize },
    );

    if (cacheKey) {
      await supabase.from('route_legs_cache').upsert(
        {
          trip_id: body.tripId,
          cache_key: cacheKey,
          travel_mode: body.travelMode,
          distance_meters: route.distanceMeters,
          duration_seconds: route.durationSeconds,
          encoded_polyline: route.encodedPolyline,
          computed_at: new Date().toISOString(),
        },
        { onConflict: 'trip_id,cache_key' },
      );
    }

    return NextResponse.json({ route, cached: false });
  } catch (error) {
    if (error instanceof GoogleNotConfiguredError) {
      return NextResponse.json({ error: error.message, notConfigured: true }, { status: 503 });
    }
    console.error('[api/routes/compute]', error);
    return NextResponse.json(
      { error: 'Não foi possível atualizar a rota neste momento.' },
      { status: 502 },
    );
  }
}
