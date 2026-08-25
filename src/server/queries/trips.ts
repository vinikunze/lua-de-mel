import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  AccommodationRow, CarRentalRow, ChecklistItemRow, ChecklistRow, DestinationRow,
  DocumentRow, ExpenseRow, ExpenseSplitRow, FlightPassengerRow, FlightRow,
  ImportantContactRow, ItineraryItemRow, MemberRole, PlaceRow, QuickLinkRow,
  RouteRow, RouteWaypointRow, TripMemberRow, TripRow,
} from '@/types/database';
import { tripPhase, todayInZone } from '@/lib/format/date';

export interface TripListItem extends TripRow {
  memberCount: number;
  role: MemberRole;
  phase: 'upcoming' | 'ongoing' | 'past';
}

/** Todas as viagens que o usuário participa, mais recentes primeiro. */
export async function listTrips(): Promise<TripListItem[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members(id, user_id, role, invite_status)')
    .order('start_date', { ascending: false });

  if (error) throw error;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const today = todayInZone();

  return (data ?? []).map((row) => {
    const members = (row.trip_members ?? []) as Array<Pick<TripMemberRow, 'id' | 'user_id' | 'role' | 'invite_status'>>;
    const mine = members.find((m) => m.user_id === user?.id);
    const { trip_members: _ignored, ...trip } = row as TripRow & { trip_members?: unknown };
    return {
      ...(trip as TripRow),
      memberCount: members.filter((m) => m.invite_status === 'accepted').length,
      role: mine?.role ?? (trip.owner_id === user?.id ? 'owner' : 'viewer'),
      phase: tripPhase(trip.start_date, trip.end_date, today),
    };
  });
}

export interface TripMemberWithProfile extends TripMemberRow {
  profile: { full_name: string | null; email: string | null; avatar_url: string | null } | null;
}

export async function listTripMembers(tripId: string): Promise<TripMemberWithProfile[]> {
  const supabase = await createClient();
  // `trip_members` referencia `profiles` duas vezes — por `user_id` e por
  // `invited_by`. Sem dizer qual chave usar, o PostgREST não escolhe: responde
  // 300 (PGRST201) e a viagem inteira deixava de abrir, porque esta consulta
  // roda no layout. O nome da constraint resolve a ambiguidade.
  const { data, error } = await supabase
    .from('trip_members')
    .select('*, profile:profiles!trip_members_user_id_fkey(full_name, email, avatar_url)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TripMemberWithProfile[];
}

export type FlightWithPassengers = FlightRow & { passengers: FlightPassengerRow[] };
export type ExpenseWithSplits = ExpenseRow & { splits: ExpenseSplitRow[] };
export type ChecklistWithItems = ChecklistRow & { items: ChecklistItemRow[] };
export type RouteWithWaypoints = RouteRow & { waypoints: RouteWaypointRow[] };

/**
 * Carrega tudo o que uma viagem contém.
 * Usado na home da viagem, no PDF e no cache offline — uma única fonte,
 * para não haver divergência entre a tela e o documento impresso.
 */
export interface TripBundle {
  trip: TripRow;
  members: TripMemberWithProfile[];
  destinations: DestinationRow[];
  places: PlaceRow[];
  flights: FlightWithPassengers[];
  accommodations: AccommodationRow[];
  carRentals: CarRentalRow[];
  itinerary: ItineraryItemRow[];
  expenses: ExpenseWithSplits[];
  documents: DocumentRow[];
  checklists: ChecklistWithItems[];
  contacts: ImportantContactRow[];
  quickLinks: QuickLinkRow[];
  routes: RouteWithWaypoints[];
}

export async function loadTripBundle(tripId: string, trip: TripRow): Promise<TripBundle> {
  const supabase = await createClient();

  const [
    members, destinations, places, flights, accommodations, carRentals,
    itinerary, expenses, documents, checklists, contacts, quickLinks, routes,
  ] = await Promise.all([
    listTripMembers(tripId),
    supabase.from('destinations').select('*').eq('trip_id', tripId).order('position'),
    supabase.from('places').select('*').eq('trip_id', tripId).order('name'),
    supabase
      .from('flights')
      .select('*, passengers:flight_passengers(*)')
      .eq('trip_id', tripId)
      .order('departure_at'),
    supabase.from('accommodations').select('*').eq('trip_id', tripId).order('check_in_at'),
    supabase.from('car_rentals').select('*').eq('trip_id', tripId).order('pickup_at'),
    supabase
      .from('itinerary_items')
      .select('*')
      .eq('trip_id', tripId)
      .order('day_date', { ascending: true, nullsFirst: false })
      .order('position', { ascending: true }),
    supabase.from('expenses').select('*, splits:expense_splits(*)').eq('trip_id', tripId).order('created_at'),
    supabase.from('documents').select('*').eq('trip_id', tripId).order('created_at', { ascending: false }),
    supabase.from('checklists').select('*, items:checklist_items(*)').eq('trip_id', tripId).order('position'),
    supabase.from('important_contacts').select('*').eq('trip_id', tripId).order('position'),
    supabase.from('quick_links').select('*').eq('trip_id', tripId).order('position'),
    supabase.from('routes').select('*, waypoints:route_waypoints(*)').eq('trip_id', tripId).order('created_at'),
  ]);

  const unwrap = <T>(result: { data: T[] | null; error: unknown }, label: string): T[] => {
    if (result.error) {
      console.error(`[loadTripBundle:${label}]`, result.error);
      return [];
    }
    return result.data ?? [];
  };

  const checklistRows = unwrap<ChecklistWithItems>(checklists as never, 'checklists').map((list) => ({
    ...list,
    items: [...(list.items ?? [])].sort((a, b) => a.position - b.position),
  }));

  return {
    trip,
    members,
    destinations: unwrap<DestinationRow>(destinations as never, 'destinations'),
    places: unwrap<PlaceRow>(places as never, 'places'),
    flights: unwrap<FlightWithPassengers>(flights as never, 'flights'),
    accommodations: unwrap<AccommodationRow>(accommodations as never, 'accommodations'),
    carRentals: unwrap<CarRentalRow>(carRentals as never, 'car_rentals'),
    itinerary: unwrap<ItineraryItemRow>(itinerary as never, 'itinerary'),
    expenses: unwrap<ExpenseWithSplits>(expenses as never, 'expenses'),
    documents: unwrap<DocumentRow>(documents as never, 'documents'),
    checklists: checklistRows,
    contacts: unwrap<ImportantContactRow>(contacts as never, 'contacts'),
    quickLinks: unwrap<QuickLinkRow>(quickLinks as never, 'quick_links'),
    routes: unwrap<RouteWithWaypoints>(routes as never, 'routes'),
  };
}
