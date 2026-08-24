-- =============================================================================
-- Row Level Security
-- Regra geral: ninguém enxerga dados de uma viagem da qual não participa.
--
-- As funções auxiliares são SECURITY DEFINER e leem trip_members ignorando RLS.
-- Isso evita recursão infinita nas políticas da própria tabela trip_members.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Funções auxiliares
-- -----------------------------------------------------------------------------
create or replace function public.trip_role(p_trip_id uuid)
returns public.member_role
language sql
stable
security definer
set search_path = public
as $$
  select m.role
  from public.trip_members m
  where m.trip_id = p_trip_id
    and m.user_id = auth.uid()
    and m.invite_status = 'accepted'
  order by case m.role when 'owner' then 0 when 'editor' then 1 else 2 end
  limit 1;
$$;

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.trip_role(p_trip_id) is not null;
$$;

create or replace function public.can_edit_trip(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.trip_role(p_trip_id) in ('owner', 'editor');
$$;

create or replace function public.is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.trip_role(p_trip_id) = 'owner';
$$;

grant execute on function public.trip_role(uuid) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.can_edit_trip(uuid) to authenticated;
grant execute on function public.is_trip_owner(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Habilita RLS em absolutamente todas as tabelas
-- -----------------------------------------------------------------------------
alter table public.profiles           enable row level security;
alter table public.trips              enable row level security;
alter table public.trip_members       enable row level security;
alter table public.destinations       enable row level security;
alter table public.places             enable row level security;
alter table public.flights            enable row level security;
alter table public.flight_passengers  enable row level security;
alter table public.accommodations     enable row level security;
alter table public.car_rentals        enable row level security;
alter table public.itinerary_items    enable row level security;
alter table public.routes             enable row level security;
alter table public.route_waypoints    enable row level security;
alter table public.route_legs_cache   enable row level security;
alter table public.expenses           enable row level security;
alter table public.expense_splits     enable row level security;
alter table public.documents          enable row level security;
alter table public.checklists         enable row level security;
alter table public.checklist_items    enable row level security;
alter table public.important_contacts enable row level security;
alter table public.quick_links        enable row level security;
alter table public.notifications      enable row level security;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
drop policy if exists "profiles_select_self_or_shared" on public.profiles;
create policy "profiles_select_self_or_shared" on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.trip_members mine
      join public.trip_members theirs on theirs.trip_id = mine.trip_id
      where mine.user_id = auth.uid()
        and mine.invite_status = 'accepted'
        and theirs.user_id = public.profiles.id
    )
  );

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- trips
-- -----------------------------------------------------------------------------
drop policy if exists "trips_select_members" on public.trips;
create policy "trips_select_members" on public.trips
  for select to authenticated
  using (owner_id = auth.uid() or public.is_trip_member(id));

drop policy if exists "trips_insert_own" on public.trips;
create policy "trips_insert_own" on public.trips
  for insert to authenticated with check (owner_id = auth.uid());

drop policy if exists "trips_update_editors" on public.trips;
create policy "trips_update_editors" on public.trips
  for update to authenticated
  using (public.can_edit_trip(id))
  with check (public.can_edit_trip(id));

-- A troca de proprietário nunca acontece por UPDATE comum: apenas o próprio
-- dono pode transferir, e isso passa pela função transfer_trip_ownership.
create or replace function public.guard_trip_owner_immutable()
returns trigger
language plpgsql
as $$
begin
  if new.owner_id is distinct from old.owner_id
     and coalesce(current_setting('app.allow_owner_change', true), 'off') <> 'on' then
    raise exception 'owner_id nao pode ser alterado diretamente. Use transfer_trip_ownership().';
  end if;
  return new;
end;
$$;

drop trigger if exists trips_guard_owner on public.trips;
create trigger trips_guard_owner
  before update on public.trips
  for each row execute function public.guard_trip_owner_immutable();

drop policy if exists "trips_delete_owner" on public.trips;
create policy "trips_delete_owner" on public.trips
  for delete to authenticated using (owner_id = auth.uid());

-- -----------------------------------------------------------------------------
-- trip_members
-- Visível para participantes da viagem; gestão restrita ao proprietário.
-- Cada usuário também pode aceitar/recusar o próprio convite.
-- -----------------------------------------------------------------------------
drop policy if exists "trip_members_select" on public.trip_members;
create policy "trip_members_select" on public.trip_members
  for select to authenticated
  using (user_id = auth.uid() or public.is_trip_member(trip_id));

