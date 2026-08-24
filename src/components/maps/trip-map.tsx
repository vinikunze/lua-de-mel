'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MapPin, Route, Sparkles } from 'lucide-react';
import { MapView, type MapMarker } from '@/components/maps/map-view';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { useTrip } from '@/components/trip/trip-context';
import { markerLabelFor } from '@/lib/google/static-map';
import { formatDuration, formatShortWeekday, formatTime } from '@/lib/format/date';
import { formatDistance, travelModeLabel } from '@/lib/format/distance';
import { PLACE_CATEGORY_LABEL } from '@/lib/validators/place';
import { ITINERARY_CATEGORY_LABEL } from '@/lib/validators/itinerary';
import type { TripEvent } from '@/lib/domain/timeline';
import type { PlaceRow, TravelMode } from '@/types/database';
import { cn } from '@/lib/utils';

interface TripMapProps {
  tripId: string;
  events: TripEvent[];
  places: PlaceRow[];
  days: string[];
  apiKey: string | null;
  mapId: string | null;
}

interface RouteState {
  status: 'idle' | 'loading' | 'ready' | 'error';
  distanceMeters?: number;
  durationSeconds?: number;
  polyline?: string | null;
  order?: number[] | null;
  message?: string;
}

const MODES: TravelMode[] = ['DRIVE', 'WALK', 'TRANSIT', 'BICYCLE'];

