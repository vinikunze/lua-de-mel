/**
 * Linha do tempo unificada da viagem.
 *
 * Voos, hospedagens, carro e eventos do roteiro viram um único tipo de evento,
 * ordenado por instante. É isso que alimenta a agenda, o "próximo compromisso",
 * o calendário, o mapa por dia e o PDF — sempre a partir dos mesmos dados.
 */
import type {
  AccommodationRow, CarRentalRow, ItineraryItemRow, PlaceRow,
} from '@/types/database';
import type { FlightWithPassengers } from '@/server/queries/trips';
import { dateInZone, type DateOnly } from '@/lib/format/date';

export type EventSource = 'flight' | 'accommodation' | 'car' | 'itinerary';

export interface TripEvent {
  id: string;
  source: EventSource;
  /** Id do registro de origem (voo, hospedagem…), para montar links. */
  sourceId: string;
  category: string;
  title: string;
  subtitle: string | null;
  dayDate: DateOnly | null;
  startsAt: string | null;
  endsAt: string | null;
  timezone: string;
  /** Evento sem horário: aparece na lista "a qualquer momento do dia". */
  allDay: boolean;
  address: string | null;
  placeId: string | null;
  latitude: number | null;
  longitude: number | null;
  googlePlaceId: string | null;
  reservationCode: string | null;
  phone: string | null;
  url: string | null;
  cost: number | null;
  currency: string;
  status: string;
  notes: string | null;
  position: number;
  /** Rota interna para abrir o detalhe. */
  href: string | null;
}

function placeOf(places: PlaceRow[], id: string | null): PlaceRow | null {
  if (!id) return null;
  return places.find((p) => p.id === id) ?? null;
}

export interface BuildEventsInput {
  tripId: string;
  flights: FlightWithPassengers[];
  accommodations: AccommodationRow[];
  carRentals: CarRentalRow[];
  itinerary: ItineraryItemRow[];
  places: PlaceRow[];
}

