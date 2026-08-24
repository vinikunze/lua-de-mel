import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { TripSearch, buildHaystack, type SearchEntry } from '@/components/trip/trip-search';
import { PageHeader } from '@/components/ui/section';
import { formatShortWeekday } from '@/lib/format/date';
import { EXPENSE_CATEGORY_LABEL } from '@/lib/validators/expense';
import { DOCUMENT_CATEGORY_LABEL } from '@/lib/validators/misc';

export const metadata: Metadata = { title: 'Buscar' };
export const dynamic = 'force-dynamic';

/**
 * A busca roda no cliente sobre um índice montado no servidor.
 * A viagem inteira cabe com folga em memória e a resposta fica instantânea,
 * inclusive com a internet ruim — o que importa quando se está viajando.
 */
export default async function SearchPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip } = await loadTripAccess(tripId);
  const bundle = await loadTripBundle(tripId, trip);
  const base = `/viagens/${tripId}`;

  const entries: SearchEntry[] = [
    ...bundle.flights.map((flight) => ({
      id: `flight-${flight.id}`,
      title: `${flight.origin_iata ?? flight.origin_airport ?? ''} → ${flight.destination_iata ?? flight.destination_airport ?? ''}`,
      subtitle: [flight.airline, flight.flight_number].filter(Boolean).join(' ') || null,
      detail: flight.booking_reference,
      category: 'flight',
      section: 'Voos',
      href: `${base}/voos#voo-${flight.id}`,
      haystack: buildHaystack(
        flight.airline, flight.flight_number, flight.booking_reference,
        flight.origin_airport, flight.origin_iata, flight.destination_airport,
        flight.destination_iata, flight.seats, flight.notes,
        ...(flight.passengers ?? []).map((p) => p.full_name),
      ),
    })),

    ...bundle.accommodations.map((stay) => ({
      id: `stay-${stay.id}`,
      title: stay.name,
      subtitle: stay.address,
      detail: stay.booking_reference,
      category: 'accommodation',
      section: 'Hospedagens',
      href: `${base}/hospedagens#hospedagem-${stay.id}`,
      haystack: buildHaystack(
        stay.name, stay.address, stay.booking_reference, stay.platform,
        stay.phone, stay.room_type, stay.host_name, stay.notes,
      ),
    })),

    ...bundle.carRentals.map((car) => ({
      id: `car-${car.id}`,
      title: car.company,
      subtitle: [car.vehicle_model, car.pickup_location].filter(Boolean).join(' · ') || null,
      detail: car.booking_reference,
      category: 'car',
      section: 'Aluguel de carro',
      href: `${base}/carros#carro-${car.id}`,
      haystack: buildHaystack(
        car.company, car.vehicle_model, car.category, car.booking_reference,
        car.pickup_location, car.pickup_address, car.dropoff_location, car.main_driver, car.notes,
      ),
    })),

    ...bundle.itinerary.map((item) => ({
      id: `item-${item.id}`,
      title: item.title,
      subtitle: item.address,
      detail: item.day_date ? formatShortWeekday(item.day_date) : null,
      category: item.category,
      section: 'Roteiro',
      href: `${base}/roteiro#evento-${item.id}`,
      haystack: buildHaystack(
        item.title, item.address, item.description, item.notes, item.reservation_code, item.phone,
      ),
    })),

    ...bundle.places.map((place) => ({
      id: `place-${place.id}`,
      title: place.name,
      subtitle: place.formatted_address,
      detail: place.is_favorite ? 'Favorito' : null,
      category: place.category,
      section: 'Locais',
      href: `${base}/locais`,
      haystack: buildHaystack(
        place.name, place.formatted_address, place.city, place.notes, place.phone,
      ),
    })),

    ...bundle.expenses.map((expense) => ({
      id: `expense-${expense.id}`,
      title: expense.description,
      subtitle: EXPENSE_CATEGORY_LABEL[expense.category],
      detail: null,
      category: 'payment',
      section: 'Despesas',
      href: `${base}/financeiro`,
      haystack: buildHaystack(
        expense.description, EXPENSE_CATEGORY_LABEL[expense.category], expense.payment_method, expense.notes,
      ),
    })),

    ...bundle.documents.map((document) => ({
      id: `doc-${document.id}`,
      title: document.name,
      subtitle: DOCUMENT_CATEGORY_LABEL[document.category],
      detail: null,
      category: 'other',
      section: 'Documentos',
      href: `${base}/documentos`,
      haystack: buildHaystack(document.name, DOCUMENT_CATEGORY_LABEL[document.category]),
    })),

    ...bundle.contacts.map((contact) => ({
      id: `contact-${contact.id}`,
      title: contact.label,
      subtitle: contact.phone ?? contact.email,
      detail: contact.reference_code,
      category: 'other',
      section: 'Contatos',
      href: `${base}/informacoes`,
      haystack: buildHaystack(
        contact.label, contact.phone, contact.email, contact.address, contact.reference_code, contact.notes,
      ),
    })),

    ...bundle.quickLinks.map((link) => ({
      id: `link-${link.id}`,
      title: link.label,
      subtitle: link.url,
      detail: null,
      category: 'other',
      section: 'Links',
      href: `${base}/links`,
      haystack: buildHaystack(link.label, link.url),
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Buscar na viagem"
        description="Ache um localizador, um restaurante, um voucher ou um endereço em segundos."
      />
      <TripSearch entries={entries} />
    </div>
  );
}
