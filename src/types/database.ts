/**
 * Tipos do banco.
 *
 * Mantido à mão e alinhado com `supabase/migrations/`. Para regerar a partir de
 * um projeto real: `npx supabase gen types typescript --project-id <ref>`.
 */

export type TripStatus = 'planning' | 'confirmed' | 'ongoing' | 'completed' | 'cancelled';
export type MemberRole = 'owner' | 'editor' | 'viewer';
export type InviteStatus = 'pending' | 'accepted' | 'revoked';
export type PaymentStatus = 'unpaid' | 'partial' | 'paid' | 'refunded' | 'cancelled';
export type TravelMode = 'DRIVE' | 'WALK' | 'TRANSIT' | 'BICYCLE' | 'TWO_WHEELER';

export type PlaceCategory =
  | 'accommodation' | 'restaurant' | 'attraction' | 'airport' | 'parking'
  | 'car_rental' | 'shopping' | 'event' | 'transport' | 'other';

export type AccommodationKind =
  | 'hotel' | 'airbnb' | 'guesthouse' | 'resort' | 'house' | 'apartment' | 'hostel' | 'other';

export type ItineraryCategory =
  | 'flight' | 'accommodation' | 'car' | 'restaurant' | 'attraction' | 'tour'
  | 'transport' | 'shopping' | 'event' | 'payment' | 'free' | 'other';

export type ItineraryStatus = 'planned' | 'confirmed' | 'done' | 'cancelled';

export type ExpenseCategory =
  | 'flights' | 'accommodation' | 'transport' | 'car_rental' | 'fuel' | 'tolls'
  | 'food' | 'restaurants' | 'tours' | 'tickets' | 'shopping' | 'insurance'
  | 'parking' | 'other';

export type DocumentCategory =
  | 'ticket' | 'boarding_pass' | 'accommodation' | 'airbnb' | 'car_rental'
  | 'attraction_ticket' | 'insurance' | 'receipt' | 'personal_document' | 'other';

export type ChecklistKind = 'before_trip' | 'packing' | 'custom';
export type ContactKind =
  | 'accommodation' | 'airline' | 'car_rental' | 'insurance' | 'emergency'
  | 'hospital' | 'embassy' | 'other';
export type QuickLinkCategory =
  | 'airline' | 'accommodation' | 'car_rental' | 'maps' | 'attraction'
  | 'tickets' | 'restaurant' | 'other';
export type NotificationKind =
  | 'info' | 'flight_checkin' | 'payment_due' | 'pickup' | 'checkin' | 'reminder';

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

/** Declara a chave estrangeira que permite o "embed" do PostgREST. */
type FK<Name extends string, Column extends string, Ref extends string> = {
  foreignKeyName: Name;
  columns: [Column];
  isOneToOne: false;
  referencedRelation: Ref;
  referencedColumns: ['id'];
};

/** Colunas com default no banco viram opcionais no Insert. */
type Def<Row, Defaulted extends keyof Row, Rels extends Relationship[] = []> = {
  Row: Row;
  Insert: Omit<Row, Defaulted> & Partial<Pick<Row, Defaulted>>;
  Update: Partial<Row>;
  Relationships: Rels;
};

type Meta = 'id' | 'created_at' | 'updated_at';

