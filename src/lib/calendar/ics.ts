/**
 * Geração de arquivo .ics (RFC 5545).
 *
 * Permite levar a viagem para qualquer calendário — Google, Apple, Outlook —
 * sem depender de integração OAuth com nenhum deles.
 */
import type { TripEvent } from '@/lib/domain/timeline';

const CRLF = '\r\n';

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** Linhas de conteúdo têm limite de 75 octetos; dobramos com um espaço à frente. */
function fold(line: string): string {
  if (line.length <= 75) return line;
  const parts: string[] = [];
  let remaining = line;
  parts.push(remaining.slice(0, 75));
  remaining = remaining.slice(75);
  while (remaining.length > 0) {
    parts.push(` ${remaining.slice(0, 74)}`);
    remaining = remaining.slice(74);
  }
  return parts.join(CRLF);
}

function toUtcStamp(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function toDateStamp(dateOnly: string): string {
  return dateOnly.replace(/-/g, '');
}

export function buildIcsCalendar(tripName: string, events: TripEvent[]): string {
  const now = toUtcStamp(new Date().toISOString());

  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Nossa Viagem//Roteiro//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(tripName)}`,
    'X-WR-TIMEZONE:UTC',
  ];

  for (const event of events) {
    if (!event.startsAt && !event.dayDate) continue;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${event.id}@nossa-viagem`);
    lines.push(`DTSTAMP:${now}`);

    if (event.startsAt) {
      const end = event.endsAt ?? new Date(new Date(event.startsAt).getTime() + 3_600_000).toISOString();
      lines.push(`DTSTART:${toUtcStamp(event.startsAt)}`);
      lines.push(`DTEND:${toUtcStamp(end)}`);
    } else if (event.dayDate) {
      const next = new Date(`${event.dayDate}T12:00:00Z`);
      next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${toDateStamp(event.dayDate)}`);
      lines.push(`DTEND;VALUE=DATE:${toDateStamp(next.toISOString().slice(0, 10))}`);
    }

    lines.push(`SUMMARY:${escapeText(event.title)}`);
    if (event.address) lines.push(`LOCATION:${escapeText(event.address)}`);

    const description = [
      event.subtitle,
      event.reservationCode ? `Reserva: ${event.reservationCode}` : null,
      event.phone ? `Telefone: ${event.phone}` : null,
      event.notes,
    ]
      .filter(Boolean)
      .join('\n');
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);

    if (event.latitude != null && event.longitude != null) {
      lines.push(`GEO:${event.latitude};${event.longitude}`);
    }

    lines.push(`CATEGORIES:${escapeText(event.category)}`);
    lines.push(event.status === 'cancelled' ? 'STATUS:CANCELLED' : 'STATUS:CONFIRMED');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}
