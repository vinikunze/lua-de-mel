\set ON_ERROR_STOP on
\timing off

begin;

-- Cria três contas: dona, editora e uma completamente alheia à viagem.
insert into auth.users (id, email, raw_user_meta_data) values
  ('11111111-1111-1111-1111-111111111111', 'dona@exemplo.com',      '{"full_name":"Dona"}'),
  ('22222222-2222-2222-2222-222222222222', 'editora@exemplo.com',   '{"full_name":"Editora"}'),
  ('33333333-3333-3333-3333-333333333333', 'visualiza@exemplo.com', '{"full_name":"Visualizadora"}'),
  ('44444444-4444-4444-4444-444444444444', 'estranha@exemplo.com',  '{"full_name":"Estranha"}');

\echo '== 1. O trigger criou um profile para cada usuário?'
select count(*) as profiles_criados from public.profiles;

-- Cria a viagem como a dona.
select public.seed_demo_trip('dona@exemplo.com') as trip_id \gset

\echo '== 2. O seed criou a viagem completa?'
select
  (select count(*) from public.flights          where trip_id = :'trip_id') as voos,
  (select count(*) from public.accommodations   where trip_id = :'trip_id') as hospedagens,
  (select count(*) from public.car_rentals      where trip_id = :'trip_id') as carros,
  (select count(*) from public.itinerary_items  where trip_id = :'trip_id') as eventos,
  (select count(*) from public.places           where trip_id = :'trip_id') as locais,
  (select count(*) from public.expenses         where trip_id = :'trip_id') as despesas,
  (select count(*) from public.checklist_items ci
     join public.checklists c on c.id = ci.checklist_id where c.trip_id = :'trip_id') as itens_checklist;

\echo '== 3. O trigger tornou a dona proprietária automaticamente?'
select role, invite_status from public.trip_members where trip_id = :'trip_id';

\echo '== 4. Cada horário é exibido no relógio do seu próprio aeroporto?'
-- Ida: 06:40 em Cuiabá, chegando 10:35 em Porto Alegre.
-- Volta: 18:20 em Porto Alegre, chegando 21:10 em Cuiabá.
select
  origin_iata || ' → ' || destination_iata as trecho,
  to_char(departure_at at time zone origin_timezone, 'HH24:MI') as partida_no_local,
  to_char(arrival_at at time zone destination_timezone, 'HH24:MI') as chegada_no_local,
  to_char(arrival_at - departure_at, 'HH24"h"MI') as duracao_real
from public.flights where trip_id = :'trip_id' order by position;

-- Convida a editora e a visualizadora.
insert into public.trip_members (trip_id, user_id, role, invite_status, accepted_at)
values (:'trip_id', '22222222-2222-2222-2222-222222222222', 'editor', 'accepted', now()),
       (:'trip_id', '33333333-3333-3333-3333-333333333333', 'viewer', 'accepted', now());

-- A partir daqui, tudo roda com RLS ativo, como o aplicativo faz.
set role authenticated;

\echo ''
\echo '=========== RLS ==========='

select public.test_login('44444444-4444-4444-4444-444444444444');
\echo '== 5. Quem não participa NÃO enxerga a viagem (esperado: 0 em tudo)'
select
  (select count(*) from public.trips)             as viagens,
  (select count(*) from public.flights)           as voos,
  (select count(*) from public.accommodations)    as hospedagens,
  (select count(*) from public.itinerary_items)   as eventos,
  (select count(*) from public.expenses)          as despesas,
  (select count(*) from public.documents)         as documentos,
  (select count(*) from public.places)            as locais;

\echo '== 6. Quem não participa NÃO consegue inserir nada (esperado: erro)'
savepoint s1;
\set ON_ERROR_STOP off
insert into public.itinerary_items (trip_id, title) values (:'trip_id', 'Invasão');
\set ON_ERROR_STOP on
rollback to savepoint s1;

select public.test_login('33333333-3333-3333-3333-333333333333');
\echo '== 7. A visualizadora ENXERGA a viagem'
select count(*) as viagens_visiveis from public.trips;
select count(*) as eventos_visiveis from public.itinerary_items;

