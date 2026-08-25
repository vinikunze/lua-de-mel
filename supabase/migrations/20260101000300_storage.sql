-- =============================================================================
-- Supabase Storage
--   trip-documents : PRIVADO. Vouchers, cartões de embarque, comprovantes.
--                    Acesso apenas por URL assinada gerada no servidor.
--   trip-covers    : público (somente imagens de capa escolhidas pelo usuário).
-- Convenção de caminho: <trip_id>/<uuid>-<nome-do-arquivo>
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-documents', 'trip-documents', false, 26214400,
  array['application/pdf','image/jpeg','image/png','image/webp','image/heic']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'trip-covers', 'trip-covers', true, 8388608,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Primeiro segmento do caminho = trip_id.
--
-- A função vive em `public` e não em `storage`: projetos Supabase recentes não
-- permitem criar objetos no schema `storage` (ele pertence ao
-- supabase_storage_admin). As políticas abaixo a referenciam normalmente.
create or replace function public.trip_id_from_path(p_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return (storage.foldername(p_name))[1]::uuid;
exception when others then
  return null;
end;
$$;

grant execute on function public.trip_id_from_path(text) to authenticated, anon;

-- -----------------------------------------------------------------------------
-- trip-documents
-- -----------------------------------------------------------------------------
drop policy if exists "trip_documents_select" on storage.objects;
create policy "trip_documents_select" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.is_trip_member(public.trip_id_from_path(name))
  );

drop policy if exists "trip_documents_insert" on storage.objects;
create policy "trip_documents_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-documents'
    and public.can_edit_trip(public.trip_id_from_path(name))
  );

drop policy if exists "trip_documents_update" on storage.objects;
create policy "trip_documents_update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.can_edit_trip(public.trip_id_from_path(name))
  );

drop policy if exists "trip_documents_delete" on storage.objects;
create policy "trip_documents_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-documents'
    and public.can_edit_trip(public.trip_id_from_path(name))
  );

-- -----------------------------------------------------------------------------
-- trip-covers (leitura pública, escrita restrita a editores)
-- -----------------------------------------------------------------------------
drop policy if exists "trip_covers_read" on storage.objects;
create policy "trip_covers_read" on storage.objects
  for select to public
  using (bucket_id = 'trip-covers');

drop policy if exists "trip_covers_insert" on storage.objects;
create policy "trip_covers_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'trip-covers'
    and public.can_edit_trip(public.trip_id_from_path(name))
  );

drop policy if exists "trip_covers_delete" on storage.objects;
create policy "trip_covers_delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'trip-covers'
    and public.can_edit_trip(public.trip_id_from_path(name))
  );
