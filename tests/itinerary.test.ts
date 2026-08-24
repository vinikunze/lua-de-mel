import { describe, expect, it } from 'vitest';
import {
  buildTripEvents, currentEvent, eventsOfDay, mappableEvents, nextEvent, sortEvents,
  unscheduledEvents, type TripEvent,
} from '@/lib/domain/timeline';
import { detectItineraryWarnings, detectOutOfRange } from '@/lib/domain/conflicts';
import { zonedToUtc } from '@/lib/format/date';
import type { AccommodationRow, CarRentalRow, ItineraryItemRow, PlaceRow } from '@/types/database';
import type { FlightWithPassengers } from '@/server/queries/trips';

const TRIP_ID = '00000000-0000-0000-0000-000000000001';
const TZ = 'America/Sao_Paulo';

const lagoNegro: PlaceRow = {
  id: 'place-lago',
  trip_id: TRIP_ID,
  name: 'Lago Negro',
  category: 'attraction',
  formatted_address: 'R. A. J. Renner, Gramado',
  google_place_id: 'PLACE_LAGO',
  latitude: -29.3921,
  longitude: -50.8794,
  city: 'Gramado',
  country: 'Brasil',
  phone: null,
  website: null,
  google_maps_url: null,
  notes: null,
  is_favorite: false,
  created_by: null,
  created_at: '2027-01-01T00:00:00Z',
  updated_at: '2027-01-01T00:00:00Z',
};

function item(partial: Partial<ItineraryItemRow>): ItineraryItemRow {
  return {
    id: partial.id ?? crypto.randomUUID(),
    trip_id: TRIP_ID,
    place_id: partial.place_id ?? null,
    day_date: partial.day_date ?? null,
    starts_at: partial.starts_at ?? null,
    ends_at: partial.ends_at ?? null,
    timezone: partial.timezone ?? TZ,
    title: partial.title ?? 'Evento',
    category: partial.category ?? 'attraction',
    description: null,
    address: partial.address ?? null,
    cost: null,
    currency: 'BRL',
    reservation_code: null,
    url: null,
    phone: null,
    status: partial.status ?? 'planned',
    position: partial.position ?? 0,
    notes: null,
    flight_id: null,
    accommodation_id: null,
    car_rental_id: null,
    created_by: null,
    created_at: '2027-01-01T00:00:00Z',
    updated_at: '2027-01-01T00:00:00Z',
  };
}

function flight(partial: Partial<FlightWithPassengers>): FlightWithPassengers {
  return {
    id: partial.id ?? crypto.randomUUID(),
    trip_id: TRIP_ID,
    group_label: partial.group_label ?? 'Ida',
    position: 0,
    airline: partial.airline ?? 'LATAM',
    airline_iata: null,
    flight_number: partial.flight_number ?? 'LA3542',
    booking_reference: partial.booking_reference ?? 'ABC123',
    origin_airport: 'Cuiabá',
    origin_iata: partial.origin_iata ?? 'CGB',
    origin_terminal: null,
    origin_timezone: partial.origin_timezone ?? 'America/Cuiaba',
    destination_airport: 'Porto Alegre',
    destination_iata: partial.destination_iata ?? 'POA',
    destination_terminal: null,
    destination_timezone: partial.destination_timezone ?? TZ,
    gate: null,
    boarding_at: null,
    departure_at: partial.departure_at ?? zonedToUtc('2027-08-04', '06:40', 'America/Cuiaba').toISOString(),
    arrival_at: partial.arrival_at ?? zonedToUtc('2027-08-04', '09:20', TZ).toISOString(),
    cabin_class: null,
    seats: null,
    carry_on_baggage: null,
    checked_baggage: null,
    price_per_passenger: null,
    taxes: null,
    total_price: null,
    currency: 'BRL',
    payment_method: null,
    payment_status: 'unpaid',
    airline_url: null,
    booking_url: null,
    origin_place_id: null,
    destination_place_id: null,
    notes: null,
    created_at: '2027-01-01T00:00:00Z',
    updated_at: '2027-01-01T00:00:00Z',
    passengers: [],
  };
}