\echo '== 8. A visualizadora NÃO consegue criar evento (esperado: erro)'
savepoint s2;
\set ON_ERROR_STOP off
insert into public.itinerary_items (trip_id, title) values (:'trip_id', 'Não deveria entrar');
\set ON_ERROR_STOP on
rollback to savepoint s2;

\echo '== 9. A visualizadora NÃO consegue alterar a viagem (esperado: 0 linhas)'
update public.trips set name = 'Renomeada pela visualizadora' where id = :'trip_id';

\echo '== 10. A visualizadora NÃO consegue excluir despesa (esperado: 0 linhas)'
delete from public.expenses where trip_id = :'trip_id';

select public.test_login('22222222-2222-2222-2222-222222222222');
\echo '== 11. A editora CONSEGUE criar evento'
insert into public.itinerary_items (trip_id, title, day_date)
values (:'trip_id', 'Evento criado pela editora', current_date + 61);
select count(*) as eventos_apos_insercao from public.itinerary_items;

\echo '== 12. A editora NÃO consegue convidar participantes (esperado: erro)'
savepoint s3;
\set ON_ERROR_STOP off
insert into public.trip_members (trip_id, invited_email, role)
values (:'trip_id', 'outra@exemplo.com', 'editor');
\set ON_ERROR_STOP on
rollback to savepoint s3;

\echo '== 13. A editora NÃO consegue excluir a viagem (esperado: 0 linhas)'
delete from public.trips where id = :'trip_id';

select public.test_login('11111111-1111-1111-1111-111111111111');
\echo '== 14. A dona CONSEGUE convidar'
insert into public.trip_members (trip_id, invited_email, role, invite_status)
values (:'trip_id', 'convidada@exemplo.com', 'viewer', 'pending')
returning invite_token as token \gset

\echo '== 15. owner_id é imutável por UPDATE direto (esperado: erro)'
savepoint s4;
\set ON_ERROR_STOP off
update public.trips set owner_id = '44444444-4444-4444-4444-444444444444' where id = :'trip_id';
\set ON_ERROR_STOP on
rollback to savepoint s4;

\echo '== 16. Resumo financeiro calculado no banco'
select * from public.trip_financial_summary(:'trip_id');

\echo '== 17. Um convite endereçado a outro e-mail NÃO pode ser aceito (esperado: erro)'
select public.test_login('44444444-4444-4444-4444-444444444444');
savepoint s5;
\set ON_ERROR_STOP off
select public.accept_trip_invite(:'token');
\set ON_ERROR_STOP on
rollback to savepoint s5;

\echo '== 18. Storage: quem não participa não vê o documento (esperado: 0)'
reset role;
insert into storage.buckets (id, name, public) values ('x', 'x', false) on conflict do nothing;
insert into storage.objects (bucket_id, name) values ('trip-documents', :'trip_id' || '/voucher-demo.pdf');
set role authenticated;
select public.test_login('44444444-4444-4444-4444-444444444444');
select count(*) as documentos_visiveis_estranha from storage.objects;
select public.test_login('33333333-3333-3333-3333-333333333333');
select count(*) as documentos_visiveis_participante from storage.objects;

\echo '== 19. Reordenar o roteiro respeita as permissões'
select public.test_login('22222222-2222-2222-2222-222222222222');
select public.reorder_itinerary_items(
  :'trip_id',
  array(select id from public.itinerary_items where trip_id = :'trip_id' and day_date = current_date + 61 order by position),
  (current_date + 61)::date
);
select count(*) as reordenados from public.itinerary_items where trip_id = :'trip_id' and day_date = current_date + 61;

reset role;
\echo ''
\echo '== 20. Exclusão em cascata: apagar a viagem limpa tudo'
delete from public.trips where id = :'trip_id';
select
  (select count(*) from public.flights)          as voos_restantes,
  (select count(*) from public.itinerary_items)  as eventos_restantes,
  (select count(*) from public.expenses)         as despesas_restantes,
  (select count(*) from public.trip_members)     as membros_restantes,
  (select count(*) from public.checklist_items)  as itens_restantes;

rollback;
