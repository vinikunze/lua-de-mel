'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Loader2, MapPin, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { usePlaceAutocomplete, type ResolvedPlace } from '@/hooks/use-place-autocomplete';
import { cn } from '@/lib/utils';

export interface PlaceValue {
  name: string;
  formattedAddress: string | null;
  googlePlaceId: string | null;
  latitude: number | null;
  longitude: number | null;
  phone?: string | null;
  website?: string | null;
  googleMapsUrl?: string | null;
  city?: string | null;
  country?: string | null;
  category?: string | null;
}

/**
 * Busca de local por nome.
 *
 * O usuário digita "Hotel Casa da Montanha Gramado" e escolhe na lista —
 * nunca precisa ver latitude, longitude ou Place ID. Esses dados existem,
 * mas viajam em campos ocultos.
 *
 * Sem a Places API configurada, o componente vira um campo de texto comum
 * com endereço manual: nada quebra, só o automático deixa de existir.
 */
export function PlaceAutocomplete({
  namePrefix = 'place',
  label = 'Buscar local',
  placeholder = 'Ex.: Lago Negro, Gramado',
  value,
  onChange,
  bias,
  available = true,
  required = false,
  id,
}: {
  namePrefix?: string;
  label?: string;
  placeholder?: string;
  value: PlaceValue | null;
  onChange: (value: PlaceValue | null) => void;
  bias?: { lat: number; lng: number } | null;
  available?: boolean;
  required?: boolean;
  id?: string;
}) {
  const { query, setQuery, suggestions, loading, error, unavailable, resolve, reset } = usePlaceAutocomplete({
    bias,
  });
  const [open, setOpen] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [manual, setManual] = useState(!available);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (unavailable) setManual(true);
  }, [unavailable]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function select(placeId: string) {
    setResolving(true);
    const place: ResolvedPlace | null = await resolve(placeId);
    setResolving(false);
    setOpen(false);
    if (!place) return;
    onChange({
      name: place.name,
      formattedAddress: place.formattedAddress,
      googlePlaceId: place.placeId,
      latitude: place.latitude,
      longitude: place.longitude,
      phone: place.phone,
      website: place.website,
      googleMapsUrl: place.googleMapsUri,
      city: place.city,
      country: place.country,
      category: place.category,
    });
    reset();
  }

  const hidden = (
    <>
      <input type="hidden" name={`${namePrefix}.name`} value={value?.name ?? ''} />
      <input type="hidden" name={`${namePrefix}.formattedAddress`} value={value?.formattedAddress ?? ''} />
      <input type="hidden" name={`${namePrefix}.googlePlaceId`} value={value?.googlePlaceId ?? ''} />
      <input type="hidden" name={`${namePrefix}.latitude`} value={value?.latitude ?? ''} />
      <input type="hidden" name={`${namePrefix}.longitude`} value={value?.longitude ?? ''} />
      <input type="hidden" name={`${namePrefix}.phone`} value={value?.phone ?? ''} />
      <input type="hidden" name={`${namePrefix}.website`} value={value?.website ?? ''} />
      <input type="hidden" name={`${namePrefix}.googleMapsUrl`} value={value?.googleMapsUrl ?? ''} />
      <input type="hidden" name={`${namePrefix}.city`} value={value?.city ?? ''} />
      <input type="hidden" name={`${namePrefix}.country`} value={value?.country ?? ''} />
    </>
  );

  if (value) {
    return (
      <div className="flex items-start gap-3 rounded-[12px] border border-accent/30 bg-accent-soft px-3.5 py-3">
        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-accent" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13.5px] font-medium text-ink">{value.name}</p>
          {value.formattedAddress && (
            <p className="mt-0.5 truncate text-[12px] text-ink-soft">{value.formattedAddress}</p>
          )}
          {value.googlePlaceId && (
            <p className="mt-1 flex items-center gap-1 text-[11px] text-accent-strong">
              <Check className="h-3 w-3" aria-hidden />
              Localização confirmada no mapa
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label="Trocar local"
          onClick={() => onChange(null)}
        >
          <X className="h-4 w-4" aria-hidden />
        </Button>
        {hidden}
      </div>
    );
  }

  if (manual) {
    return (
      <div className="space-y-2">
        <Input
          id={id}
          placeholder="Nome do local"
          required={required}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value ? { name: e.target.value, formattedAddress: null, googlePlaceId: null, latitude: null, longitude: null } : null);
          }}
        />
        <p className="text-[11px] text-ink-faint">
          Busca de endereços indisponível. Digite o nome e o endereço manualmente — tudo continua funcionando,
          só o mapa e as distâncias automáticas ficam de fora.
        </p>
        {available && (
          <button
            type="button"
            onClick={() => setManual(false)}
            className="text-[12px] font-medium text-accent underline-offset-2 hover:underline"
          >
            Tentar buscar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" aria-hidden />
        <Input
          id={id}
          className="pl-10"
          placeholder={placeholder}
          value={query}
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls={`${namePrefix}-suggestions`}
          aria-label={label}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
        />
        {(loading || resolving) && (
          <Loader2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ink-faint" aria-hidden />
        )}
      </div>

      {open && (query.trim().length >= 3 || error) && (
        <div
          id={`${namePrefix}-suggestions`}
          role="listbox"
          className="absolute z-20 mt-1.5 max-h-64 w-full overflow-y-auto rounded-[12px] border border-line bg-surface p-1 shadow-float"
        >
          {error ? (
            <p className="px-3 py-2.5 text-[12px] text-ink-soft">{error}</p>
          ) : suggestions.length === 0 && !loading ? (
            <p className="px-3 py-2.5 text-[12px] text-ink-soft">Nenhum lugar encontrado.</p>
          ) : (
            suggestions.map((suggestion) => (
              <button
                key={suggestion.placeId}
                type="button"
                role="option"
                aria-selected={false}
                onClick={() => select(suggestion.placeId)}
                className={cn(
                  'flex w-full items-start gap-2.5 rounded-[8px] px-2.5 py-2.5 text-left transition-colors',
                  'hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none',
                )}
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-ink">{suggestion.mainText}</span>
                  {suggestion.secondaryText && (
                    <span className="block truncate text-[12px] text-ink-soft">{suggestion.secondaryText}</span>
                  )}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      <button
        type="button"
        onClick={() => setManual(true)}
        className="mt-1.5 text-[12px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
      >
        Prefiro digitar o endereço manualmente
      </button>

      {hidden}
    </div>
  );
}
