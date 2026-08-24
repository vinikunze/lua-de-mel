-- =============================================================================
-- Viagem de demonstração — "Serra Gaúcha"
--
-- Como usar (SQL Editor do Supabase ou psql), depois de criar sua conta:
--     select public.seed_demo_trip('seu-email@exemplo.com');
--
-- Cria uma viagem fictícia completa para você experimentar o sistema:
-- 2 voos, 1 hospedagem, 1 carro, 4 dias de roteiro com 10 eventos, despesas,
-- contatos, links e checklists.
--
-- Não há nenhum dado pessoal real aqui. Para remover, basta excluir a viagem
-- pela própria interface.
-- =============================================================================

create or replace function public.seed_demo_trip(p_email text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id    uuid;
  v_trip_id    uuid;
  v_start      date := current_date + 60;
  v_end        date := current_date + 64;
  v_tz         text := 'America/Sao_Paulo';
  v_member_id  uuid;

  v_hotel_place uuid;
  v_lago_place  uuid;
  v_igreja_place uuid;
  v_snow_place  uuid;
  v_rest_place  uuid;
  v_cafe_place  uuid;

  v_flight_out uuid;
  v_flight_back uuid;
  v_stay_id    uuid;
  v_car_id     uuid;
  v_checklist  uuid;
begin
  select id into v_user_id from auth.users where lower(email) = lower(p_email);
  if v_user_id is null then
    raise exception 'Nenhum usuário com o e-mail %. Crie a conta no aplicativo antes de rodar o seed.', p_email;
  end if;

  -- ---------------------------------------------------------------- Viagem
  insert into public.trips (
    owner_id, name, description, destination_label, start_date, end_date,
    base_currency, estimated_budget, travelers_count, timezone, status, notes
  )
  values (
    v_user_id,
    'Serra Gaúcha (demonstração)',
    'Viagem de exemplo para conhecer o sistema. Todos os dados são fictícios.',
    'Gramado & Canela',
    v_start, v_end,
    'BRL', 10000.00, 2, v_tz, 'confirmed',
    'Levar casaco: em julho e agosto a serra fica bem fria.'
  )
  returning id into v_trip_id;

  select id into v_member_id from public.trip_members
   where trip_id = v_trip_id and user_id = v_user_id;

  insert into public.destinations (trip_id, city, state, country, position)
  values (v_trip_id, 'Gramado', 'RS', 'Brasil', 0),
         (v_trip_id, 'Canela', 'RS', 'Brasil', 1);

  -- ----------------------------------------------------------------- Locais
  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, created_by)
  values (v_trip_id, 'Hotel Serra Encantada', 'accommodation', 'Av. Borges de Medeiros, 2000 — Gramado, RS', -29.3788, -50.8761, 'Gramado', 'Brasil', v_user_id)
  returning id into v_hotel_place;

  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, created_by)
  values (v_trip_id, 'Lago Negro', 'attraction', 'R. A. J. Renner — Gramado, RS', -29.3921, -50.8794, 'Gramado', 'Brasil', v_user_id)
  returning id into v_lago_place;

  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, created_by)
  values (v_trip_id, 'Catedral de Pedra', 'attraction', 'Av. Osvaldo Aranha, 419 — Canela, RS', -29.3644, -50.8118, 'Canela', 'Brasil', v_user_id)
  returning id into v_igreja_place;

  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, created_by)
  values (v_trip_id, 'Parque de Neve', 'attraction', 'Rod. RS-235, 9600 — Gramado, RS', -29.3529, -50.8398, 'Gramado', 'Brasil', v_user_id)
  returning id into v_snow_place;

  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, phone, created_by)
  values (v_trip_id, 'Restaurante da Colina', 'restaurant', 'R. São Pedro, 500 — Gramado, RS', -29.3801, -50.8712, 'Gramado', 'Brasil', '(54) 3286-0000', v_user_id)
  returning id into v_rest_place;

  insert into public.places (trip_id, name, category, formatted_address, latitude, longitude, city, country, is_favorite, created_by)
  values (v_trip_id, 'Café Colonial Bela Vista', 'restaurant', 'Rod. RS-235, 4200 — Gramado, RS', -29.3612, -50.8563, 'Gramado', 'Brasil', true, v_user_id)
  returning id into v_cafe_place;

  -- ------------------------------------------------------------------ Voos
  insert into public.flights (
    trip_id, group_label, position, airline, flight_number, booking_reference,
    origin_airport, origin_iata, origin_timezone,
    destination_airport, destination_iata, destination_timezone,
    boarding_at, departure_at, arrival_at,
    cabin_class, seats, carry_on_baggage, checked_baggage,
    price_per_passenger, taxes, total_price, currency, payment_status, payment_method
  )
  values (
    v_trip_id, 'Ida', 0, 'Companhia Exemplo', 'CE1042', 'DEMO01',
    'Cuiabá — Marechal Rondon', 'CGB', 'America/Cuiaba',
    'Porto Alegre — Salgado Filho', 'POA', v_tz,
    (v_start::timestamp + time '06:00') at time zone 'America/Cuiaba',
    (v_start::timestamp + time '06:40') at time zone 'America/Cuiaba',
    (v_start::timestamp + time '10:35') at time zone v_tz,
    'Econômica', '12A, 12B', '1 peça de 10 kg', '2 peças de 23 kg',
    980.00, 120.00, 2200.00, 'BRL', 'paid', 'Cartão de crédito'
  )
  returning id into v_flight_out;

  insert into public.flights (
    trip_id, group_label, position, airline, flight_number, booking_reference,
    origin_airport, origin_iata, origin_timezone,
    destination_airport, destination_iata, destination_timezone,
    departure_at, arrival_at, cabin_class, seats,
    total_price, currency, payment_status
  )
  values (
    v_trip_id, 'Volta', 1, 'Companhia Exemplo', 'CE1043', 'DEMO01',
    'Porto Alegre — Salgado Filho', 'POA', v_tz,
    'Cuiabá — Marechal Rondon', 'CGB', 'America/Cuiaba',
    (v_end::timestamp + time '18:20') at time zone v_tz,
    (v_end::timestamp + time '21:10') at time zone 'America/Cuiaba',
    'Econômica', '9C, 9D', 2200.00, 'BRL', 'paid'
  )
  returning id into v_flight_back;

  insert into public.flight_passengers (flight_id, full_name, seat)
  values (v_flight_out, 'Passageiro Exemplo 1', '12A'),
         (v_flight_out, 'Passageiro Exemplo 2', '12B'),
         (v_flight_back, 'Passageiro Exemplo 1', '9C'),
         (v_flight_back, 'Passageiro Exemplo 2', '9D');

  -- ------------------------------------------------------------ Hospedagem
  insert into public.accommodations (
    trip_id, place_id, name, kind, address, latitude, longitude, phone,
    platform, booking_reference, check_in_at, check_out_at, timezone,
    check_in_window, check_out_window, guests, room_type,
    breakfast_included, parking_included,
    nightly_rate, total_price, paid_amount, currency, payment_status, cancellation_policy
  )
  values (
    v_trip_id, v_hotel_place, 'Hotel Serra Encantada', 'hotel',
    'Av. Borges de Medeiros, 2000 — Gramado, RS', -29.3788, -50.8761, '(54) 3286-1000',
    'Direto com o hotel', 'DEMO-HTL-77',
    (v_start::timestamp + time '15:00') at time zone v_tz,
    (v_end::timestamp + time '11:00') at time zone v_tz,
    v_tz, 'a partir das 15:00', 'até as 11:00', 2, 'Casal superior',
    true, true,
    620.00, 2480.00, 1240.00, 'BRL', 'partial',
    'Cancelamento gratuito até 7 dias antes do check-in.'
  )
  returning id into v_stay_id;

  -- ----------------------------------------------------------------- Carro
  insert into public.car_rentals (
    trip_id, company, category, vehicle_model, booking_reference,
    pickup_location, pickup_address, pickup_at, pickup_timezone,
    dropoff_location, dropoff_address, dropoff_at, dropoff_timezone,
    daily_rate, days_count, total_price, paid_amount, deposit_amount,
    currency, payment_status, insurance, fuel_policy, mileage_policy,
    main_driver, company_phone
  )
  values (
    v_trip_id, 'Locadora Exemplo', 'Compacto com ar', 'Modelo popular ou similar', 'DEMO-CAR-31',
    'Aeroporto Salgado Filho', 'Av. Severo Dullius, 90010 — Porto Alegre, RS',
    (v_start::timestamp + time '11:30') at time zone v_tz, v_tz,
    'Aeroporto Salgado Filho', 'Av. Severo Dullius, 90010 — Porto Alegre, RS',
    (v_end::timestamp + time '16:00') at time zone v_tz, v_tz,
    180.00, 5, 900.00, 0, 2000.00,
    'BRL', 'unpaid', 'Proteção total', 'Devolver com o mesmo nível', 'Quilometragem livre',
    'Motorista Exemplo', '(51) 3000-0000'
  )
  returning id into v_car_id;

  -- --------------------------------------------------------------- Roteiro
  insert into public.itinerary_items
    (trip_id, place_id, day_date, starts_at, ends_at, timezone, title, category, address, cost, currency, status, position, created_by, notes)
  values
    -- Dia 1
    (v_trip_id, null, v_start, (v_start::timestamp + time '11:30') at time zone v_tz, (v_start::timestamp + time '13:30') at time zone v_tz, v_tz,
     'Viagem até Gramado', 'transport', 'Porto Alegre → Gramado', null, 'BRL', 'planned', 0, v_user_id,
     'Cerca de 2 horas de carro pela RS-235.'),
    (v_trip_id, v_rest_place, v_start, (v_start::timestamp + time '13:45') at time zone v_tz, null, v_tz,
     'Almoço no Restaurante da Colina', 'restaurant', 'R. São Pedro, 500 — Gramado, RS', 180.00, 'BRL', 'planned', 1, v_user_id, null),

    -- Dia 2
    (v_trip_id, v_cafe_place, v_start + 1, ((v_start + 1)::timestamp + time '09:30') at time zone v_tz, ((v_start + 1)::timestamp + time '11:00') at time zone v_tz, v_tz,
     'Café colonial', 'restaurant', 'Rod. RS-235, 4200 — Gramado, RS', 220.00, 'BRL', 'confirmed', 0, v_user_id,
     'Reserva para 2 pessoas.'),
    (v_trip_id, v_lago_place, v_start + 1, ((v_start + 1)::timestamp + time '11:30') at time zone v_tz, ((v_start + 1)::timestamp + time '13:00') at time zone v_tz, v_tz,
     'Lago Negro', 'attraction', 'R. A. J. Renner — Gramado, RS', 60.00, 'BRL', 'planned', 1, v_user_id,
     'Passeio de pedalinho custa por volta de R$ 30 por 20 minutos.'),
    (v_trip_id, v_igreja_place, v_start + 1, ((v_start + 1)::timestamp + time '15:00') at time zone v_tz, null, v_tz,
     'Catedral de Pedra', 'attraction', 'Av. Osvaldo Aranha, 419 — Canela, RS', null, 'BRL', 'planned', 2, v_user_id, null),

    -- Dia 3
    (v_trip_id, v_snow_place, v_start + 2, ((v_start + 2)::timestamp + time '10:00') at time zone v_tz, ((v_start + 2)::timestamp + time '14:00') at time zone v_tz, v_tz,
     'Parque de Neve', 'tour', 'Rod. RS-235, 9600 — Gramado, RS', 460.00, 'BRL', 'confirmed', 0, v_user_id,
     'Ingressos comprados com antecedência.'),
    (v_trip_id, null, v_start + 2, ((v_start + 2)::timestamp + time '16:30') at time zone v_tz, null, v_tz,
     'Rua Coberta e centrinho', 'shopping', 'R. Madre Verônica — Gramado, RS', null, 'BRL', 'planned', 1, v_user_id, null),
    (v_trip_id, v_rest_place, v_start + 2, ((v_start + 2)::timestamp + time '20:00') at time zone v_tz, null, v_tz,
     'Jantar', 'restaurant', 'R. São Pedro, 500 — Gramado, RS', 240.00, 'BRL', 'planned', 2, v_user_id, null),

    -- Dia 4
    (v_trip_id, null, v_start + 3, ((v_start + 3)::timestamp + time '10:00') at time zone v_tz, null, v_tz,
     'Vinícola no Vale dos Vinhedos', 'tour', 'Bento Gonçalves, RS', 320.00, 'BRL', 'planned', 0, v_user_id,
     'Cerca de 1h30 de carro desde Gramado.'),

    -- Sem dia definido
    (v_trip_id, null, null, null, null, v_tz,
     'Comprar chocolate para levar', 'shopping', null, null, 'BRL', 'planned', 0, v_user_id, null);

  -- ------------------------------------------------------------- Despesas
  insert into public.expenses
    (trip_id, description, category, planned_amount, actual_amount, currency, exchange_rate,
     payment_status, paid_amount, expense_date, due_date, payment_method, installments,
     paid_by_member_id, split_enabled, flight_id, accommodation_id, car_rental_id, created_by)
  values
    (v_trip_id, 'Passagens aéreas (ida e volta)', 'flights', 4400.00, 4400.00, 'BRL', 1,
     'paid', 4400.00, current_date - 30, null, 'Cartão de crédito', 6, v_member_id, true, v_flight_out, null, null, v_user_id),
    (v_trip_id, 'Hospedagem — Hotel Serra Encantada', 'accommodation', 2480.00, 2480.00, 'BRL', 1,
     'partial', 1240.00, null, v_start - 7, 'Pix', 1, v_member_id, true, null, v_stay_id, null, v_user_id),
    (v_trip_id, 'Aluguel de carro', 'car_rental', 900.00, 900.00, 'BRL', 1,
     'unpaid', 0, null, v_start, 'Cartão de crédito', 1, v_member_id, true, null, null, v_car_id, v_user_id),
    (v_trip_id, 'Ingressos do parque de neve', 'tickets', 500.00, 460.00, 'BRL', 1,
     'paid', 460.00, current_date - 10, null, 'Cartão de crédito', 1, v_member_id, true, null, null, null, v_user_id),
    (v_trip_id, 'Alimentação (estimativa)', 'food', 1200.00, null, 'BRL', 1,
     'unpaid', 0, null, null, null, 1, null, false, null, null, null, v_user_id),
    (v_trip_id, 'Combustível e pedágios', 'fuel', 400.00, null, 'BRL', 1,
     'unpaid', 0, null, null, null, 1, null, false, null, null, null, v_user_id);

  insert into public.expense_splits (expense_id, member_id, share_amount)
  select e.id, v_member_id, coalesce(e.actual_amount, e.planned_amount, 0)
    from public.expenses e
   where e.trip_id = v_trip_id and e.split_enabled;

  -- ------------------------------------------------------------- Checklist
  insert into public.checklists (trip_id, title, kind, position)
  values (v_trip_id, 'Antes da viagem', 'before_trip', 0)
  returning id into v_checklist;

  insert into public.checklist_items (checklist_id, title, is_done, position)
  values (v_checklist, 'Comprar passagem', true, 0),
         (v_checklist, 'Reservar hospedagem', true, 1),
         (v_checklist, 'Alugar carro', true, 2),
         (v_checklist, 'Comprar ingressos do parque', true, 3),
         (v_checklist, 'Contratar seguro viagem', false, 4),
         (v_checklist, 'Fazer check-in online', false, 5);

  insert into public.checklists (trip_id, title, kind, position)
  values (v_trip_id, 'Mala', 'packing', 1)
  returning id into v_checklist;

  insert into public.checklist_items (checklist_id, title, is_done, position)
  values (v_checklist, 'Documentos (RG e CNH)', false, 0),
         (v_checklist, 'Casaco e blusa de frio', false, 1),
         (v_checklist, 'Carregadores', false, 2),
         (v_checklist, 'Medicamentos de uso contínuo', false, 3),
         (v_checklist, 'Guarda-chuva', false, 4);

  -- -------------------------------------------------- Contatos e links
  insert into public.important_contacts (trip_id, label, kind, phone, address, reference_code, position)
  values (v_trip_id, 'Hotel Serra Encantada', 'accommodation', '(54) 3286-1000', 'Av. Borges de Medeiros, 2000 — Gramado, RS', 'DEMO-HTL-77', 0),
         (v_trip_id, 'Locadora Exemplo', 'car_rental', '(51) 3000-0000', 'Aeroporto Salgado Filho — Porto Alegre, RS', 'DEMO-CAR-31', 1),
         (v_trip_id, 'Seguro viagem (exemplo)', 'insurance', '0800 000 0000', null, 'APOLICE-DEMO-123', 2),
         (v_trip_id, 'Hospital de Gramado', 'hospital', '(54) 3286-0000', 'Rua São Pedro — Gramado, RS', null, 3);

  insert into public.quick_links (trip_id, label, url, category, position)
  values (v_trip_id, 'Check-in da companhia aérea', 'https://exemplo.com/check-in', 'airline', 0),
         (v_trip_id, 'Reserva do hotel', 'https://exemplo.com/reserva', 'accommodation', 1),
         (v_trip_id, 'Ingressos do parque', 'https://exemplo.com/ingressos', 'tickets', 2);

  return v_trip_id;
end;
$$;

comment on function public.seed_demo_trip(text) is
  'Cria uma viagem de demonstração com dados fictícios para o usuário informado.';
