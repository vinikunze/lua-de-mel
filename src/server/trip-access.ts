import 'server-only';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import { canEdit, isOwner } from '@/lib/permissions';
import type { MemberRole, TripRow } from '@/types/database';

export interface TripAccess {
  trip: TripRow;
  role: MemberRole;
  userId: string;
  canEdit: boolean;
  isOwner: boolean;
}

/**
 * Carrega a viagem verificando o papel do usuário.
 * O RLS já bloqueia no banco; isto evita chamadas inúteis e dá erros claros.
 */
export async function loadTripAccess(tripId: string): Promise<TripAccess> {
  const user = await getCurrentUser();
  if (!user) throw new ForbiddenError('Faça login para continuar.');

  const supabase = await createClient();

  const [{ data: trip, error }, { data: role }] = await Promise.all([
    supabase.from('trips').select('*').eq('id', tripId).maybeSingle(),
    supabase.rpc('trip_role', { p_trip_id: tripId }),
  ]);

  if (error) throw error;
  if (!trip) throw new NotFoundError('Viagem não encontrada ou sem acesso.');

  const memberRole = (role as MemberRole | null) ?? (trip.owner_id === user.id ? 'owner' : null);
  if (!memberRole) throw new ForbiddenError('Você não participa desta viagem.');

  return {
    trip,
    role: memberRole,
    userId: user.id,
    canEdit: canEdit(memberRole),
    isOwner: isOwner(memberRole),
  };
}

/** Igual ao anterior, mas exige permissão de escrita. */
export async function requireEditAccess(tripId: string): Promise<TripAccess> {
  const access = await loadTripAccess(tripId);
  if (!access.canEdit) {
    throw new ForbiddenError('Seu perfil nesta viagem permite apenas visualizar.');
  }
  return access;
}

export async function requireOwnerAccess(tripId: string): Promise<TripAccess> {
  const access = await loadTripAccess(tripId);
  if (!access.isOwner) {
    throw new ForbiddenError('Apenas o proprietário da viagem pode fazer isso.');
  }
  return access;
}