export function TripMap({ tripId, events, places, days, apiKey, mapId }: TripMapProps) {
  const { google } = useTrip();
  const [day, setDay] = useState<string>('todos');
  const [category, setCategory] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [mode, setMode] = useState<TravelMode>('DRIVE');
  const [optimize, setOptimize] = useState(false);
  const [route, setRoute] = useState<RouteState>({ status: 'idle' });
  const [selected, setSelected] = useState<string | null>(null);

  const cities = useMemo(
    () => [...new Set(places.map((p) => p.city).filter((c): c is string => Boolean(c)))].sort(),
    [places],
  );

  // Pontos mapeáveis: eventos com coordenada + locais salvos sem evento.
  const points = useMemo(() => {
    const eventPoints = events
      .filter((e) => e.latitude != null && e.longitude != null)
      .map((event) => ({
        id: event.id,
        lat: event.latitude as number,
        lng: event.longitude as number,
        title: event.title,
        category: event.category,
        subtitle: event.startsAt ? formatTime(event.startsAt, event.timezone) : event.subtitle,
        address: event.address,
        dayDate: event.dayDate,
        googlePlaceId: event.googlePlaceId,
        city: places.find((p) => p.id === event.placeId)?.city ?? null,
        startsAt: event.startsAt,
      }));

    const usedPlaceIds = new Set(events.map((e) => e.placeId).filter(Boolean));
    const loosePlaces = places
      .filter((p) => p.latitude != null && p.longitude != null && !usedPlaceIds.has(p.id))
      .map((place) => ({
        id: `place-${place.id}`,
        lat: place.latitude as number,
        lng: place.longitude as number,
        title: place.name,
        category: place.category,
        subtitle: PLACE_CATEGORY_LABEL[place.category] ?? null,
        address: place.formatted_address,
        dayDate: null as string | null,
        googlePlaceId: place.google_place_id,
        city: place.city,
        startsAt: null as string | null,
      }));

    return [...eventPoints, ...loosePlaces];
  }, [events, places]);

  const filtered = useMemo(() => {
    let list = points;
    if (day !== 'todos') list = list.filter((p) => p.dayDate === day);
    if (category) list = list.filter((p) => p.category === category);
    if (city) list = list.filter((p) => p.city === city);
    return list;
  }, [points, day, category, city]);

  // Em um dia específico, a ordem cronológica define a sequência da rota.
  const daySequence = useMemo(() => {
    if (day === 'todos') return [];
    return filtered
      .filter((p) => p.startsAt)
      .sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
  }, [filtered, day]);

  const ordered = route.order && daySequence.length > 2
    ? [
        daySequence[0],
        ...route.order.map((index) => daySequence.slice(1, -1)[index]).filter(Boolean),
        daySequence[daySequence.length - 1],
      ]
    : daySequence;

  const markers: MapMarker[] = (day === 'todos' ? filtered : ordered.length > 0 ? ordered : filtered).map(
    (point, index) => ({
      id: point.id,
      lat: point.lat,
      lng: point.lng,
      title: point.title,
      category: point.category,
      subtitle: point.subtitle,
      address: point.address,
      label: day === 'todos' ? undefined : String(index + 1),
      externalUrl: point.googlePlaceId
        ? `https://www.google.com/maps/search/?api=1&query=${point.lat},${point.lng}&query_place_id=${point.googlePlaceId}`
        : null,
    }),
  );

  const categories = useMemo(
    () => [...new Set(points.map((p) => p.category))].sort(),
    [points],
  );

  async function computeDayRoute(refresh = false) {
    if (daySequence.length < 2) return;
    setRoute({ status: 'loading' });

    const toPoint = (p: (typeof daySequence)[number]) => ({
      placeId: p.googlePlaceId,
      latitude: p.lat,
      longitude: p.lng,
      address: p.address,
    });

    try {
      const response = await fetch('/api/routes/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId,
          origin: toPoint(daySequence[0]),
          destination: toPoint(daySequence[daySequence.length - 1]),
          intermediates: daySequence.slice(1, -1).map(toPoint),
          travelMode: mode,
          optimize,
          refresh,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        setRoute({ status: 'error', message: data.error ?? 'Não foi possível calcular a rota.' });
        return;
      }

      setRoute({
        status: 'ready',
        distanceMeters: data.route.distanceMeters,
        durationSeconds: data.route.durationInTrafficSeconds ?? data.route.durationSeconds,
        polyline: data.route.encodedPolyline,
        order: optimize ? data.route.optimizedIntermediateWaypointIndex : null,
      });
    } catch {
      setRoute({ status: 'error', message: 'Não foi possível atualizar a rota neste momento.' });
    }
  }

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="min-w-[9rem] flex-1 sm:max-w-[13rem]">
          <label htmlFor="mapa-dia" className="sr-only">
            Filtrar por dia
          </label>
          <Select
            id="mapa-dia"
            value={day}
            onChange={(e) => {
              setDay(e.target.value);
              setRoute({ status: 'idle' });
            }}
            className="h-10 text-[13px]"
          >
            <option value="todos">Todos os dias</option>
            {days.map((value) => (
              <option key={value} value={value}>
                {formatShortWeekday(value)}
              </option>
            ))}
          </Select>
        </div>

        <div className="min-w-[9rem] flex-1 sm:max-w-[13rem]">
          <label htmlFor="mapa-categoria" className="sr-only">
            Filtrar por categoria
          </label>
          <Select
            id="mapa-categoria"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 text-[13px]"
          >
            <option value="">Todas as categorias</option>
            {categories.map((value) => (
              <option key={value} value={value}>
                {ITINERARY_CATEGORY_LABEL[value as keyof typeof ITINERARY_CATEGORY_LABEL] ??
                  PLACE_CATEGORY_LABEL[value as keyof typeof PLACE_CATEGORY_LABEL] ??
                  value}
              </option>
            ))}
          </Select>
        </div>

        {cities.length > 1 && (
          <div className="min-w-[9rem] flex-1 sm:max-w-[13rem]">
            <label htmlFor="mapa-cidade" className="sr-only">
              Filtrar por cidade
            </label>
            <Select
              id="mapa-cidade"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="h-10 text-[13px]"
            >
              <option value="">Todas as cidades</option>
              {cities.map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      {points.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="Nenhum local no mapa ainda"
          description="Cadastre hospedagens, restaurantes e atrações escolhendo o endereço na busca — assim eles aparecem aqui com a localização exata."
        />
      ) : (
        <>
          <MapView
            apiKey={apiKey}
            mapId={mapId}
            markers={markers}
            polyline={route.status === 'ready' ? route.polyline : null}
            className="h-[340px] sm:h-[460px]"
            onSelect={setSelected}
          />

          {/* Rota do dia */}
          {day !== 'todos' && daySequence.length >= 2 && (
            <Card className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                    <Route className="h-4 w-4 text-ink-faint" aria-hidden />
                    Rota do dia
                  </h3>
                  <p className="mt-0.5 text-[12px] text-ink-soft">
                    {daySequence.length} paradas na ordem do roteiro.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <label htmlFor="mapa-modo" className="sr-only">
                    Modo de transporte
                  </label>
                  <Select
                    id="mapa-modo"
                    value={mode}
                    onChange={(e) => setMode(e.target.value as TravelMode)}
                    className="h-9 w-auto text-[13px]"
                  >
                    {MODES.map((value) => (
                      <option key={value} value={value}>
                        {travelModeLabel(value).replace(/^de |^a /, '')}
                      </option>
                    ))}
                  </Select>

                  {daySequence.length > 2 && (
                    <label className="flex items-center gap-2 text-[12px] text-ink-soft">
                      <input
                        type="checkbox"
                        checked={optimize}
                        onChange={(e) => setOptimize(e.target.checked)}
                        className="h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
                      />
                      Otimizar ordem
                    </label>
                  )}

                  {google.routes ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void computeDayRoute(route.status === 'ready')}
                      loading={route.status === 'loading'}
                    >
                      {route.status === 'ready' ? 'Atualizar rota' : 'Calcular rota'}
                    </Button>
                  ) : (
                    <Badge tone="neutral">Cálculo automático indisponível</Badge>
                  )}
                </div>
              </div>

              {route.status === 'error' && (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-warning">
                  <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                  {route.message}
                </p>
              )}

              {route.status === 'loading' && (
                <p className="mt-3 flex items-center gap-2 text-[12px] text-ink-soft">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                  Calculando o melhor caminho…
                </p>
              )}

              {route.status === 'ready' && (
                <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px]">
                  <span className="font-semibold text-ink tabular">
                    {formatDistance(route.distanceMeters ?? 0)}
                  </span>
                  <span className="text-ink-soft tabular">
                    {formatDuration(route.durationSeconds ?? 0)} {travelModeLabel(mode)}
                  </span>
                  {optimize && route.order && (
                    <Badge tone="accent">
                      <Sparkles className="h-3 w-3" aria-hidden />
                      Ordem otimizada
                    </Badge>
                  )}
                </div>
              )}

              <ol className="mt-4 space-y-1.5">
                {(ordered.length > 0 ? ordered : daySequence).map((point, index) => (
                  <li
                    key={point.id}
                    className={cn(
                      'flex items-start gap-3 rounded-[10px] px-2 py-1.5 text-[13px]',
                      selected === point.id && 'bg-accent-soft',
                    )}
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-ink">{point.title}</span>
                      {point.address && (
                        <span className="block truncate text-[12px] text-ink-soft">{point.address}</span>
                      )}
                    </span>
                    {point.startsAt && (
                      <span className="shrink-0 text-[12px] text-ink-faint tabular">{point.subtitle}</span>
                    )}
                  </li>
                ))}
              </ol>

              <div className="mt-4 border-t border-line pt-3">
                <OpenRouteLink
                  stops={(ordered.length > 0 ? ordered : daySequence).map((point) => ({
                    latitude: point.lat,
                    longitude: point.lng,
                    address: point.address,
                    name: point.title,
                    googlePlaceId: point.googlePlaceId,
                  }))}
                  mode={mode}
                  variant="button"
                  label="Abrir rota completa no Google Maps"
                />
              </div>
            </Card>
          )}

          {/* Lista de locais — funciona mesmo sem o mapa interativo */}
          <Card className="divide-y divide-line">
            {filtered.map((point) => (
              <div key={point.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-ink">{point.title}</p>
                  <p className="truncate text-[12px] text-ink-soft">
                    {point.subtitle && <span>{point.subtitle} · </span>}
                    {point.address ?? 'Sem endereço'}
                  </p>
                </div>
                <OpenRouteLink
                  destination={{
                    latitude: point.lat,
                    longitude: point.lng,
                    address: point.address,
                    name: point.title,
                    googlePlaceId: point.googlePlaceId,
                  }}
                  label="Abrir"
                  className="shrink-0 text-[12px]"
                />
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="px-4 py-6 text-center text-[13px] text-ink-soft">
                Nenhum local com esses filtros.
              </p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