function stay(partial: Partial<AccommodationRow>): AccommodationRow {
  return {
    id: partial.id ?? crypto.randomUUID(),
    trip_id: TRIP_ID,
    place_id: null,
    name: partial.name ?? 'Hotel Casa da Montanha',
    kind: 'hotel',
    address: 'Av. Borges de Medeiros, Gramado',
    google_place_id: null,
    latitude: -29.3788,
    longitude: -50.8761,
    phone: null,
    website: null,
    booking_url: null,
    platform: null,
    booking_reference: 'HTL-9',
    check_in_at: partial.check_in_at ?? zonedToUtc('2027-08-04', '14:00', TZ).toISOString(),
    check_out_at: partial.check_out_at ?? zonedToUtc('2027-08-14', '11:00', TZ).toISOString(),
    timezone: TZ,
    check_in_window: null,
    check_out_window: null,
    guests: 2,
    room_type: null,
    breakfast_included: true,
    parking_included: false,
    nightly_rate: null,
    taxes: null,
    total_price: null,
    paid_amount: 0,
    currency: 'BRL',
    payment_method: null,
    payment_status: 'unpaid',
    cancellation_policy: null,
    host_name: null,
    host_contact: null,
    wifi_password: null,
    access_instructions: null,
    house_rules: null,
    notes: null,
    created_at: '2027-01-01T00:00:00Z',
    updated_at: '2027-01-01T00:00:00Z',
  };
}

function build(overrides: {
  flights?: FlightWithPassengers[];
  accommodations?: AccommodationRow[];
  carRentals?: CarRentalRow[];
  itinerary?: ItineraryItemRow[];
  places?: PlaceRow[];
}) {
  return buildTripEvents({
    tripId: TRIP_ID,
    flights: overrides.flights ?? [],
    accommodations: overrides.accommodations ?? [],
    carRentals: overrides.carRentals ?? [],
    itinerary: overrides.itinerary ?? [],
    places: overrides.places ?? [],
  });
}

describe('linha do tempo unificada', () => {
  it('coloca o voo no dia do fuso de origem', () => {
    const eventos = build({ flights: [flight({})] });
    expect(eventos).toHaveLength(1);
    expect(eventos[0].dayDate).toBe('2027-08-04');
    expect(eventos[0].category).toBe('flight');
    expect(eventos[0].title).toBe('Voo CGB → POA');
    expect(eventos[0].reservationCode).toBe('ABC123');
  });

  it('gera dois eventos por hospedagem: check-in e check-out', () => {
    const eventos = build({ accommodations: [stay({})] });
    expect(eventos).toHaveLength(2);
    expect(eventos[0].dayDate).toBe('2027-08-04');
    expect(eventos[0].title).toContain('Check-in');
    expect(eventos[1].dayDate).toBe('2027-08-14');
    expect(eventos[1].title).toContain('Check-out');
  });

  it('herda a localização do local vinculado ao evento', () => {
    const eventos = build({
      places: [lagoNegro],
      itinerary: [item({ place_id: lagoNegro.id, day_date: '2027-08-07', title: 'Lago Negro' })],
    });
    expect(eventos[0].latitude).toBe(lagoNegro.latitude);
    expect(eventos[0].googlePlaceId).toBe('PLACE_LAGO');
    expect(eventos[0].address).toBe(lagoNegro.formatted_address);
  });

  it('marca como "sem horário" o evento que não tem hora definida', () => {
    const eventos = build({
      itinerary: [item({ day_date: '2027-08-07', title: 'Comprar chocolate' })],
    });
    expect(eventos[0].allDay).toBe(true);
  });
});

