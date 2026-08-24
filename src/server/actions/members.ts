'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { loadTripAccess, requireOwnerAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { inviteSchema } from '@/lib/validators/misc';
import { appUrl } from '@/lib/env';
import type { MemberRole } from '@/types/database';

export function inviteUrl(token: string): string {
  return `${appUrl()}/convite/${token}`;
}

/**
 * Convida alguém para a viagem.
 *
 * Criamos o registro pendente com um token e devolvemos o link para o
 * proprietário compartilhar. Não dependemos de envio de e-mail: funciona em
 * qualquer ambiente, e o link só serve para o e-mail convidado.
 */
export async function inviteMemberAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ link: string; email: string }>> {
  let userId: string | undefined;
  try {
    const access = await requireOwnerAccess(tripId);
    userId = access.userId;
  } catch (error) {
    return failure(logAndFriendly('inviteMember:access', error));
  }

  const parsed = inviteSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return zodFailure(parsed.error);

  const supabase = await createClient();

  // Já existe alguém com esse e-mail na viagem?
  const { data: existing } = await supabase
    .from('trip_members')
    .select('id, invite_token, invite_status, invited_email, user_id')
    .eq('trip_id', tripId)
    .ilike('invited_email', parsed.data.email)
    .maybeSingle();

  if (existing) {
    if (existing.invite_status === 'accepted') {
      return failure('Esta pessoa já participa da viagem.', { email: 'Já é participante.' });
    }
    // Reativa um convite cancelado em vez de criar outro.
    const { error } = await supabase
      .from('trip_members')
      .update({ invite_status: 'pending', role: parsed.data.role, display_name: parsed.data.displayName })
      .eq('id', existing.id);
    if (error) return failure(logAndFriendly('inviteMember:reactivate', error));
    revalidatePath(`/viagens/${tripId}`, 'layout');
    return success({ link: inviteUrl(existing.invite_token), email: parsed.data.email });
  }

  const { data, error } = await supabase
    .from('trip_members')
    .insert({
      trip_id: tripId,
      invited_email: parsed.data.email,
      display_name: parsed.data.displayName,
      role: parsed.data.role,
      invite_status: 'pending',
      invited_by: userId ?? null,
    })
    .select('invite_token')
    .single();

  if (error || !data) return failure(logAndFriendly('inviteMember:insert', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ link: inviteUrl(data.invite_token), email: parsed.data.email });
}

export async function updateMemberRoleAction(
  tripId: string,
  memberId: string,
  role: MemberRole,
): Promise<ActionResult<null>> {
  try {
    await requireOwnerAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('updateMemberRole:access', error));
  }

  if (role === 'owner') {
    return failure('Para transferir a viagem, use a opção de transferir propriedade.');
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('id', memberId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!member) return failure('Participante não encontrado.');
  if (member.role === 'owner') return failure('O proprietário não pode ter o papel alterado.');

  const { error } = await supabase
    .from('trip_members')
    .update({ role })
    .eq('id', memberId)
    .eq('trip_id', tripId);

  if (error) return failure(logAndFriendly('updateMemberRole', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function removeMemberAction(tripId: string, memberId: string): Promise<ActionResult<null>> {
  try {
    await requireOwnerAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('removeMember:access', error));
  }

  const supabase = await createClient();
  const { data: member } = await supabase
    .from('trip_members')
    .select('role')
    .eq('id', memberId)
    .eq('trip_id', tripId)
    .maybeSingle();

  if (!member) return failure('Participante não encontrado.');
  if (member.role === 'owner') return failure('O proprietário não pode ser removido da viagem.');

  const { error } = await supabase.from('trip_members').delete().eq('id', memberId).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('removeMember', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function revokeInviteAction(tripId: string, memberId: string): Promise<ActionResult<null>> {
  try {
    await requireOwnerAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('revokeInvite:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from('trip_members')
    .update({ invite_status: 'revoked' })
    .eq('id', memberId)
    .eq('trip_id', tripId)
    .neq('role', 'owner');

  if (error) return failure(logAndFriendly('revokeInvite', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

export async function transferOwnershipAction(
  tripId: string,
  newOwnerUserId: string,
): Promise<ActionResult<null>> {
  try {
    await requireOwnerAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('transferOwnership:access', error));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc('transfer_trip_ownership', {
    p_trip_id: tripId,
    p_new_owner: newOwnerUserId,
  });

  if (error) return failure(logAndFriendly('transferOwnership', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/** Sai de uma viagem da qual se participa (não vale para o proprietário). */
export async function leaveTripAction(tripId: string): Promise<ActionResult<null>> {
  let access;
  try {
    access = await loadTripAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('leaveTrip:access', error));
  }

  if (access.isOwner) {
    return failure('O proprietário não pode sair. Transfira a viagem ou exclua-a.');
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('trip_members')
    .delete()
    .eq('trip_id', tripId)
    .eq('user_id', access.userId);

  if (error) return failure(logAndFriendly('leaveTrip', error));
  revalidatePath('/', 'layout');
  return success(null);
}

/** Aceita um convite a partir do token do link. */
export async function acceptInviteAction(token: string): Promise<ActionResult<{ tripId: string }>> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('accept_trip_invite', { p_token: token });

  if (error) return failure(logAndFriendly('acceptInvite', error));
  if (!data) return failure('Não foi possível aceitar o convite.');

  revalidatePath('/', 'layout');
  return success({ tripId: data as string });
}