export function buildTripEvents(input: BuildEventsInput): TripEvent[] {
  const { tripId, flights, accommodations, carRentals, itinerary, places } = input;
  const base = `/viagens/${tripId}`;
  const events: TripEvent[] = [];

  for (const flight of flights) {
    const origin = placeOf(places, flight.origin_place_id);
    const route = [flight.origin_iata ?? flight.origin_airport, flight.destination_iata ?? flight.destination_airport]
      .filter(Boolean)
      .join(' → ');
    events.push({
      id: `flight-${flight.id}`,
      source: 'flight',
      sourceId: flight.id,
      category: 'flight',
      title: `Voo ${route}`,
      subtitle: [flight.airline, flight.flight_number].filter(Boolean).join(' ') || null,
      dayDate: dateInZone(flight.departure_at, flight.origin_timezone),
      startsAt: flight.departure_at,
      endsAt: flight.arrival_at,
      timezone: flight.origin_timezone,
      allDay: false,
      address: origin?.formatted_address ?? flight.origin_airport,
      placeId: flight.origin_place_id,
      latitude: origin?.latitude ?? null,
      longitude: origin?.longitude ?? null,
      googlePlaceId: origin?.google_place_id ?? null,
      reservationCode: flight.booking_reference,
      phone: null,
      url: flight.booking_url ?? flight.airline_url,
      cost: flight.total_price,
      currency: flight.currency,
      status: flight.payment_status === 'paid' ? 'confirmed' : 'planned',
      notes: flight.notes,
      position: -100,
      href: `${base}/voos#voo-${flight.id}`,
    });
  }

  for (const stay of accommodations) {
    const place = placeOf(places, stay.place_id);
    const common = {
      source: 'accommodation' as const,
      sourceId: stay.id,
      category: 'accommodation',
      subtitle: stay.address ?? place?.formatted_address ?? null,
      timezone: stay.timezone,
      allDay: false,
      address: stay.address ?? place?.formatted_address ?? null,
      placeId: stay.place_id,
      latitude: stay.latitude ?? place?.latitude ?? null,
      longitude: stay.longitude ?? place?.longitude ?? null,
      googlePlaceId: stay.google_place_id ?? place?.google_place_id ?? null,
      reservationCode: stay.booking_reference,
      phone: stay.phone,
      url: stay.booking_url ?? stay.website,
      currency: stay.currency,
      status: stay.payment_status === 'paid' ? 'confirmed' : 'planned',
      notes: stay.notes,
      href: `/viagens/${tripId}/hospedagens#hospedagem-${stay.id}`,
    };

    events.push({
      ...common,
      id: `stay-in-${stay.id}`,
      title: `Check-in — ${stay.name}`,
      dayDate: dateInZone(stay.check_in_at, stay.timezone),
      startsAt: stay.check_in_at,
      endsAt: null,
      cost: stay.total_price,
      position: -90,
    });

    events.push({
      ...common,
      id: `stay-out-${stay.id}`,
      title: `Check-out — ${stay.name}`,
      dayDate: dateInZone(stay.check_out_at, stay.timezone),
      startsAt: stay.check_out_at,
      endsAt: null,
      cost: null,
      position: -95,
    });
  }

  for (const car of carRentals) {
    const pickup = placeOf(places, car.pickup_place_id);
    const dropoff = placeOf(places, car.dropoff_place_id);
    const common = {
      source: 'car' as const,
      sourceId: car.id,
      category: 'car',
      timezone: car.pickup_timezone,
      allDay: false,
      reservationCode: car.booking_reference,
      phone: car.company_phone,
      url: car.booking_url,
      currency: car.currency,
      status: car.payment_status === 'paid' ? 'confirmed' : 'planned',
      notes: car.notes,
      href: `/viagens/${tripId}/carros#carro-${car.id}`,
    };

    events.push({
      ...common,
      id: `car-pickup-${car.id}`,
      title: `Retirada do carro — ${car.company}`,
      subtitle: car.vehicle_model ?? car.category,
      dayDate: dateInZone(car.pickup_at, car.pickup_timezone),
      startsAt: car.pickup_at,
      endsAt: null,
      address: car.pickup_address ?? car.pickup_location ?? pickup?.formatted_address ?? null,
      placeId: car.pickup_place_id,
      latitude: pickup?.latitude ?? null,
      longitude: pickup?.longitude ?? null,
      googlePlaceId: pickup?.google_place_id ?? null,
      cost: car.total_price,
      position: -85,
    });

    events.push({
      ...common,
      id: `car-dropoff-${car.id}`,
      title: `Devolução do carro — ${car.company}`,
      subtitle: null,
      timezone: car.dropoff_timezone,
      dayDate: dateInZone(car.dropoff_at, car.dropoff_timezone),
      startsAt: car.dropoff_at,
      endsAt: null,
      address: car.dropoff_address ?? car.dropoff_location ?? dropoff?.formatted_address ?? null,
      placeId: car.dropoff_place_id,
      latitude: dropoff?.latitude ?? null,
      longitude: dropoff?.longitude ?? null,
      googlePlaceId: dropoff?.google_place_id ?? null,
      cost: null,
      position: -80,
    });
  }

  for (const item of itinerary) {
    const place = placeOf(places, item.place_id);
    events.push({
      id: `item-${item.id}`,
      source: 'itinerary',
      sourceId: item.id,
      category: item.category,
      title: item.title,
      subtitle: place?.name && place.name !== item.title ? place.name : null,
      dayDate: item.day_date ?? (item.starts_at ? dateInZone(item.starts_at, item.timezone) : null),
      startsAt: item.starts_at,
      endsAt: item.ends_at,
      timezone: item.timezone,
      allDay: !item.starts_at,
      address: item.address ?? place?.formatted_address ?? null,
      placeId: item.place_id,
      latitude: place?.latitude ?? null,
      longitude: place?.longitude ?? null,
      googlePlaceId: place?.google_place_id ?? null,
      reservationCode: item.reservation_code,
      phone: item.phone ?? place?.phone ?? null,
      url: item.url ?? place?.website ?? null,
      cost: item.cost,
      currency: item.currency,
      status: item.status,
      notes: item.notes ?? item.description,
      position: item.position,
      href: `/viagens/${tripId}/roteiro#evento-${item.id}`,
    });
  }

  return sortEvents(events);
}

export function sortEvents(events: TripEvent[]): TripEvent[] {
  return [...events].sort((a, b) => {
    const dayA = a.dayDate ?? '9999-12-31';
    const dayB = b.dayDate ?? '9999-12-31';
    if (dayA !== dayB) return dayA < dayB ? -1 : 1;
    // Sem horário vai para o fim do dia
    if (a.startsAt && b.startsAt) {
      if (a.startsAt !== b.startsAt) return a.startsAt < b.startsAt ? -1 : 1;
      return a.position - b.position;
    }
    if (a.startsAt) return -1;
    if (b.startsAt) return 1;
    return a.position - b.position;
  });
}

export function eventsOfDay(events: TripEvent[], day: DateOnly): TripEvent[] {
  return events.filter((e) => e.dayDate === day);
}

export function unscheduledEvents(events: TripEvent[]): TripEvent[] {
  return events.filter((e) => !e.dayDate);
}

/** Próximo compromisso a partir de agora (ou de um instante informado). */
export function nextEvent(events: TripEvent[], now: Date = new Date()): TripEvent | null {
  const iso = now.toISOString();
  return events.find((e) => e.startsAt && e.startsAt >= iso) ?? null;
}

/** Evento acontecendo neste momento. */
export function currentEvent(events: TripEvent[], now: Date = new Date()): TripEvent | null {
  const iso = now.toISOString();
  return (
    events.find((e) => e.startsAt && e.endsAt && e.startsAt <= iso && e.endsAt >= iso) ?? null
  );
}

/** Eventos com coordenadas — os únicos que podem ir para o mapa. */
export function mappableEvents(events: TripEvent[]): TripEvent[] {
  return events.filter((e) => e.latitude != null && e.longitude != null);
}
