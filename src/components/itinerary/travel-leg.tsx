'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Bike, Bus, Car, Footprints, Loader2, RefreshCw, Route } from 'lucide-react';
import { useRouteLeg, type LegPoint } from '@/hooks/use-route-leg';
import { formatDuration } from '@/lib/format/date';
import { formatDistance } from '@/lib/format/distance';
import { cn } from '@/lib/utils';
import type { TravelMode } from '@/types/database';

const MODES: Array<{ value: TravelMode; label: string; icon: typeof Car }> = [
  { value: 'DRIVE', label: 'Carro', icon: Car },
  { value: 'WALK', label: 'A pé', icon: Footprints },
  { value: 'TRANSIT', label: 'Transporte', icon: Bus },
  { value: 'BICYCLE', label: 'Bicicleta', icon: Bike },
];

/**
 * Tempo de deslocamento entre dois eventos do roteiro.
 *
 * Calcula sob demanda e reaproveita o cache do servidor. Quando a resposta
 * indica que o tempo não cabe no intervalo entre os eventos, mostramos o aviso —
 * sem nunca alterar horários por conta própria.
 */
export function TravelLeg({
  tripId,
  origin,
  destination,
  gapSeconds,
  autoLoad = false,
  available = true,
}: {
  tripId: string;
  origin: LegPoint;
  destination: LegPoint;
  gapSeconds: number | null;
  autoLoad?: boolean;
  available?: boolean;
}) {
  const { state, compute } = useRouteLeg(tripId);
  const [mode, setMode] = useState<TravelMode>('DRIVE');
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (autoLoad && available && state.status === 'idle') {
      void compute(origin, destination, { travelMode: mode });
    }
    // Uma única tentativa automática por trecho.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoad, available]);

  if (!available) return null;

  const tight =
    state.status === 'ready' && gapSeconds !== null && state.result.durationSeconds > gapSeconds;

  return (
    <div className="relative pl-[3.25rem]">
      <span className="absolute left-[1.4rem] top-0 h-full w-px bg-line" aria-hidden />

      <div className="flex flex-wrap items-center gap-2 py-2">
        {state.status === 'idle' && (
          <button
            type="button"
            onClick={() => void compute(origin, destination, { travelMode: mode })}
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-faint transition-colors hover:text-accent"
          >
            <Route className="h-3.5 w-3.5" aria-hidden />
            Calcular deslocamento
          </button>
        )}

        {state.status === 'loading' && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-faint">
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Calculando…
          </span>
        )}

        {state.status === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-[12px] text-ink-soft">
            <AlertTriangle className="h-3.5 w-3.5 text-warning" aria-hidden />
            {state.message}
            {!state.unavailable && (
              <button
                type="button"
                onClick={() => void compute(origin, destination, { travelMode: mode, refresh: true })}
                className="font-medium text-accent underline-offset-2 hover:underline"
              >
                Tentar de novo
              </button>
            )}
          </span>
        )}

        {state.status === 'ready' && (
          <>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium tabular',
                tight ? 'bg-warning-soft text-warning' : 'bg-surface-muted text-ink-soft',
              )}
            >
              {(() => {
                const Icon = MODES.find((m) => m.value === mode)?.icon ?? Car;
                return <Icon className="h-3.5 w-3.5" aria-hidden />;
              })()}
              {formatDuration(state.result.durationInTrafficSeconds ?? state.result.durationSeconds)}
              <span className="text-ink-faint">·</span>
              {formatDistance(state.result.distanceMeters)}
            </span>

            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="text-[12px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
              aria-expanded={expanded}
            >
              {expanded ? 'ocultar' : 'trocar modo'}
            </button>

            <button
              type="button"
              onClick={() => void compute(origin, destination, { travelMode: mode, refresh: true })}
              className="inline-flex items-center gap-1 text-[12px] text-ink-faint underline-offset-2 hover:text-ink"
              aria-label="Atualizar rota"
            >
              <RefreshCw className="h-3 w-3" aria-hidden />
              atualizar
            </button>
          </>
        )}
      </div>

      {expanded && state.status === 'ready' && (
        <div className="flex flex-wrap gap-1.5 pb-2">
          {MODES.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setMode(option.value);
                  void compute(origin, destination, { travelMode: option.value });
                }}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] transition-colors',
                  mode === option.value
                    ? 'border-accent bg-accent-soft text-accent-strong'
                    : 'border-line-strong text-ink-soft hover:text-ink',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {option.label}
              </button>
            );
          })}
        </div>
      )}

      {tight && state.status === 'ready' && (
        <p className="pb-2 text-[12px] leading-relaxed text-warning">
          Atenção: o deslocamento estimado é de{' '}
          {formatDuration(state.result.durationInTrafficSeconds ?? state.result.durationSeconds)} e há apenas{' '}
          {formatDuration(gapSeconds ?? 0)} entre os eventos. Este horário pode não ser suficiente.
        </p>
      )}
    </div>
  );
}
