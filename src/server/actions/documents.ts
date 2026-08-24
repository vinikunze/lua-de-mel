'use server';

import { revalidatePath } from 'next/cache';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { loadTripAccess, requireEditAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { ALLOWED_DOCUMENT_TYPES, documentMetaSchema } from '@/lib/validators/misc';
import { DOCUMENT_BUCKET, MAX_DOCUMENT_SIZE_BYTES } from '@/lib/config';
import { slugify } from '@/lib/utils';

/** Caminho no bucket: <trip_id>/<uuid>-<nome>. O RLS do Storage usa a primeira pasta. */
function storagePath(tripId: string, fileName: string): string {
  const extension = fileName.includes('.') ? fileName.split('.').pop() : null;
  const base = slugify(fileName.replace(/\.[^.]+$/, '')).slice(0, 60) || 'documento';
  return `${tripId}/${crypto.randomUUID()}-${base}${extension ? `.${extension.toLowerCase()}` : ''}`;
}

export async function uploadDocumentAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  let userId: string | undefined;
  try {
    const access = await requireEditAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('uploadDocument:access', error));
  }

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return failure('Escolha um arquivo para enviar.', { file: 'Escolha um arquivo.' });
  }

  if (file.size > MAX_DOCUMENT_SIZE_BYTES) {
    return failure('Arquivo muito grande. O limite é de 25 MB.', { file: 'Máximo de 25 MB.' });
  }

  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type as (typeof ALLOWED_DOCUMENT_TYPES)[number])) {
    return failure('Formato não aceito. Envie PDF, JPG, PNG ou WebP.', {
      file: 'Use PDF, JPG, PNG ou WebP.',
    });
  }

  const parsed = documentMetaSchema.safeParse({
    name: String(formData.get('name') ?? '').trim() || file.name,
    category: formData.get('category') ?? 'other',
    flightId: formData.get('flightId') ?? '',
    accommodationId: formData.get('accommodationId') ?? '',
    carRentalId: formData.get('carRentalId') ?? '',
    itineraryItemId: formData.get('itineraryItemId') ?? '',
  });
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const path = storagePath(tripId, file.name);

  const { error: uploadError } = await supabase.storage.from(DOCUMENT_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) return failure(logAndFriendly('uploadDocument:storage', uploadError));

  const { data, error } = await supabase
    .from('documents')
    .insert({
      trip_id: tripId,
      name: parsed.data.name,
      category: parsed.data.category,
      storage_path: path,
      mime_type: file.type,
      size_bytes: file.size,
      flight_id: parsed.data.flightId,
      accommodation_id: parsed.data.accommodationId,
      car_rental_id: parsed.data.carRentalId,
      itinerary_item_id: parsed.data.itineraryItemId,
      uploaded_by: userId ?? null,
    })
    .select('id')
    .single();

  if (error || !data) {
    // Não deixa arquivo órfão no bucket se o registro falhar.
    await supabase.storage.from(DOCUMENT_BUCKET).remove([path]);
    return failure(logAndFriendly('uploadDocument:insert', error));
  }

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function renameDocumentAction(
  tripId: string,
  documentId: string,
  name: string,
  category: string,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('renameDocument:access', error));
  }

  const parsed = documentMetaSchema.safeParse({ name, category });
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase
    .from('documents')
    .update({ name: parsed.data.name, category: parsed.data.category })
    .eq('id', documentId)
    .eq('trip_id', tripId);

  if (error) return failure(logAndFriendly('renameDocument', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function deleteDocumentAction(tripId: string, documentId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteDocument:access', error));
  }

  const supabase = await createClient();
  const { data: document } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', documentId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!document) return failure('Documento não encontrado.');

  const { error } = await supabase.from('documents').delete().eq('id', documentId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteDocument', error));

  const { error: storageError } = await supabase.storage.from(DOCUMENT_BUCKET).remove([document.storage_path]);
  if (storageError) console.error('[deleteDocument:storage]', storageError);

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/**
 * URL assinada e temporária para visualizar ou baixar um documento.
 * O bucket é privado: sem este passo, nem o link direto funciona.
 */
export async function getDocumentUrlAction(
  tripId: string,
  documentId: string,
  options: { download?: boolean; expiresIn?: number } = {},
): Promise<ActionResult<{ url: string }>> {
  try {
    await loadTripAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('getDocumentUrl:access', error));
  }

  const user = await getCurrentUser();
  if (!user) return failure('Sessão expirada.');

  const supabase = await createClient();
  const { data: document } = await supabase
    .from('documents')
    .select('storage_path, name')
    .eq('id', documentId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!document) return failure('Documento não encontrado.');

  const { data, error } = await supabase.storage
    .from(DOCUMENT_BUCKET)
    .createSignedUrl(document.storage_path, options.expiresIn ?? 300, {
      download: options.download ? document.name : undefined,
    });

  if (error || !data) return failure(logAndFriendly('getDocumentUrl:sign', error));
  return success({ url: data.signedUrl });
}
