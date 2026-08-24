'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { loadTripAccess, requireEditAccess, requireOwnerAccess } from '@/server/trip-access';
import { failure, success, zodFailure, type ActionResult } from '@/server/action-result';
import { logAndFriendly } from '@/lib/errors';
import { destinationSchema, tripSchema } from '@/lib/validators/trip';
import { toDateOnly, todayInZone, tripPhase } from '@/lib/format/date';

function values(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

const DEFAULT_CHECKLISTS = [
  {
    title: 'Antes da viagem',
    kind: 'before_trip' as const,
    items: [
      'Comprar passagem',
      'Reservar hospedagem',
      'Alugar carro',
      'Comprar ingressos',
      'Contratar seguro viagem',
      'Fazer check-in online',
    ],
  },
  {
    title: 'Mala',
    kind: 'packing' as const,
    items: [
      'Documentos (RG, CNH, passaporte)',
      'Roupas',
      'Carregadores e cabos',
      'Medicamentos',
      'Itens de higiene pessoal',
    ],
  },
];

export async function createTripAction(_prev: unknown, formData: FormData): Promise<ActionResult<{ tripId: string }>> {
  const parsed = tripSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  const user = await getCurrentUser();
  if (!user) return failure('Sessão expirada. Entre novamente.');

  const supabase = await createClient();
  const input = parsed.data;

  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      owner_id: user.id,
      name: input.name,
      description: input.description,
      destination_label: input.destinationLabel,
      start_date: input.startDate,
      end_date: input.endDate,
      travelers_count: input.travelersCount,
      base_currency: input.baseCurrency,
      estimated_budget: input.estimatedBudget,
      cover_image_url: input.coverImageUrl,
      timezone: input.timezone,
      status: input.status,
      notes: input.notes,
    })
    .select('id')
    .single();

  if (error || !trip) return failure(logAndFriendly('createTrip', error));

  // Cidades informadas no cadastro viram destinos.
  const cities = String(formData.get('cities') ?? '')
    .split(',')
    .map((c) => c.trim())
    .filter(Boolean)
    .slice(0, 12);
  const country = String(formData.get('country') ?? '').trim() || null;

  if (cities.length > 0) {
    await supabase.from('destinations').insert(
      cities.map((city, index) => ({ trip_id: trip.id, city, country, position: index })),
    );
  }

  // Listas iniciais para a viagem já nascer útil.
  for (const [index, list] of DEFAULT_CHECKLISTS.entries()) {
    const { data: checklist } = await supabase
      .from('checklists')
      .insert({ trip_id: trip.id, title: list.title, kind: list.kind, position: index })
      .select('id')
      .single();
    if (checklist) {
      await supabase.from('checklist_items').insert(
        list.items.map((title, i) => ({ checklist_id: checklist.id, title, position: i })),
      );
    }
  }

  revalidatePath('/', 'layout');
  return success({ tripId: trip.id });
}

export async function updateTripAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ saved: true }>> {
  const parsed = tripSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('updateTrip:access', error));
  }

  const supabase = await createClient();
  const input = parsed.data;

  const { error } = await supabase
    .from('trips')
    .update({
      name: input.name,
      description: input.description,
      destination_label: input.destinationLabel,
      start_date: input.startDate,
      end_date: input.endDate,
      travelers_count: input.travelersCount,
      base_currency: input.baseCurrency,
      estimated_budget: input.estimatedBudget,
      cover_image_url: input.coverImageUrl,
      timezone: input.timezone,
      status: input.status,
      notes: input.notes,
    })
    .eq('id', tripId);

  if (error) return failure(logAndFriendly('updateTrip', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  revalidatePath('/');
  return success({ saved: true });
}

export async function deleteTripAction(tripId: string): Promise<ActionResult<{ deleted: true }>> {
  try {
    await requireOwnerAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('deleteTrip:access', error));
  }

  const supabase = await createClient();
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) return failure(logAndFriendly('deleteTrip', error));

  revalidatePath('/', 'layout');
  return success({ deleted: true });
}

