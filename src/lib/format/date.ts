/**
 * Toda formatação e aritmética de data/hora do sistema passa por aqui.
 *
 * Regras:
 *  - Instantes são gravados como `timestamptz` (ISO 8601, UTC no banco).
 *  - Cada evento guarda também o fuso IANA do LOCAL onde ele acontece.
 *  - A exibição usa sempre o fuso do evento, nunca o do dispositivo.
 *  - Datas "sem hora" (day_date, check-in de uma diária) são strings YYYY-MM-DD
 *    e nunca passam por `new Date(str)` sem tratamento, para não deslocar o dia.
 */
import { APP } from '@/lib/config';

const LOCALE = APP.locale;

export type DateOnly = string; // YYYY-MM-DD

// -----------------------------------------------------------------------------
// Fuso horário
// -----------------------------------------------------------------------------

/** Deslocamento (ms) do fuso em relação ao UTC no instante informado. */
export function timezoneOffsetMs(timeZone: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? '0');
  const hour = get('hour') % 24; // 24 significa meia-noite em alguns runtimes
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converte "data + hora locais de um fuso" no instante absoluto correspondente.
 * Ex.: ('2027-08-04', '06:40', 'America/Cuiaba') -> 2027-08-04T10:40:00.000Z
 */
export function zonedToUtc(date: DateOnly, time: string, timeZone: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh = 0, mm = 0] = time.split(':').map(Number);
  const naive = Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh, mm, 0, 0);

  let offset = timezoneOffsetMs(timeZone, new Date(naive));
  let instant = naive - offset;
  // Segunda passada resolve as bordas de horário de verão.
  const refined = timezoneOffsetMs(timeZone, new Date(instant));
  if (refined !== offset) {
    offset = refined;
    instant = naive - offset;
  }
  return new Date(instant);
}

function partsInZone(value: Date | string, timeZone: string) {
  const date = typeof value === 'string' ? new Date(value) : value;
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const parts = dtf.formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? '';
  const hour = pick('hour') === '24' ? '00' : pick('hour');
  return {
    year: pick('year'),
    month: pick('month'),
    day: pick('day'),
    hour,
    minute: pick('minute'),
  };
}

/** Extrai a data (YYYY-MM-DD) que o instante representa no fuso informado. */
export function dateInZone(value: Date | string, timeZone: string): DateOnly {
  const p = partsInZone(value, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Extrai a hora (HH:mm) que o instante representa no fuso informado. */
export function timeInZone(value: Date | string, timeZone: string): string {
  const p = partsInZone(value, timeZone);
  return `${p.hour}:${p.minute}`;
}

/** Sigla do fuso (ex.: GMT-3) para deixar claro quando os fusos diferem. */
export function timezoneAbbreviation(timeZone: string, reference: Date = new Date()): string {
  try {
    const dtf = new Intl.DateTimeFormat('pt-BR', { timeZone, timeZoneName: 'shortOffset' });
    return dtf.formatToParts(reference).find((p) => p.type === 'timeZoneName')?.value ?? '';
  } catch {
    return '';
  }
}

/** Nome curto e legível de um fuso: "São Paulo (GMT-3)". */
export function timezoneLabel(timeZone: string): string {
  const city = timeZone.split('/').pop()?.replace(/_/g, ' ') ?? timeZone;
  const abbr = timezoneAbbreviation(timeZone);
  return abbr ? `${city} (${abbr})` : city;
}

// -----------------------------------------------------------------------------
// Datas sem hora (YYYY-MM-DD)
// -----------------------------------------------------------------------------

/** Interpreta YYYY-MM-DD como meio-dia UTC — imune a deslocamento de fuso. */
export function parseDateOnly(date: DateOnly): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, 12, 0, 0));
}