describe('ordenação da agenda', () => {
  const manha = item({
    id: 'a',
    title: 'Café',
    day_date: '2027-08-07',
    starts_at: zonedToUtc('2027-08-07', '08:00', TZ).toISOString(),
  });
  const tarde = item({
    id: 'b',
    title: 'Snowland',
    day_date: '2027-08-07',
    starts_at: zonedToUtc('2027-08-07', '15:00', TZ).toISOString(),
  });
  const semHora = item({ id: 'c', title: 'Comprar lembrança', day_date: '2027-08-07', position: 5 });

  it('ordena por horário e joga os sem horário para o fim do dia', () => {
    const eventos = sortEvents(build({ itinerary: [semHora, tarde, manha] }));
    expect(eventos.map((e) => e.title)).toEqual(['Café', 'Snowland', 'Comprar lembrança']);
  });

  it('separa os eventos por dia', () => {
    const eventos = build({
      itinerary: [manha, item({ title: 'Outro dia', day_date: '2027-08-08' })],
    });
    expect(eventsOfDay(eventos, '2027-08-07').map((e) => e.title)).toEqual(['Café']);
  });

  it('separa os eventos ainda sem data', () => {
    const eventos = build({ itinerary: [manha, item({ title: 'Sem data' })] });
    expect(unscheduledEvents(eventos).map((e) => e.title)).toEqual(['Sem data']);
  });

  it('encontra o próximo compromisso e o evento em curso', () => {
    const eventos = build({
      itinerary: [
        manha,
        item({
          id: 'd',
          title: 'Almoço',
          day_date: '2027-08-07',
          starts_at: zonedToUtc('2027-08-07', '12:00', TZ).toISOString(),
          ends_at: zonedToUtc('2027-08-07', '13:30', TZ).toISOString(),
        }),
        tarde,
      ],
    });

    const agora = new Date(zonedToUtc('2027-08-07', '12:30', TZ));
    expect(currentEvent(eventos, agora)?.title).toBe('Almoço');
    expect(nextEvent(eventos, agora)?.title).toBe('Snowland');
  });

  it('filtra apenas os eventos que podem ir para o mapa', () => {
    const eventos = build({
      places: [lagoNegro],
      itinerary: [
        item({ place_id: lagoNegro.id, day_date: '2027-08-07', title: 'Lago Negro' }),
        item({ day_date: '2027-08-07', title: 'Descansar' }),
      ],
    });
    expect(mappableEvents(eventos).map((e) => e.title)).toEqual(['Lago Negro']);
  });
});

describe('avisos de roteiro impossível', () => {
  function timedEvent(id: string, title: string, start: string, end?: string): TripEvent {
    return {
      id,
      source: 'itinerary',
      sourceId: id,
      category: 'attraction',
      title,
      subtitle: null,
      dayDate: '2027-08-07',
      startsAt: zonedToUtc('2027-08-07', start, TZ).toISOString(),
      endsAt: end ? zonedToUtc('2027-08-07', end, TZ).toISOString() : null,
      timezone: TZ,
      allDay: false,
      address: null,
      placeId: null,
      latitude: -29.4,
      longitude: -50.9,
      googlePlaceId: null,
      reservationCode: null,
      phone: null,
      url: null,
      cost: null,
      currency: 'BRL',
      status: 'planned',
      notes: null,
      position: 0,
      href: null,
    };
  }

  it('avisa quando o deslocamento não cabe no intervalo', () => {
    const eventos = [
      timedEvent('a', 'Lago Negro', '13:00', '14:00'),
      timedEvent('b', 'Restaurante', '14:05'),
    ];
    const avisos = detectItineraryWarnings(eventos, [
      { fromEventId: 'a', toEventId: 'b', distanceMeters: 12700, durationSeconds: 1500, travelMode: 'DRIVE' },
    ]);

    expect(avisos).toHaveLength(1);
    expect(avisos[0].kind).toBe('tight_transfer');
    expect(avisos[0].message).toContain('25 min');
    expect(avisos[0].message).toContain('pode não ser suficiente');
  });

  it('não avisa quando há folga suficiente', () => {
    const eventos = [
      timedEvent('a', 'Lago Negro', '09:00', '11:00'),
      timedEvent('b', 'Restaurante', '12:30'),
    ];
    const avisos = detectItineraryWarnings(eventos, [
      { fromEventId: 'a', toEventId: 'b', distanceMeters: 6200, durationSeconds: 840, travelMode: 'DRIVE' },
    ]);
    expect(avisos).toHaveLength(0);
  });

  it('avisa sobre eventos sobrepostos mesmo sem cálculo de rota', () => {
    const eventos = [
      timedEvent('a', 'Passeio', '10:00', '12:00'),
      timedEvent('b', 'Almoço', '11:30'),
    ];
    const avisos = detectItineraryWarnings(eventos, []);
    expect(avisos[0].kind).toBe('overlap');
    expect(avisos[0].eventId).toBe('b');
  });

  it('não inventa aviso quando o deslocamento nunca foi calculado', () => {
    const eventos = [timedEvent('a', 'A', '13:00', '14:00'), timedEvent('b', 'B', '14:05')];
    expect(detectItineraryWarnings(eventos, [])).toHaveLength(0);
  });

  it('sinaliza eventos fora do período da viagem', () => {
    const eventos = [timedEvent('a', 'Fora', '10:00')];
    const avisos = detectOutOfRange(eventos, '2027-08-10', '2027-08-14');
    expect(avisos).toHaveLength(1);
    expect(avisos[0].kind).toBe('out_of_range');
  });
});
