-- =============================================================================
-- Funções de domínio expostas via RPC
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Convites: quem recebe o convite ainda não é membro, então a leitura/aceite
-- precisa acontecer em SECURITY DEFINER, sempre validando o token + e-mail.
-- -----------------------------------------------------------------------------
create or replace function public.get_invite_preview(p_token uuid)
returns table (
  trip_id      uuid,
  trip_name    text,
  start_date   date,
  end_date     date,
  cover_image_url text,
  role         public.member_role,
  invited_email text,
  invite_status public.invite_status,
  owner_name   text,
  email_matches boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    t.id,
    t.name,
    t.start_date,
    t.end_date,
    t.cover_image_url,
    m.role,
    m.invited_email,
    m.invite_status,
    p.full_name,
    (lower(coalesce(m.invited_email, '')) = lower(coalesce((select u.email from auth.users u where u.id = auth.uid()), '')))
  from public.trip_members m
  join public.trips t on t.id = m.trip_id
  left join public.profiles p on p.id = t.owner_id
  where m.invite_token = p_token
  limit 1;
$$;

create or replace function public.accept_trip_invite(p_token uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member  public.trip_members%rowtype;
  v_email   text;
  v_uid     uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'É necessário estar autenticado para aceitar o convite';
  end if;

  select email into v_email from auth.users where id = v_uid;

  select * into v_member from public.trip_members where invite_token = p_token;

  if not found then
    raise exception 'Convite não encontrado';
  end if;

  if v_member.invite_status = 'revoked' then
    raise exception 'Este convite foi cancelado';
  end if;

  -- Já é membro aceito com outro usuário: bloqueia.
  if v_member.user_id is not null and v_member.user_id <> v_uid then
    raise exception 'Este convite pertence a outra conta';
  end if;

  -- Convite endereçado a um e-mail específico só pode ser aceito por ele.
  if v_member.invited_email is not null
     and lower(v_member.invited_email) <> lower(coalesce(v_email, '')) then
    raise exception 'Este convite foi enviado para outro e-mail';
  end if;

  -- Se o usuário já participa da viagem por outro registro, apenas descarta o convite.
  if exists (
    select 1 from public.trip_members
    where trip_id = v_member.trip_id and user_id = v_uid and id <> v_member.id
  ) then
    delete from public.trip_members where id = v_member.id;
    return v_member.trip_id;
  end if;

  update public.trip_members
     set user_id = v_uid,
         invite_status = 'accepted',
         accepted_at = now()
   where id = v_member.id;

  return v_member.trip_id;
end;
$$;

revoke all on function public.get_invite_preview(uuid) from public, anon;
revoke all on function public.accept_trip_invite(uuid) from public, anon;
grant execute on function public.get_invite_preview(uuid) to authenticated;
grant execute on function public.accept_trip_invite(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Transferência de propriedade (somente o dono atual)
-- -----------------------------------------------------------------------------
create or replace function public.transfer_trip_ownership(p_trip_id uuid, p_new_owner uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_trip_owner(p_trip_id) then
    raise exception 'Apenas o proprietário pode transferir a viagem';
  end if;

  if not exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = p_new_owner and invite_status = 'accepted'
  ) then
    raise exception 'O novo proprietário precisa ser um participante da viagem';
  end if;

  update public.trip_members set role = 'editor'
   where trip_id = p_trip_id and user_id = auth.uid();

  update public.trip_members set role = 'owner'
   where trip_id = p_trip_id and user_id = p_new_owner;

  -- libera o guard apenas dentro desta transação
  perform set_config('app.allow_owner_change', 'on', true);
  update public.trips set owner_id = p_new_owner where id = p_trip_id;
  perform set_config('app.allow_owner_change', 'off', true);
end;
$$;

grant execute on function public.transfer_trip_ownership(uuid, uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Resumo financeiro calculado no banco (fonte única de verdade)
-- -----------------------------------------------------------------------------
create or replace function public.trip_financial_summary(p_trip_id uuid)
returns table (
  estimated_budget numeric,
  planned_total    numeric,
  actual_total     numeric,
  paid_total       numeric,
  outstanding      numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    t.estimated_budget,
    coalesce(sum(coalesce(e.planned_amount, e.actual_amount, 0) * e.exchange_rate), 0),
    coalesce(sum(coalesce(e.actual_amount, e.planned_amount, 0) * e.exchange_rate), 0),
    coalesce(sum(e.paid_amount * e.exchange_rate), 0),
    greatest(
      coalesce(sum(coalesce(e.actual_amount, e.planned_amount, 0) * e.exchange_rate), 0)
        - coalesce(sum(e.paid_amount * e.exchange_rate), 0),
      0
    )
  from public.trips t
  left join public.expenses e on e.trip_id = t.id
  where t.id = p_trip_id
  group by t.estimated_budget;
$$;

grant execute on function public.trip_financial_summary(uuid) to authenticated;

-- -----------------------------------------------------------------------------
-- Reordenação de itens do roteiro em uma única transação (drag and drop)
-- -----------------------------------------------------------------------------
create or replace function public.reorder_itinerary_items(p_trip_id uuid, p_item_ids uuid[], p_day date)
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  i integer;
begin
  for i in 1 .. array_length(p_item_ids, 1) loop
    update public.itinerary_items
       set position = i,
           day_date = p_day
     where id = p_item_ids[i]
       and trip_id = p_trip_id;
  end loop;
end;
$$;

grant execute on function public.reorder_itinerary_items(uuid, uuid[], date) to authenticated;
