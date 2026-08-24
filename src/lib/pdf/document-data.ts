import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type { TripBundle } from '@/server/queries/trips';
import { buildTripEvents, eventsOfDay, type TripEvent } from '@/lib/domain/timeline';
import { legCacheKey } from '@/lib/google/routes';
import { buildRouteUrlFromStops, buildPlaceUrl } from '@/lib/google/maps-url';
import { internalStaticMapUrl, markerLabelFor } from '@/lib/google/static-map';
import { eachDayInRange, type DateOnly } from '@/lib/format/date';
import { qrCodeBatch } from '@/lib/pdf/qrcode';
import { summarizeExpenses, totalsByCategory } from '@/lib/domain/finance';
import { googleCapabilities } from '@/lib/google/config';
import type { PdfOptions } from '@/lib/pdf/options';

export interface PdfLeg {
  distanceMeters: number;
  durationSeconds: number;
}

export interface PdfDay {
  date: DateOnly;
  index: number;
  events: TripEvent[];
  /** Deslocamentos entre eventos consecutivos, quando já calculados antes. */
  legs: Array<PdfLeg | null>;
  mapUrl: string | null;
  routeUrl: string | null;
  stops: Array<{ label: string; title: string; address: string | null }>;
}

export interface PdfData {
  bundle: TripBundle;
  days: PdfDay[];
  unscheduled: TripEvent[];
  finance: ReturnType<typeof summarizeExpenses>;
  byCategory: ReturnType<typeof totalsByCategory>;
  qrCodes: Record<string, string>;
  generatedAt: string;
  mapsAvailable: boolean;
}

/**
 * Monta tudo o que o PDF precisa.
 *
 * Importante: aqui NÃO chamamos o Google Routes. Usamos apenas o que já está em
 * cache no banco — gerar o PDF não pode virar uma fonte de custo inesperado.
 * Trechos ainda não calculados simplesmente não mostram distância.
 */
export async function buildPdfData(bundle: TripBundle, options: PdfOptions): Promise<PdfData> {
  const trip = bundle.trip;
  const caps = googleCapabilities();

  const events = buildTripEvents({
    tripId: trip.id,
    flights: bundle.flights,
    accommodations: bundle.accommodations,
    carRentals: bundle.carRentals,
    itinerary: bundle.itinerary,
    places: bundle.places,
  });

  const supabase = await createClient();
  const { data: cachedLegs } = await supabase
    .from('route_legs_cache')
    .select('cache_key, distance_meters, duration_seconds')
    .eq('trip_id', trip.id);

  const legIndex = new Map(
    (cachedLegs ?? []).map((leg) => [
      leg.cache_key,
      { distanceMeters: leg.distance_meters ?? 0, durationSeconds: leg.duration_seconds ?? 0 },
    ]),
  );

  const savedRouteByDay = new Map(
    bundle.routes.filter((route) => route.day_date).map((route) => [route.day_date as string, route]),
  );

  const dayList = eachDayInRange(trip.start_date, trip.end_date);
  const qrTargets: Array<{ key: string; value: string | null | undefined }> = [];

  const days: PdfDay[] = dayList.map((date, index) => {
    const dayEvents = eventsOfDay(events, date);
    const mappable = dayEvents.filter((e) => e.latitude != null && e.longitude != null);

    const legs: Array<PdfLeg | null> = dayEvents.map((event, i) => {
      const next = dayEvents[i + 1];
      if (!next || event.latitude == null || next.latitude == null) return null;
      const key = legCacheKey(
        { placeId: event.googlePlaceId, latitude: event.latitude, longitude: event.longitude, address: event.address },
        { placeId: next.googlePlaceId, latitude: next.latitude, longitude: next.longitude, address: next.address },
        'DRIVE',
      );
      return legIndex.get(key) ?? null;
    });

    const savedRoute = savedRouteByDay.get(date);
    const stops = mappable.map((event, i) => ({
      label: markerLabelFor(i),
      title: event.title,
      address: event.address,
    }));

    const mapUrl =
      options.maps && caps.staticMaps && mappable.length > 0
        ? internalStaticMapUrl({
            width: 620,
            height: 300,
            markers: mappable.map((event, i) => ({
              lat: event.latitude as number,
              lng: event.longitude as number,
              label: markerLabelFor(i),
            })),
            polyline: savedRoute?.encoded_polyline ?? null,
          })
        : null;

    const routeUrl =
      mappable.length >= 2
        ? buildRouteUrlFromStops(
            mappable.map((event) => ({
              latitude: event.latitude,
              longitude: event.longitude,
              address: event.address,
              name: event.title,
              googlePlaceId: event.googlePlaceId,
            })),
          )
        : mappable.length === 1
          ? buildPlaceUrl({
              latitude: mappable[0].latitude,
              longitude: mappable[0].longitude,
              address: mappable[0].address,
              name: mappable[0].title,
              googlePlaceId: mappable[0].googlePlaceId,
            })
          : null;

    if (options.qrCodes && routeUrl) qrTargets.push({ key: `dia-${date}`, value: routeUrl });

    return { date, index: index + 1, events: dayEvents, legs, mapUrl, routeUrl, stops };
  });

  // QR Codes de reservas: um por hospedagem e por link de voo.
  if (options.qrCodes) {
    for (const stay of bundle.accommodations) {
      const url =
        stay.booking_url ??
        buildPlaceUrl({
          latitude: stay.latitude,
          longitude: stay.longitude,
          address: stay.address,
          name: stay.name,
          googlePlaceId: stay.google_place_id,
        });
      qrTargets.push({ key: `hospedagem-${stay.id}`, value: url });
    }
    for (const flight of bundle.flights) {
      qrTargets.push({ key: `voo-${flight.id}`, value: flight.booking_url ?? flight.airline_url });
    }
  }

  const qrCodes = options.qrCodes ? await qrCodeBatch(qrTargets, 88) : {};

  return {
    bundle,
    days,
    unscheduled: events.filter((e) => !e.dayDate),
    finance: summarizeExpenses(bundle.expenses, trip.estimated_budget),
    byCategory: totalsByCategory(bundle.expenses),
    qrCodes,
    generatedAt: new Date().toISOString(),
    mapsAvailable: caps.staticMaps,
  };
}