export function toDateOnly(date: Date): DateOnly {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`;
}

/** Data de hoje no fuso informado (padrão: fuso do dispositivo). */
export function todayInZone(timeZone?: string): DateOnly {
  const tz = timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? APP.defaultTimezone;
  return dateInZone(new Date(), tz);
}

export function addDaysToDateOnly(date: DateOnly, days: number): DateOnly {
  const d = parseDateOnly(date);
  d.setUTCDate(d.getUTCDate() + days);
  return toDateOnly(d);
}

/** Diferença em dias inteiros entre duas datas (b - a). */
export function daysBetween(a: DateOnly, b: DateOnly): number {
  const ms = parseDateOnly(b).getTime() - parseDateOnly(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Número de dias da viagem, contando início e fim. */
export function tripDayCount(start: DateOnly, end: DateOnly): number {
  return daysBetween(start, end) + 1;
}

/** Número de noites entre duas datas. */
export function nightsBetween(start: DateOnly, end: DateOnly): number {
  return Math.max(daysBetween(start, end), 0);
}

/** Lista de todas as datas de um intervalo, inclusive. */
export function eachDayInRange(start: DateOnly, end: DateOnly): DateOnly[] {
  const total = daysBetween(start, end);
  if (total < 0) return [];
  return Array.from({ length: total + 1 }, (_, i) => addDaysToDateOnly(start, i));
}

// -----------------------------------------------------------------------------
// Formatação (pt-BR)
// -----------------------------------------------------------------------------

/** DD/MM/YYYY */
export function formatDate(date: DateOnly | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? parseDateOnly(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(d);
}

/** 04 ago */
export function formatDayMonth(date: DateOnly | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', timeZone: 'UTC' })
    .format(parseDateOnly(date))
    .replace('.', '');
}

/** sexta-feira, 07 de agosto */
export function formatFullWeekday(date: DateOnly | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  }).format(parseDateOnly(date));
}

/** sex, 07 ago */
export function formatShortWeekday(date: DateOnly | null | undefined): string {
  if (!date) return '';
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  })
    .format(parseDateOnly(date))
    .replace(/\./g, '');
}

/** HH:mm no fuso do evento. */
export function formatTime(instant: string | Date | null | undefined, timeZone: string): string {
  if (!instant) return '';
  return timeInZone(instant, timeZone);
}

/** 04/08/2027 às 06:40 */
export function formatDateTime(instant: string | Date | null | undefined, timeZone: string): string {
  if (!instant) return '';
  const d = dateInZone(instant, timeZone);
  return `${formatDate(d)} às ${timeInZone(instant, timeZone)}`;
}

/** Intervalo compacto: "04 a 14 de agosto" ou "28 de julho a 03 de agosto". */
export function formatDateRange(start: DateOnly, end: DateOnly): string {
  const s = parseDateOnly(start);
  const e = parseDateOnly(end);
  const sameMonth = s.getUTCMonth() === e.getUTCMonth() && s.getUTCFullYear() === e.getUTCFullYear();
  const day = (d: Date) => String(d.getUTCDate()).padStart(2, '0');
  const monthName = (d: Date) =>
    new Intl.DateTimeFormat(LOCALE, { month: 'long', timeZone: 'UTC' }).format(d);

  if (sameMonth) return `${day(s)} a ${day(e)} de ${monthName(e)}`;
  const sameYear = s.getUTCFullYear() === e.getUTCFullYear();
  const left = `${day(s)} de ${monthName(s)}${sameYear ? '' : ` de ${s.getUTCFullYear()}`}`;
  return `${left} a ${day(e)} de ${monthName(e)}`;
}

/** "Faltam 73 dias", "Amanhã", "Hoje", "Há 4 dias". */
export function formatCountdown(target: DateOnly, from: DateOnly = todayInZone()): string {
  const diff = daysBetween(from, target);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff === -1) return 'Ontem';
  if (diff > 1) return `Faltam ${diff} dias`;
  return `Há ${Math.abs(diff)} dias`;
}

/** Duração legível a partir de segundos: "1 h 25 min". */
export function formatDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || !Number.isFinite(seconds)) return '';
  const total = Math.max(0, Math.round(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours === 0) return `${minutes} min`;
  if (minutes === 0) return `${hours} h`;
  return `${hours} h ${minutes} min`;
}

/** Duração de voo/trecho entre dois instantes. */
export function formatSpan(startIso: string | null, endIso: string | null): string {
  if (!startIso || !endIso) return '';
  return formatDuration((new Date(endIso).getTime() - new Date(startIso).getTime()) / 1000);
}

/** Diferença de dias entre a chegada e a partida (voos que "viram o dia"). */
export function dayShift(
  startIso: string,
  startZone: string,
  endIso: string,
  endZone: string,
): number {
  return daysBetween(dateInZone(startIso, startZone), dateInZone(endIso, endZone));
}

export function isWithinRange(date: DateOnly, start: DateOnly, end: DateOnly): boolean {
  return daysBetween(start, date) >= 0 && daysBetween(date, end) >= 0;
}

/** Fase da viagem em relação a hoje. */
export function tripPhase(
  start: DateOnly,
  end: DateOnly,
  today: DateOnly = todayInZone(),
): 'upcoming' | 'ongoing' | 'past' {
  if (daysBetween(today, start) > 0) return 'upcoming';
  if (daysBetween(today, end) >= 0) return 'ongoing';
  return 'past';
}

/** Valor pronto para <input type="datetime-local"> no fuso do evento. */
export function toLocalInputValue(instant: string | null | undefined, timeZone: string): string {
  if (!instant) return '';
  return `${dateInZone(instant, timeZone)}T${timeInZone(instant, timeZone)}`;
}
