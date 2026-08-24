-- =============================================================================
-- Nossa Viagem — schema inicial
-- Convenções:
--   * chaves primárias UUID (gen_random_uuid)
--   * timestamps created_at / updated_at em todas as tabelas mutáveis
--   * valores monetários em numeric(14,2) — nunca texto formatado
--   * horários de eventos: timestamptz + timezone IANA do local do evento
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- Tipos
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.trip_status as enum ('planning', 'confirmed', 'ongoing', 'completed', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.member_role as enum ('owner', 'editor', 'viewer');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.invite_status as enum ('pending', 'accepted', 'revoked');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum ('unpaid', 'partial', 'paid', 'refunded', 'cancelled');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.travel_mode as enum ('DRIVE', 'WALK', 'TRANSIT', 'BICYCLE', 'TWO_WHEELER');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- Utilitário: updated_at automático
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles — espelha auth.users
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text,
  email       text,
  avatar_url  text,
  locale      text not null default 'pt-BR',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Cria o profile automaticamente quando um usuário se cadastra.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do update
    set email = excluded.email,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
create table if not exists public.trips (
  id                 uuid primary key default gen_random_uuid(),
  owner_id           uuid not null references public.profiles (id) on delete cascade,
  name               text not null check (char_length(trim(name)) between 1 and 120),
  description        text,
  destination_label  text,
  start_date         date not null,
  end_date           date not null,
  cover_image_url    text,
  base_currency      char(3) not null default 'BRL',
  estimated_budget   numeric(14, 2) check (estimated_budget is null or estimated_budget >= 0),
  travelers_count    smallint not null default 1 check (travelers_count between 1 and 50),
  timezone           text not null default 'America/Sao_Paulo',
  status             public.trip_status not null default 'planning',
  notes              text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint trips_date_range_valid check (end_date >= start_date)
);

create index if not exists trips_owner_id_idx on public.trips (owner_id);
create index if not exists trips_start_date_idx on public.trips (start_date);
create index if not exists trips_status_idx on public.trips (status);

create trigger trips_set_updated_at
  before update on public.trips
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- trip_members — participantes e convites
-- -----------------------------------------------------------------------------
create table if not exists public.trip_members (
  id            uuid primary key default gen_random_uuid(),
  trip_id       uuid not null references public.trips (id) on delete cascade,
  user_id       uuid references public.profiles (id) on delete cascade,
  role          public.member_role not null default 'viewer',
  display_name  text,
  invited_email text,
  invite_status public.invite_status not null default 'pending',
  invite_token  uuid not null default gen_random_uuid(),
  invited_by    uuid references public.profiles (id) on delete set null,
  accepted_at   timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint trip_members_identity_present check (user_id is not null or invited_email is not null)
);

create unique index if not exists trip_members_trip_user_key
  on public.trip_members (trip_id, user_id) where user_id is not null;
create unique index if not exists trip_members_trip_email_key
  on public.trip_members (trip_id, lower(invited_email)) where invited_email is not null and user_id is null;
create unique index if not exists trip_members_invite_token_key on public.trip_members (invite_token);
create index if not exists trip_members_user_id_idx on public.trip_members (user_id);
create index if not exists trip_members_trip_id_idx on public.trip_members (trip_id);

create trigger trip_members_set_updated_at
  before update on public.trip_members
  for each row execute function public.set_updated_at();

-- O criador da viagem vira membro "owner" automaticamente.
create or replace function public.handle_new_trip()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.trip_members (trip_id, user_id, role, invite_status, accepted_at, invited_by)
  values (new.id, new.owner_id, 'owner', 'accepted', now(), new.owner_id)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_trip_created on public.trips;
create trigger on_trip_created
  after insert on public.trips
  for each row execute function public.handle_new_trip();

-- -----------------------------------------------------------------------------
-- destinations
-- -----------------------------------------------------------------------------
create table if not exists public.destinations (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  city        text not null,
  state       text,
  country     text,
  place_id    text,
  latitude    double precision,
  longitude   double precision,
  start_date  date,
  end_date    date,
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists destinations_trip_id_idx on public.destinations (trip_id);

create trigger destinations_set_updated_at
  before update on public.destinations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- places — todo local georreferenciado da viagem (hotel, restaurante, atração…)
-- -----------------------------------------------------------------------------
create table if not exists public.places (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  name              text not null,
  category          text not null default 'other'
                    check (category in ('accommodation','restaurant','attraction','airport','parking',
                                        'car_rental','shopping','event','transport','other')),
  formatted_address text,
  google_place_id   text,
  latitude          double precision,
  longitude         double precision,
  city              text,
  country           text,
  phone             text,
  website           text,
  google_maps_url   text,
  notes             text,
  is_favorite       boolean not null default false,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists places_trip_id_idx on public.places (trip_id);
create index if not exists places_category_idx on public.places (trip_id, category);
create index if not exists places_google_place_id_idx on public.places (google_place_id);

create trigger places_set_updated_at
  before update on public.places
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- flights — um registro por trecho
-- -----------------------------------------------------------------------------
create table if not exists public.flights (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references public.trips (id) on delete cascade,
  group_label           text,                 -- ex.: "Ida", "Volta"
  position              integer not null default 0,
  airline               text,
  airline_iata          text,
  flight_number         text,
  booking_reference     text,                 -- localizador
  origin_airport        text,
  origin_iata           char(3),
  origin_terminal       text,
  origin_timezone       text not null default 'America/Sao_Paulo',
  destination_airport   text,
  destination_iata      char(3),
  destination_terminal  text,
  destination_timezone  text not null default 'America/Sao_Paulo',
  gate                  text,
  boarding_at           timestamptz,
  departure_at          timestamptz not null,
  arrival_at            timestamptz,
  cabin_class           text,
  seats                 text,
  carry_on_baggage      text,
  checked_baggage       text,
  price_per_passenger   numeric(14, 2) check (price_per_passenger is null or price_per_passenger >= 0),
  taxes                 numeric(14, 2) check (taxes is null or taxes >= 0),
  total_price           numeric(14, 2) check (total_price is null or total_price >= 0),
  currency              char(3) not null default 'BRL',
  payment_method        text,
  payment_status        public.payment_status not null default 'unpaid',
  airline_url           text,
  booking_url           text,
  origin_place_id       uuid references public.places (id) on delete set null,
  destination_place_id  uuid references public.places (id) on delete set null,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint flights_arrival_after_departure check (arrival_at is null or arrival_at >= departure_at)
);

create index if not exists flights_trip_id_idx on public.flights (trip_id);
create index if not exists flights_departure_at_idx on public.flights (trip_id, departure_at);
create index if not exists flights_payment_status_idx on public.flights (trip_id, payment_status);

create trigger flights_set_updated_at
  before update on public.flights
  for each row execute function public.set_updated_at();

create table if not exists public.flight_passengers (
  id             uuid primary key default gen_random_uuid(),
  flight_id      uuid not null references public.flights (id) on delete cascade,
  member_id      uuid references public.trip_members (id) on delete set null,
  full_name      text not null,
  seat           text,
  ticket_number  text,
  notes          text,
  created_at     timestamptz not null default now()
);

create index if not exists flight_passengers_flight_id_idx on public.flight_passengers (flight_id);

-- -----------------------------------------------------------------------------
-- accommodations
-- -----------------------------------------------------------------------------
create table if not exists public.accommodations (
  id                   uuid primary key default gen_random_uuid(),
  trip_id              uuid not null references public.trips (id) on delete cascade,
  place_id             uuid references public.places (id) on delete set null,
  name                 text not null,
  kind                 text not null default 'hotel'
                       check (kind in ('hotel','airbnb','guesthouse','resort','house','apartment','hostel','other')),
  address              text,
  google_place_id      text,
  latitude             double precision,
  longitude            double precision,
  phone                text,
  website              text,
  booking_url          text,
  platform             text,                 -- Booking, Airbnb, direto…
  booking_reference    text,
  check_in_at          timestamptz not null,
  check_out_at         timestamptz not null,
  timezone             text not null default 'America/Sao_Paulo',
  check_in_window      text,                 -- ex.: "a partir das 14:00"
  check_out_window     text,                 -- ex.: "até as 11:00"
  guests               smallint check (guests is null or guests > 0),
  room_type            text,
  breakfast_included   boolean not null default false,
  parking_included     boolean not null default false,
  nightly_rate         numeric(14, 2) check (nightly_rate is null or nightly_rate >= 0),
  taxes                numeric(14, 2) check (taxes is null or taxes >= 0),
  total_price          numeric(14, 2) check (total_price is null or total_price >= 0),
  paid_amount          numeric(14, 2) not null default 0 check (paid_amount >= 0),
  currency             char(3) not null default 'BRL',
  payment_method       text,
  payment_status       public.payment_status not null default 'unpaid',
  cancellation_policy  text,
  -- campos típicos de aluguel por temporada (Airbnb e similares)
  host_name            text,
  host_contact         text,
  wifi_password        text,
  access_instructions  text,
  house_rules          text,
  notes                text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint accommodations_dates_valid check (check_out_at >= check_in_at)
);

create index if not exists accommodations_trip_id_idx on public.accommodations (trip_id);
create index if not exists accommodations_check_in_idx on public.accommodations (trip_id, check_in_at);

create trigger accommodations_set_updated_at
  before update on public.accommodations
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- car_rentals
-- -----------------------------------------------------------------------------
create table if not exists public.car_rentals (
  id                    uuid primary key default gen_random_uuid(),
  trip_id               uuid not null references public.trips (id) on delete cascade,
  company               text not null,
  category              text,
  vehicle_model         text,
  booking_reference     text,
  pickup_place_id       uuid references public.places (id) on delete set null,
  pickup_location       text,
  pickup_address        text,
  pickup_at             timestamptz not null,
  pickup_timezone       text not null default 'America/Sao_Paulo',
  dropoff_place_id      uuid references public.places (id) on delete set null,
  dropoff_location      text,
  dropoff_address       text,
  dropoff_at            timestamptz not null,
  dropoff_timezone      text not null default 'America/Sao_Paulo',
  daily_rate            numeric(14, 2) check (daily_rate is null or daily_rate >= 0),
  days_count            smallint check (days_count is null or days_count > 0),
  total_price           numeric(14, 2) check (total_price is null or total_price >= 0),
  paid_amount           numeric(14, 2) not null default 0 check (paid_amount >= 0),
  deposit_amount        numeric(14, 2) check (deposit_amount is null or deposit_amount >= 0),
  currency              char(3) not null default 'BRL',
  payment_status        public.payment_status not null default 'unpaid',
  insurance             text,
  fuel_policy           text,
  mileage_policy        text,
  main_driver           text,
  additional_driver     text,
  company_phone         text,
  booking_url           text,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint car_rentals_dates_valid check (dropoff_at >= pickup_at)
);

create index if not exists car_rentals_trip_id_idx on public.car_rentals (trip_id);
create index if not exists car_rentals_pickup_idx on public.car_rentals (trip_id, pickup_at);

create trigger car_rentals_set_updated_at
  before update on public.car_rentals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- itinerary_items — a agenda / roteiro
-- -----------------------------------------------------------------------------
create table if not exists public.itinerary_items (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references public.trips (id) on delete cascade,
  place_id           uuid references public.places (id) on delete set null,
  day_date           date,                 -- null = "sem dia definido"
  starts_at          timestamptz,          -- null = evento sem horário
  ends_at            timestamptz,
  timezone           text not null default 'America/Sao_Paulo',
  title              text not null,
  category           text not null default 'other'
                     check (category in ('flight','accommodation','car','restaurant','attraction','tour',
                                         'transport','shopping','event','payment','free','other')),
  description        text,
  address            text,
  cost               numeric(14, 2) check (cost is null or cost >= 0),
  currency           char(3) not null default 'BRL',
  reservation_code   text,
  url                text,
  phone              text,
  status             text not null default 'planned'
                     check (status in ('planned','confirmed','done','cancelled')),
  position           integer not null default 0,
  notes              text,
  -- vínculos opcionais com reservas
  flight_id          uuid references public.flights (id) on delete cascade,
  accommodation_id   uuid references public.accommodations (id) on delete cascade,
  car_rental_id      uuid references public.car_rentals (id) on delete cascade,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint itinerary_items_end_after_start check (ends_at is null or starts_at is null or ends_at >= starts_at)
);

create index if not exists itinerary_items_trip_id_idx on public.itinerary_items (trip_id);
create index if not exists itinerary_items_day_idx on public.itinerary_items (trip_id, day_date, position);
create index if not exists itinerary_items_starts_at_idx on public.itinerary_items (trip_id, starts_at);
create index if not exists itinerary_items_category_idx on public.itinerary_items (trip_id, category);
create index if not exists itinerary_items_status_idx on public.itinerary_items (trip_id, status);

create trigger itinerary_items_set_updated_at
  before update on public.itinerary_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- routes / route_waypoints — resultados do Google Routes ficam em cache aqui
-- -----------------------------------------------------------------------------
create table if not exists public.routes (
  id                        uuid primary key default gen_random_uuid(),
  trip_id                   uuid not null references public.trips (id) on delete cascade,
  name                      text,
  day_date                  date,
  travel_mode               public.travel_mode not null default 'DRIVE',
  optimize_waypoint_order   boolean not null default false,
  distance_meters           integer check (distance_meters is null or distance_meters >= 0),
  duration_seconds          integer check (duration_seconds is null or duration_seconds >= 0),
  duration_in_traffic_seconds integer,
  encoded_polyline          text,
  toll_info                 jsonb,
  google_maps_url           text,
  computed_at               timestamptz,
  stale                     boolean not null default false,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create index if not exists routes_trip_id_idx on public.routes (trip_id);
create index if not exists routes_day_date_idx on public.routes (trip_id, day_date);

create trigger routes_set_updated_at
  before update on public.routes
  for each row execute function public.set_updated_at();

create table if not exists public.route_waypoints (
  id                    uuid primary key default gen_random_uuid(),
  route_id              uuid not null references public.routes (id) on delete cascade,
  place_id              uuid references public.places (id) on delete set null,
  position              integer not null default 0,
  label                 text,
  address               text,
  latitude              double precision,
  longitude             double precision,
  leg_distance_meters   integer,
  leg_duration_seconds  integer,
  created_at            timestamptz not null default now()
);

create index if not exists route_waypoints_route_id_idx on public.route_waypoints (route_id, position);

-- Cache de trechos ponto-a-ponto (usado no roteiro e nas distâncias do hotel).
create table if not exists public.route_legs_cache (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  cache_key         text not null,
  travel_mode       public.travel_mode not null default 'DRIVE',
  distance_meters   integer,
  duration_seconds  integer,
  encoded_polyline  text,
  computed_at       timestamptz not null default now()
);

create unique index if not exists route_legs_cache_key_idx on public.route_legs_cache (trip_id, cache_key);

-- -----------------------------------------------------------------------------
-- expenses / expense_splits
-- -----------------------------------------------------------------------------
create table if not exists public.expenses (
  id                 uuid primary key default gen_random_uuid(),
  trip_id            uuid not null references public.trips (id) on delete cascade,
  description        text not null,
  category           text not null default 'other'
                     check (category in ('flights','accommodation','transport','car_rental','fuel','tolls',
                                         'food','restaurants','tours','tickets','shopping','insurance',
                                         'parking','other')),
  planned_amount     numeric(14, 2) check (planned_amount is null or planned_amount >= 0),
  actual_amount      numeric(14, 2) check (actual_amount is null or actual_amount >= 0),
  currency           char(3) not null default 'BRL',
  exchange_rate      numeric(14, 6) not null default 1 check (exchange_rate > 0),
  payment_status     public.payment_status not null default 'unpaid',
  paid_amount        numeric(14, 2) not null default 0 check (paid_amount >= 0),
  due_date           date,
  paid_at            date,
  payment_method     text,
  installments       smallint not null default 1 check (installments >= 1),
  paid_by_member_id  uuid references public.trip_members (id) on delete set null,
  split_enabled      boolean not null default false,
  expense_date       date,
  -- vínculos opcionais
  flight_id          uuid references public.flights (id) on delete set null,
  accommodation_id   uuid references public.accommodations (id) on delete set null,
  car_rental_id      uuid references public.car_rentals (id) on delete set null,
  itinerary_item_id  uuid references public.itinerary_items (id) on delete set null,
  notes              text,
  created_by         uuid references public.profiles (id) on delete set null,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists expenses_trip_id_idx on public.expenses (trip_id);
create index if not exists expenses_category_idx on public.expenses (trip_id, category);
create index if not exists expenses_status_idx on public.expenses (trip_id, payment_status);
create index if not exists expenses_due_date_idx on public.expenses (trip_id, due_date);

create trigger expenses_set_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

create table if not exists public.expense_splits (
  id            uuid primary key default gen_random_uuid(),
  expense_id    uuid not null references public.expenses (id) on delete cascade,
  member_id     uuid not null references public.trip_members (id) on delete cascade,
  share_amount  numeric(14, 2) not null default 0 check (share_amount >= 0),
  is_settled    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (expense_id, member_id)
);

create index if not exists expense_splits_expense_id_idx on public.expense_splits (expense_id);
create index if not exists expense_splits_member_id_idx on public.expense_splits (member_id);

-- -----------------------------------------------------------------------------
-- documents — metadados; os arquivos ficam no Storage privado
-- -----------------------------------------------------------------------------
create table if not exists public.documents (
  id                uuid primary key default gen_random_uuid(),
  trip_id           uuid not null references public.trips (id) on delete cascade,
  name              text not null,
  category          text not null default 'other'
                    check (category in ('ticket','boarding_pass','accommodation','airbnb','car_rental',
                                        'attraction_ticket','insurance','receipt','personal_document','other')),
  storage_path      text not null unique,
  mime_type         text,
  size_bytes        bigint check (size_bytes is null or size_bytes >= 0),
  flight_id         uuid references public.flights (id) on delete set null,
  accommodation_id  uuid references public.accommodations (id) on delete set null,
  car_rental_id     uuid references public.car_rentals (id) on delete set null,
  itinerary_item_id uuid references public.itinerary_items (id) on delete set null,
  uploaded_by       uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists documents_trip_id_idx on public.documents (trip_id);
create index if not exists documents_category_idx on public.documents (trip_id, category);

create trigger documents_set_updated_at
  before update on public.documents
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- checklists
-- -----------------------------------------------------------------------------
create table if not exists public.checklists (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  title       text not null,
  kind        text not null default 'custom' check (kind in ('before_trip','packing','custom')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists checklists_trip_id_idx on public.checklists (trip_id, position);

create trigger checklists_set_updated_at
  before update on public.checklists
  for each row execute function public.set_updated_at();

create table if not exists public.checklist_items (
  id            uuid primary key default gen_random_uuid(),
  checklist_id  uuid not null references public.checklists (id) on delete cascade,
  title         text not null,
  is_done       boolean not null default false,
  due_date      date,
  assigned_to   uuid references public.trip_members (id) on delete set null,
  notes         text,
  position      integer not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists checklist_items_checklist_id_idx on public.checklist_items (checklist_id, position);

create trigger checklist_items_set_updated_at
  before update on public.checklist_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- important_contacts / quick_links / notifications
-- -----------------------------------------------------------------------------
create table if not exists public.important_contacts (
  id              uuid primary key default gen_random_uuid(),
  trip_id         uuid not null references public.trips (id) on delete cascade,
  label           text not null,
  kind            text not null default 'other'
                  check (kind in ('accommodation','airline','car_rental','insurance','emergency','hospital',
                                  'embassy','other')),
  phone           text,
  email           text,
  address         text,
  reference_code  text,
  notes           text,
  position        integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists important_contacts_trip_id_idx on public.important_contacts (trip_id, position);

create trigger important_contacts_set_updated_at
  before update on public.important_contacts
  for each row execute function public.set_updated_at();

create table if not exists public.quick_links (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  label       text not null,
  url         text not null,
  category    text not null default 'other'
              check (category in ('airline','accommodation','car_rental','maps','attraction','tickets',
                                  'restaurant','other')),
  position    integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists quick_links_trip_id_idx on public.quick_links (trip_id, position);

create trigger quick_links_set_updated_at
  before update on public.quick_links
  for each row execute function public.set_updated_at();

create table if not exists public.notifications (
  id             uuid primary key default gen_random_uuid(),
  trip_id        uuid references public.trips (id) on delete cascade,
  user_id        uuid not null references public.profiles (id) on delete cascade,
  kind           text not null default 'info'
                 check (kind in ('info','flight_checkin','payment_due','pickup','checkin','reminder')),
  title          text not null,
  body           text,
  action_url     text,
  scheduled_for  timestamptz,
  read_at        timestamptz,
  created_at     timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications (user_id, read_at);
create index if not exists notifications_trip_id_idx on public.notifications (trip_id);