drop policy if exists "trip_members_insert_owner" on public.trip_members;
create policy "trip_members_insert_owner" on public.trip_members
  for insert to authenticated with check (public.is_trip_owner(trip_id));

drop policy if exists "trip_members_update" on public.trip_members;
create policy "trip_members_update" on public.trip_members
  for update to authenticated
  using (public.is_trip_owner(trip_id) or user_id = auth.uid())
  with check (public.is_trip_owner(trip_id) or user_id = auth.uid());

drop policy if exists "trip_members_delete" on public.trip_members;
create policy "trip_members_delete" on public.trip_members
  for delete to authenticated
  using (
    (public.is_trip_owner(trip_id) and role <> 'owner')
    or (user_id = auth.uid() and role <> 'owner')
  );

-- -----------------------------------------------------------------------------
-- Tabelas com trip_id direto: leitura para membros, escrita para editores.
-- -----------------------------------------------------------------------------
do $$
declare
  t text;
  tables text[] := array[
    'destinations', 'places', 'flights', 'accommodations', 'car_rentals',
    'itinerary_items', 'routes', 'route_legs_cache', 'expenses', 'documents',
    'checklists', 'important_contacts', 'quick_links'
  ];
begin
  foreach t in array tables loop
    execute format('drop policy if exists %I on public.%I', t || '_select_members', t);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))',
      t || '_select_members', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_insert_editors', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.can_edit_trip(trip_id))',
      t || '_insert_editors', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_update_editors', t);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.can_edit_trip(trip_id)) with check (public.can_edit_trip(trip_id))',
      t || '_update_editors', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_delete_editors', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.can_edit_trip(trip_id))',
      t || '_delete_editors', t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Tabelas filhas: herdam a permissão da tabela pai.
-- -----------------------------------------------------------------------------
do $$
declare
  spec record;
  specs constant jsonb := '[
    {"child": "flight_passengers", "parent": "flights",     "fk": "flight_id"},
    {"child": "route_waypoints",   "parent": "routes",      "fk": "route_id"},
    {"child": "expense_splits",    "parent": "expenses",    "fk": "expense_id"},
    {"child": "checklist_items",   "parent": "checklists",  "fk": "checklist_id"}
  ]'::jsonb;
begin
  for spec in select * from jsonb_to_recordset(specs) as x(child text, parent text, fk text) loop
    execute format('drop policy if exists %I on public.%I', spec.child || '_select_members', spec.child);
    execute format(
      'create policy %I on public.%I for select to authenticated using (exists (select 1 from public.%I p where p.id = public.%I.%I and public.is_trip_member(p.trip_id)))',
      spec.child || '_select_members', spec.child, spec.parent, spec.child, spec.fk
    );

    execute format('drop policy if exists %I on public.%I', spec.child || '_insert_editors', spec.child);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (exists (select 1 from public.%I p where p.id = %I and public.can_edit_trip(p.trip_id)))',
      spec.child || '_insert_editors', spec.child, spec.parent, spec.fk
    );

    execute format('drop policy if exists %I on public.%I', spec.child || '_update_editors', spec.child);
    execute format(
      'create policy %I on public.%I for update to authenticated using (exists (select 1 from public.%I p where p.id = public.%I.%I and public.can_edit_trip(p.trip_id))) with check (exists (select 1 from public.%I p where p.id = %I and public.can_edit_trip(p.trip_id)))',
      spec.child || '_update_editors', spec.child, spec.parent, spec.child, spec.fk, spec.parent, spec.fk
    );

    execute format('drop policy if exists %I on public.%I', spec.child || '_delete_editors', spec.child);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (exists (select 1 from public.%I p where p.id = public.%I.%I and public.can_edit_trip(p.trip_id)))',
      spec.child || '_delete_editors', spec.child, spec.parent, spec.child, spec.fk
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- notifications — cada usuário vê apenas as próprias
-- -----------------------------------------------------------------------------
drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "notifications_insert_member" on public.notifications;
create policy "notifications_insert_member" on public.notifications
  for insert to authenticated
  with check (user_id = auth.uid() and (trip_id is null or public.is_trip_member(trip_id)));

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated using (user_id = auth.uid());