export async function deleteTripAndRedirect(tripId: string) {
  const result = await deleteTripAction(tripId);
  if (!result.ok) redirect(`/viagens/${tripId}/configuracoes?erro=${encodeURIComponent(result.error)}`);
  redirect('/viagens');
}

/**
 * Mantém o status coerente com as datas quando o usuário não definiu manualmente.
 * Chamado ao abrir a viagem — barato e evita status "Planejando" numa viagem
 * que já aconteceu.
 */
export async function syncTripStatus(tripId: string): Promise<void> {
  try {
    const { trip, canEdit } = await loadTripAccess(tripId);
    if (!canEdit) return;
    if (trip.status === 'cancelled') return;

    const phase = tripPhase(trip.start_date, trip.end_date, todayInZone(trip.timezone));
    const target =
      phase === 'ongoing' ? 'ongoing' : phase === 'past' ? 'completed' : trip.status === 'ongoing' ? 'confirmed' : null;

    if (!target || target === trip.status) return;
    if (phase === 'upcoming' && trip.status !== 'ongoing') return;

    const supabase = await createClient();
    await supabase.from('trips').update({ status: target }).eq('id', tripId);
  } catch (error) {
    console.error('[syncTripStatus]', error);
  }
}

export async function addDestinationAction(
  tripId: string,
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const parsed = destinationSchema.safeParse(values(formData));
  if (!parsed.success) return zodFailure(parsed.error);

  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('addDestination:access', error));
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from('destinations')
    .select('id', { count: 'exact', head: true })
    .eq('trip_id', tripId);

  const { data, error } = await supabase
    .from('destinations')
    .insert({
      trip_id: tripId,
      city: parsed.data.city,
      state: parsed.data.state,
      country: parsed.data.country,
      place_id: parsed.data.placeId,
      latitude: parsed.data.latitude ?? null,
      longitude: parsed.data.longitude ?? null,
      position: count ?? 0,
    })
    .select('id')
    .single();

  if (error || !data) return failure(logAndFriendly('addDestination', error));

  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success({ id: data.id });
}

export async function removeDestinationAction(tripId: string, id: string): Promise<ActionResult<null>> {
  try {
    await requireEditAccess(tripId);
  } catch (error) {
    return failure(logAndFriendly('removeDestination:access', error));
  }
  const supabase = await createClient();
  const { error } = await supabase.from('destinations').delete().eq('id', id).eq('trip_id', tripId);
  if (error) return failure(logAndFriendly('removeDestination', error));
  revalidatePath(`/viagens/${tripId}`, 'layout');
  return success(null);
}

/** Duplica uma viagem como base para outra (mantém estrutura, zera reservas). */
export async function duplicateTripAction(tripId: string): Promise<ActionResult<{ tripId: string }>> {
  try {
    const { trip } = await loadTripAccess(tripId);
    const user = await getCurrentUser();
    if (!user) return failure('Sessão expirada.');

    const supabase = await createClient();
    const spanDays = Math.round(
      (new Date(`${trip.end_date}T12:00:00Z`).getTime() - new Date(`${trip.start_date}T12:00:00Z`).getTime()) /
        86_400_000,
    );
    const start = new Date();
    start.setUTCDate(start.getUTCDate() + 30);
    const end = new Date(start);
    end.setUTCDate(end.getUTCDate() + spanDays);

    const { data, error } = await supabase
      .from('trips')
      .insert({
        owner_id: user.id,
        name: `${trip.name} (cópia)`,
        description: trip.description,
        destination_label: trip.destination_label,
        start_date: toDateOnly(start),
        end_date: toDateOnly(end),
        travelers_count: trip.travelers_count,
        base_currency: trip.base_currency,
        estimated_budget: trip.estimated_budget,
        timezone: trip.timezone,
        status: 'planning',
      })
      .select('id')
      .single();

    if (error || !data) return failure(logAndFriendly('duplicateTrip', error));
    revalidatePath('/viagens');
    return success({ tripId: data.id });
  } catch (error) {
    return failure(logAndFriendly('duplicateTrip', error));
  }
}
