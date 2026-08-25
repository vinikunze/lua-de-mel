-- =============================================================================
-- Endurecimento de segurança
--
-- Duas correções apontadas pelo linter do Supabase:
--
-- 1) O PostgreSQL concede EXECUTE a PUBLIC em toda função nova. Como o schema
--    `public` é exposto pela API REST, isso deixava funções internas — inclusive
--    as de gatilho — chamáveis por /rest/v1/rpc/... sem sequer estar logado.
--    Nenhuma delas era explorável (todas dependem de auth.uid() ou de contexto
--    de gatilho), mas superfície exposta sem motivo é superfície a menos.
--
-- 2) Funções sem `search_path` fixo podem, em tese, ser induzidas a resolver um
--    nome para um objeto plantado por outro schema. Fixamos o caminho e
--    qualificamos tudo explicitamente.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Funções de gatilho: ninguém deve chamá-las pela API.
--    Gatilhos não verificam EXECUTE do usuário, então revogar não os afeta.
-- -----------------------------------------------------------------------------
revoke all on function public.handle_new_user()             from public, anon, authenticated;
revoke all on function public.handle_new_trip()             from public, anon, authenticated;
revoke all on function public.set_updated_at()              from public, anon, authenticated;
revoke all on function public.guard_trip_owner_immutable()  from public, anon, authenticated;

-- -----------------------------------------------------------------------------
-- 2. Funções auxiliares de permissão: usadas dentro das políticas de RLS, que
--    são avaliadas como o usuário logado — por isso `authenticated` precisa do
--    EXECUTE. O papel `anon` não avalia nenhuma política que as chame.
-- -----------------------------------------------------------------------------
-- `anon` precisa ser citado à parte: o Supabase concede EXECUTE a ele por
-- privilégio padrão, então revogar de PUBLIC sozinho não basta.
revoke all on function public.trip_role(uuid)          from public, anon;
revoke all on function public.is_trip_member(uuid)     from public, anon;
revoke all on function public.can_edit_trip(uuid)      from public, anon;
revoke all on function public.is_trip_owner(uuid)      from public, anon;
revoke all on function public.trip_id_from_path(text)  from public, anon;

grant execute on function public.trip_role(uuid)          to authenticated;
grant execute on function public.is_trip_member(uuid)     to authenticated;
grant execute on function public.can_edit_trip(uuid)      to authenticated;
grant execute on function public.is_trip_owner(uuid)      to authenticated;
grant execute on function public.trip_id_from_path(text)  to authenticated;

-- -----------------------------------------------------------------------------
-- 3. RPCs chamadas pela aplicação. Continuam disponíveis para quem está logado —
--    cada uma valida a autorização por conta própria — mas não para anônimos.
-- -----------------------------------------------------------------------------
revoke all on function public.accept_trip_invite(uuid)                from public, anon;
revoke all on function public.get_invite_preview(uuid)                from public, anon;
revoke all on function public.transfer_trip_ownership(uuid, uuid)     from public, anon;
revoke all on function public.trip_financial_summary(uuid)            from public, anon;
revoke all on function public.reorder_itinerary_items(uuid, uuid[], date) from public, anon;

grant execute on function public.accept_trip_invite(uuid)                to authenticated;
grant execute on function public.get_invite_preview(uuid)                to authenticated;
grant execute on function public.transfer_trip_ownership(uuid, uuid)     to authenticated;
grant execute on function public.trip_financial_summary(uuid)            to authenticated;
grant execute on function public.reorder_itinerary_items(uuid, uuid[], date) to authenticated;

-- -----------------------------------------------------------------------------
-- 4. search_path fixo nas funções que ainda não tinham.
--    Tudo dentro delas já é qualificado por schema, então o caminho vazio basta.
-- -----------------------------------------------------------------------------
alter function public.set_updated_at()             set search_path = '';
alter function public.guard_trip_owner_immutable() set search_path = '';
alter function public.trip_id_from_path(text)      set search_path = '';

-- -----------------------------------------------------------------------------
-- 5. Novas funções em `public` não nascem mais executáveis por anônimos.
-- -----------------------------------------------------------------------------
alter default privileges in schema public revoke execute on functions from anon;
