'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireEditAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { checklistItemSchema, checklistSchema, contactSchema, quickLinkSchema } from '@/lib/validators/misc';

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function nextPosition(table: 'checklists' | 'important_contacts' | 'quick_links', tripId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);
  return count ?? 0;
}

// -----------------------------------------------------------------------------
// Checklists
// -----------------------------------------------------------------------------
export async function createChecklistAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('createChecklist:access', error));
  }

  const parsed = checklistSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('checklists')
    .insert({
      trip_id: tripId,
      title: parsed.data.title,
      kind: parsed.data.kind,
      position: await nextPosition('checklists', tripId),
    })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('createChecklist', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteChecklistAction(tripId: string, checklistId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteChecklist:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('checklists').delete().eq('id', checklistId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteChecklist', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function addChecklistItemAction(
  tripId: string,
  checklistId: string,
  title: string,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('addChecklistItem:access', error));
  }

  const parsed = checklistItemSchema.safeParse({ title, dueDate: '', assignedTo: '', notes: '' });
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const { count } = await supabase
    .from('checklist_items')
    .select('id', { count: 'exact', head: true })
    .eq('checklist_id', checklistId);

  const { data, error } = await supabase
    .from('checklist_items')
    .insert({ checklist_id: checklistId, title: parsed.data.title, position: count ?? 0 })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('addChecklistItem', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function toggleChecklistItemAction(
  tripId: string,
  itemId: string,
  isDone: boolean,
): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('toggleChecklistItem:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('checklist_items').update({ is_done: isDone }).eq('id', itemId);
  if (error) return failure(logAndFriendly('toggleChecklistItem', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function deleteChecklistItemAction(tripId: string, itemId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteChecklistItem:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('checklist_items').delete().eq('id', itemId);
  if (error) return failure(logAndFriendly('deleteChecklistItem', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

// -----------------------------------------------------------------------------
// Contatos importantes
// -----------------------------------------------------------------------------
export async function saveContactAction(
  tripId: string,
  contactId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('saveContact:access', error));
  }

  const parsed = contactSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const row = {
    label: parsed.data.label,
    kind: parsed.data.kind,
    phone: parsed.data.phone,
    email: parsed.data.email,
    address: parsed.data.address,
    reference_code: parsed.data.referenceCode,
    notes: parsed.data.notes,
  };

  if (contactId) {
    const { error } = await supabase
      .from('important_contacts')
      .update(row)
      .eq('id', contactId)
      .eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveContact:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: contactId });
  }

  const { data, error } = await supabase
    .from('important_contacts')
    .insert({ ...row, trip_id: tripId, position: await nextPosition('important_contacts', tripId) })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('saveContact:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteContactAction(tripId: string, contactId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteContact:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('important_contacts')
    .delete()
    .eq('id', contactId)
    .eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteContact', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

// -----------------------------------------------------------------------------
// Links rápidos
// -----------------------------------------------------------------------------
export async function saveQuickLinkAction(
  tripId: string,
  linkId: string | null,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('saveQuickLink:access', error));
  }

  const parsed = quickLinkSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();
  const row = { label: parsed.data.label, url: parsed.data.url, category: parsed.data.category };

  if (linkId) {
    const { error } = await supabase.from('quick_links').update(row).eq('id', linkId).eq('trip_id', tripId);
    if (error) return failure(logAndFriendly('saveQuickLink:update', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ id: linkId });
  }

  const { data, error } = await supabase
    .from('quick_links')
    .insert({ ...row, trip_id: tripId, position: await nextPosition('quick_links', tripId) })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('saveQuickLink:insert', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function deleteQuickLinkAction(tripId: string, linkId: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteQuickLink:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('quick_links').delete().eq('id', linkId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('deleteQuickLink', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}
