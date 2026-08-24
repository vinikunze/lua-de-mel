'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export interface Suggestion {
  placeId: string;
  mainText: string;
  secondaryText: string;
}

export interface ResolvedPlace {
  placeId: string;
  name: string;
  formattedAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  googleMapsUri: string | null;
  city: string | null;
  country: string | null;
  category: string;
}

const DEBOUNCE_MS = 320;

/**
 * Busca de endereços com controle de custo:
 *  - debounce de ~320 ms (não consulta a cada tecla);
 *  - mínimo de 3 caracteres;
 *  - session token compartilhado entre autocomplete e detalhes;
 *  - cancelamento da requisição anterior.
 */
export function usePlaceAutocomplete(options: { bias?: { lat: number; lng: number } | null } = {}) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const sessionToken = useRef<string>(crypto.randomUUID());
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Abaixo de 3 caracteres não consultamos nada; a lista some por derivação
    // (ver `visibleSuggestions`), sem precisar mexer no estado aqui.
    if (query.trim().length < 3) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ q: query.trim(), session: sessionToken.current });
        if (options.bias) {
          params.set('lat', String(options.bias.lat));
          params.set('lng', String(options.bias.lng));
        }
        const response = await fetch(`/api/places/autocomplete?${params}`, { signal: controller.signal });
        const data = await response.json();

        if (!response.ok) {
          if (data.notConfigured) setUnavailable(true);
          setSuggestions([]);
          setError(data.error ?? 'Busca indisponível.');
          return;
        }
        setSuggestions(data.suggestions ?? []);
      } catch (err) {
        if ((err as Error).name === 'AbortError') return;
        setError('Não foi possível buscar endereços agora.');
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query, options.bias]);

  const resolve = useCallback(async (placeId: string): Promise<ResolvedPlace | null> => {
    try {
      const params = new URLSearchParams({ placeId, session: sessionToken.current });
      const response = await fetch(`/api/places/details?${params}`);
      const data = await response.json();
      // Nova sessão após concluir a escolha — é o que a cobrança do Google espera.
      sessionToken.current = crypto.randomUUID();
      if (!response.ok) {
        setError(data.error ?? 'Não foi possível carregar este local.');
        return null;
      }
      return data.place as ResolvedPlace;
    } catch {
      setError('Não foi possível carregar este local.');
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setQuery('');
    setSuggestions([]);
    setError(null);
  }, []);

  // A lista só existe a partir de 3 caracteres — derivado, não sincronizado.
  const active = query.trim().length >= 3;

  return {
    query,
    setQuery,
    suggestions: active ? suggestions : [],
    loading: active && loading,
    error,
    unavailable,
    resolve,
    reset,
  };
}
