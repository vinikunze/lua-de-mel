'use client';

import { useCallback, useState } from 'react';
import type { TravelMode } from '@/types/database';

export interface LegPoint {
  placeId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}

export interface LegResult {
  distanceMeters: number;
  durationSeconds: number;
  durationInTrafficSeconds: number | null;
  encodedPolyline: string | null;
  cached: boolean;
}

export type LegState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'ready'; result: LegResult }
  | { status: 'error'; message: string; unavailable: boolean };

/**
 * Consulta de deslocamento entre dois pontos.
 *
 * Só dispara quando pedimos — nunca em toda renderização. O servidor guarda o
 * resultado em cache; o botão "Atualizar" força uma nova consulta.
 */
export function useRouteLeg(tripId: string) {
  const [state, setState] = useState<LegState>({ status: 'idle' });

  const compute = useCallback(
    async (
      origin: LegPoint,
      destination: LegPoint,
      options: { travelMode?: TravelMode; refresh?: boolean } = {},
    ) => {
      setState({ status: 'loading' });
      try {
        const response = await fetch('/api/routes/compute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tripId,
            origin,
            destination,
            intermediates: [],
            travelMode: options.travelMode ?? 'DRIVE',
            refresh: options.refresh ?? false,
          }),
        });
        const data = await response.json();

        if (!response.ok) {
          setState({
            status: 'error',
            message: data.error ?? 'Não foi possível calcular o deslocamento.',
            unavailable: Boolean(data.notConfigured),
          });
          return null;
        }

        const result: LegResult = { ...data.route, cached: data.cached };
        setState({ status: 'ready', result });
        return result;
      } catch {
        setState({
          status: 'error',
          message: 'Não foi possível atualizar a rota neste momento.',
          unavailable: false,
        });
        return null;
      }
    },
    [tripId],
  );

  const reset = useCallback(() => setState({ status: 'idle' }), []);

  return { state, compute, reset };
}
