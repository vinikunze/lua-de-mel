/**
 * Detecção de problemas simples no roteiro.
 *
 * Regra fundamental: nunca alteramos horários automaticamente. Apenas avisamos —
 * quem decide é o viajante, que pode ter um motivo que o sistema desconhece.
 */
import type { TripEvent } from '@/lib/domain/timeline';
import { formatDuration } from '@/lib/format/date';
import { formatDistance } from '@/lib/format/distance';

export interface TravelEstimate {
  fromEventId: string;
  toEventId: string;
  distanceMeters: number;
  durationSeconds: number;
  travelMode: string;
}

export type ItineraryWarning =
  | { kind: 'tight_transfer'; eventId: string; message: string; severity: 'warning' | 'danger' }
  | { kind: 'overlap'; eventId: string; message: string; severity: 'warning' }
  | { kind: 'out_of_range'; eventId: string; message: string; severity: 'warning' };

const MINUTE = 60;

/**
 * Compara o intervalo entre dois eventos com o tempo estimado de deslocamento.
 * Ex.: evento termina 14:00, próximo começa 14:05, deslocamento de 25 min → avisa.
 */
export function detectItineraryWarnings(
  dayEvents: TripEvent[],
  estimates: TravelEstimate[],
): ItineraryWarning[] {
  const warnings: ItineraryWarning[] = [];
  const timed = dayEvents.filter((e) => e.startsAt);

  for (let i = 0; i < timed.length - 1; i += 1) {
    const current = timed[i];
    const next = timed[i + 1];
    if (!current.startsAt || !next.startsAt) continue;

    const currentEnd = new Date(current.endsAt ?? current.startsAt).getTime();
    const nextStart = new Date(next.startsAt).getTime();
    const gapSeconds = (nextStart - currentEnd) / 1000;

    if (gapSeconds < 0) {
      warnings.push({
        kind: 'overlap',
        eventId: next.id,
        severity: 'warning',
        message: `Este evento começa antes de "${current.title}" terminar.`,
      });
      continue;
    }

    const estimate = estimates.find(
      (e) => e.fromEventId === current.id && e.toEventId === next.id,
    );
    if (!estimate) continue;

    if (estimate.durationSeconds > gapSeconds) {
      const missing = estimate.durationSeconds - gapSeconds;
      warnings.push({
        kind: 'tight_transfer',
        eventId: next.id,
        severity: missing > 15 * MINUTE ? 'danger' : 'warning',
        message:
          `Atenção: o deslocamento estimado é de ${formatDuration(estimate.durationSeconds)} ` +
          `(${formatDistance(estimate.distanceMeters)}) e há apenas ${formatDuration(gapSeconds)} entre os eventos. ` +
          'Este horário pode não ser suficiente.',
      });
    }
  }

  return warnings;
}

/** Eventos fora do intervalo da viagem. */
export function detectOutOfRange(
  events: TripEvent[],
  startDate: string,
  endDate: string,
): ItineraryWarning[] {
  return events
    .filter((e) => e.dayDate && (e.dayDate < startDate || e.dayDate > endDate))
    .map((e) => ({
      kind: 'out_of_range' as const,
      eventId: e.id,
      severity: 'warning' as const,
      message: 'Este evento está fora do período da viagem.',
    }));
}

export function warningsFor(warnings: ItineraryWarning[], eventId: string): ItineraryWarning[] {
  return warnings.filter((w) => w.eventId === eventId);
}