export type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export type TripRow = {
  id: string;
  owner_id: string;
  name: string;
  description: string | null;
  destination_label: string | null;
  start_date: string;
  end_date: string;
  cover_image_url: string | null;
  base_currency: string;
  estimated_budget: number | null;
  travelers_count: number;
  timezone: string;
  status: TripStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type TripMemberRow = {
  id: string;
  trip_id: string;
  user_id: string | null;
  role: MemberRole;
  display_name: string | null;
  invited_email: string | null;
  invite_status: InviteStatus;
  invite_token: string;
  invited_by: string | null;
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export type DestinationRow = {
  id: string;
  trip_id: string;
  city: string;
  state: string | null;
  country: string | null;
  place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type PlaceRow = {
  id: string;
  trip_id: string;
  name: string;
  category: PlaceCategory;
  formatted_address: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
  country: string | null;
  phone: string | null;
  website: string | null;
  google_maps_url: string | null;
  notes: string | null;
  is_favorite: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type FlightRow = {
  id: string;
  trip_id: string;
  group_label: string | null;
  position: number;
  airline: string | null;
  airline_iata: string | null;
  flight_number: string | null;
  booking_reference: string | null;
  origin_airport: string | null;
  origin_iata: string | null;
  origin_terminal: string | null;
  origin_timezone: string;
  destination_airport: string | null;
  destination_iata: string | null;
  destination_terminal: string | null;
  destination_timezone: string;
  gate: string | null;
  boarding_at: string | null;
  departure_at: string;
  arrival_at: string | null;
  cabin_class: string | null;
  seats: string | null;
  carry_on_baggage: string | null;
  checked_baggage: string | null;
  price_per_passenger: number | null;
  taxes: number | null;
  total_price: number | null;
  currency: string;
  payment_method: string | null;
  payment_status: PaymentStatus;
  airline_url: string | null;
  booking_url: string | null;
  origin_place_id: string | null;
  destination_place_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type FlightPassengerRow = {
  id: string;
  flight_id: string;
  member_id: string | null;
  full_name: string;
  seat: string | null;
  ticket_number: string | null;
  notes: string | null;
  created_at: string;
}

export type AccommodationRow = {
  id: string;
  trip_id: string;
  place_id: string | null;
  name: string;
  kind: AccommodationKind;
  address: string | null;
  google_place_id: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  booking_url: string | null;
  platform: string | null;
  booking_reference: string | null;
  check_in_at: string;
  check_out_at: string;
  timezone: string;
  check_in_window: string | null;
  check_out_window: string | null;
  guests: number | null;
  room_type: string | null;
  breakfast_included: boolean;
  parking_included: boolean;
  nightly_rate: number | null;
  taxes: number | null;
  total_price: number | null;
  paid_amount: number;
  currency: string;
  payment_method: string | null;
  payment_status: PaymentStatus;
  cancellation_policy: string | null;
  host_name: string | null;
  host_contact: string | null;
  wifi_password: string | null;
  access_instructions: string | null;
  house_rules: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type CarRentalRow = {
  id: string;
  trip_id: string;
  company: string;
  category: string | null;
  vehicle_model: string | null;
  booking_reference: string | null;
  pickup_place_id: string | null;
  pickup_location: string | null;
  pickup_address: string | null;
  pickup_at: string;
  pickup_timezone: string;
  dropoff_place_id: string | null;
  dropoff_location: string | null;
  dropoff_address: string | null;
  dropoff_at: string;
  dropoff_timezone: string;
  daily_rate: number | null;
  days_count: number | null;
  total_price: number | null;
  paid_amount: number;
  deposit_amount: number | null;
  currency: string;
  payment_status: PaymentStatus;
  insurance: string | null;
  fuel_policy: string | null;
  mileage_policy: string | null;
  main_driver: string | null;
  additional_driver: string | null;
  company_phone: string | null;
  booking_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type ItineraryItemRow = {
  id: string;
  trip_id: string;
  place_id: string | null;
  day_date: string | null;
  starts_at: string | null;
  ends_at: string | null;
  timezone: string;
  title: string;
  category: ItineraryCategory;
  description: string | null;
  address: string | null;
  cost: number | null;
  currency: string;
  reservation_code: string | null;
  url: string | null;
  phone: string | null;
  status: ItineraryStatus;
  position: number;
  notes: string | null;
  flight_id: string | null;
  accommodation_id: string | null;
  car_rental_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type RouteRow = {
  id: string;
  trip_id: string;
  name: string | null;
  day_date: string | null;
  travel_mode: TravelMode;
  optimize_waypoint_order: boolean;
  distance_meters: number | null;
  duration_seconds: number | null;
  duration_in_traffic_seconds: number | null;
  encoded_polyline: string | null;
  toll_info: Record<string, unknown> | null;
  google_maps_url: string | null;
  computed_at: string | null;
  stale: boolean;
  created_at: string;
  updated_at: string;
}

export type RouteWaypointRow = {
  id: string;
  route_id: string;
  place_id: string | null;
  position: number;
  label: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  leg_distance_meters: number | null;
  leg_duration_seconds: number | null;
  created_at: string;
}

export type RouteLegCacheRow = {
  id: string;
  trip_id: string;
  cache_key: string;
  travel_mode: TravelMode;
  distance_meters: number | null;
  duration_seconds: number | null;
  encoded_polyline: string | null;
  computed_at: string;
}

export type ExpenseRow = {
  id: string;
  trip_id: string;
  description: string;
  category: ExpenseCategory;
  planned_amount: number | null;
  actual_amount: number | null;
  currency: string;
  exchange_rate: number;
  payment_status: PaymentStatus;
  paid_amount: number;
  due_date: string | null;
  paid_at: string | null;
  payment_method: string | null;
  installments: number;
  paid_by_member_id: string | null;
  split_enabled: boolean;
  expense_date: string | null;
  flight_id: string | null;
  accommodation_id: string | null;
  car_rental_id: string | null;
  itinerary_item_id: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ExpenseSplitRow = {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number;
  is_settled: boolean;
  created_at: string;
}

export type DocumentRow = {
  id: string;
  trip_id: string;
  name: string;
  category: DocumentCategory;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  flight_id: string | null;
  accommodation_id: string | null;
  car_rental_id: string | null;
  itinerary_item_id: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

export type ChecklistRow = {
  id: string;
  trip_id: string;
  title: string;
  kind: ChecklistKind;
  position: number;
  created_at: string;
  updated_at: string;
}

export type ChecklistItemRow = {
  id: string;
  checklist_id: string;
  title: string;
  is_done: boolean;
  due_date: string | null;
  assigned_to: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type ImportantContactRow = {
  id: string;
  trip_id: string;
  label: string;
  kind: ContactKind;
  phone: string | null;
  email: string | null;
  address: string | null;
  reference_code: string | null;
  notes: string | null;
  position: number;
  created_at: string;
  updated_at: string;
}

export type QuickLinkRow = {
  id: string;
  trip_id: string;
  label: string;
  url: string;
  category: QuickLinkCategory;
  position: number;
  created_at: string;
  updated_at: string;
}

export type NotificationRow = {
  id: string;
  trip_id: string | null;
  user_id: string;
  kind: NotificationKind;
  title: string;
  body: string | null;
  action_url: string | null;
  scheduled_for: string | null;
  read_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      profiles: Def<ProfileRow, Meta | 'locale' | 'full_name' | 'email' | 'avatar_url'>;
      trips: Def<
        TripRow,
        | Meta | 'description' | 'destination_label' | 'cover_image_url' | 'base_currency'
        | 'estimated_budget' | 'travelers_count' | 'timezone' | 'status' | 'notes',
        [FK<'trips_owner_id_fkey', 'owner_id', 'profiles'>]
      >;
      trip_members: Def<
        TripMemberRow,
        | Meta | 'user_id' | 'role' | 'display_name' | 'invited_email' | 'invite_status'
        | 'invite_token' | 'invited_by' | 'accepted_at',
        [
          FK<'trip_members_trip_id_fkey', 'trip_id', 'trips'>,
          FK<'trip_members_user_id_fkey', 'user_id', 'profiles'>,
          // Declarada de propósito, embora nada faça embed por ela: são DUAS
          // chaves de trip_members para profiles, e omitir esta fazia o
          // TypeScript acreditar que `profiles(...)` era inequívoco. O PostgREST
          // via as duas e respondia 300/PGRST201. Com ambas aqui, um embed sem
          // dizer qual chave usar passa a falhar no `npm run typecheck`.
          FK<'trip_members_invited_by_fkey', 'invited_by', 'profiles'>,
        ]
      >;
      destinations: Def<DestinationRow, Meta | 'state' | 'country' | 'place_id' | 'latitude' | 'longitude' | 'start_date' | 'end_date' | 'position'>;
      places: Def<PlaceRow, Meta | Exclude<keyof PlaceRow, 'trip_id' | 'name'>>;
      flights: Def<FlightRow, Meta | Exclude<keyof FlightRow, 'trip_id' | 'departure_at'>>;
      flight_passengers: Def<
        FlightPassengerRow,
        'id' | 'created_at' | 'member_id' | 'seat' | 'ticket_number' | 'notes',
        [FK<'flight_passengers_flight_id_fkey', 'flight_id', 'flights'>]
      >;
      accommodations: Def<AccommodationRow, Meta | Exclude<keyof AccommodationRow, 'trip_id' | 'name' | 'check_in_at' | 'check_out_at'>>;
      car_rentals: Def<CarRentalRow, Meta | Exclude<keyof CarRentalRow, 'trip_id' | 'company' | 'pickup_at' | 'dropoff_at'>>;
      itinerary_items: Def<ItineraryItemRow, Meta | Exclude<keyof ItineraryItemRow, 'trip_id' | 'title'>>;
      routes: Def<RouteRow, Meta | Exclude<keyof RouteRow, 'trip_id'>>;
      route_waypoints: Def<
        RouteWaypointRow,
        'id' | 'created_at' | Exclude<keyof RouteWaypointRow, 'route_id'>,
        [FK<'route_waypoints_route_id_fkey', 'route_id', 'routes'>]
      >;
      route_legs_cache: Def<RouteLegCacheRow, 'id' | 'computed_at' | Exclude<keyof RouteLegCacheRow, 'trip_id' | 'cache_key'>>;
      expenses: Def<ExpenseRow, Meta | Exclude<keyof ExpenseRow, 'trip_id' | 'description'>>;
      expense_splits: Def<
        ExpenseSplitRow,
        'id' | 'created_at' | 'share_amount' | 'is_settled',
        [
          FK<'expense_splits_expense_id_fkey', 'expense_id', 'expenses'>,
          FK<'expense_splits_member_id_fkey', 'member_id', 'trip_members'>,
        ]
      >;
      documents: Def<DocumentRow, Meta | Exclude<keyof DocumentRow, 'trip_id' | 'name' | 'storage_path'>>;
      checklists: Def<ChecklistRow, Meta | 'kind' | 'position'>;
      checklist_items: Def<
        ChecklistItemRow,
        Meta | Exclude<keyof ChecklistItemRow, 'checklist_id' | 'title'>,
        [FK<'checklist_items_checklist_id_fkey', 'checklist_id', 'checklists'>]
      >;
      important_contacts: Def<ImportantContactRow, Meta | Exclude<keyof ImportantContactRow, 'trip_id' | 'label'>>;
      quick_links: Def<QuickLinkRow, Meta | 'category' | 'position'>;
      notifications: Def<NotificationRow, 'id' | 'created_at' | Exclude<keyof NotificationRow, 'user_id' | 'title'>>;
    };
    Views: Record<never, never>;
    Functions: {
      trip_role: { Args: { p_trip_id: string }; Returns: MemberRole | null };
      is_trip_member: { Args: { p_trip_id: string }; Returns: boolean };
      can_edit_trip: { Args: { p_trip_id: string }; Returns: boolean };
      is_trip_owner: { Args: { p_trip_id: string }; Returns: boolean };
      accept_trip_invite: { Args: { p_token: string }; Returns: string };
      get_invite_preview: {
        Args: { p_token: string };
        Returns: {
          trip_id: string;
          trip_name: string;
          start_date: string;
          end_date: string;
          cover_image_url: string | null;
          role: MemberRole;
          invited_email: string | null;
          invite_status: InviteStatus;
          owner_name: string | null;
          email_matches: boolean;
        }[];
      };
      transfer_trip_ownership: { Args: { p_trip_id: string; p_new_owner: string }; Returns: undefined };
      trip_financial_summary: {
        Args: { p_trip_id: string };
        Returns: {
          estimated_budget: number | null;
          planned_total: number;
          actual_total: number;
          paid_total: number;
          outstanding: number;
        }[];
      };
      reorder_itinerary_items: {
        Args: { p_trip_id: string; p_item_ids: string[]; p_day: string | null };
        Returns: undefined;
      };
    };
    Enums: {
      trip_status: TripStatus;
      member_role: MemberRole;
      invite_status: InviteStatus;
      payment_status: PaymentStatus;
      travel_mode: TravelMode;
    };
    CompositeTypes: Record<never, never>;
  };
}
