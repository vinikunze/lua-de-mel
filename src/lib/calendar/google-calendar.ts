/**
 * Integração opcional com o Google Calendar.
 *
 * Usamos o link "TEMPLATE" público: o usuário clica, revisa e salva no próprio
 * calendário. Não exige OAuth, não guarda token e não é pré-requisito para nada —
 * o sistema tem calendário próprio.
 */
import type { TripEvent } from '@/lib/domain/timeline';

function toCompactUtc(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** Data no formato de evento de dia inteiro (YYYYMMDD). */
function toCompactDate(dateOnly: string): string {
  return dateOnly.replace(/-/g, '');
}

export function buildGoogleCalendarUrl(event: {
  title: string;
  startsAt?: string | null;
  endsAt?: string | null;
  dayDate?: string | null;
  address?: string | null;
  description?: string | null;
  timezone?: string;
}): string | null {
  if (!event.startsAt && !event.dayDate) return null;

  const params = new URLSearchParams({ action: 'TEMPLATE', text: event.title });

  if (event.startsAt) {
    // Sem horário de término, assume uma hora de duração.
    const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 3_600_000).toISOString();
    params.set('dates', `${toCompactUtc(event.startsAt)}/${toCompactUtc(end)}`);
    if (event.timezone) params.set('ctz', event.timezone);
  } else if (event.dayDate) {
    const next = new Date(`${event.dayDate}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    params.set('dates', `${toCompactDate(event.dayDate)}/${toCompactDate(next.toISOString().slice(0, 10))}`);
  }

  if (event.address) params.set('location', event.address);
  if (event.description) params.set('details', event.description);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function googleCalendarUrlForEvent(event: TripEvent): string | null {
  return buildGoogleCalendarUrl({
    title: event.title,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    dayDate: event.dayDate,
    address: event.address,
    description: [event.notes, event.reservationCode ? `Reserva: ${event.reservationCode}` : null]
      .filter(Boolean)
      .join('\n'),
    timezone: event.timezone,
  });
}
