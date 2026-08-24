'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, MapPinOff } from 'lucide-react';
import { loadGoogleMaps } from '@/lib/google/loader';
import { decodePolyline, type LatLng } from '@/lib/google/polyline';
import { cn } from '@/lib/utils';

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  title: string;
  category: string;
  /** Número/letra mostrado no marcador, quando faz parte de uma sequência. */
  label?: string;
  subtitle?: string | null;
  address?: string | null;
  externalUrl?: string | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  accommodation: '#7c3aed',
  restaurant: '#c2410c',
  attraction: '#0f766e',
  airport: '#2563eb',
  parking: '#64748b',
  car_rental: '#ea580c',
  shopping: '#be185d',
  event: '#4f46e5',
  transport: '#0891b2',
  flight: '#2563eb',
  car: '#ea580c',
  tour: '#0891b2',
  other: '#64748b',
};

function colorFor(category: string): string {
  return CATEGORY_COLORS[category] ?? CATEGORY_COLORS.other;
}

function pinSvg(color: string, label?: string): string {
  const text = label
    ? `<text x="14" y="19" text-anchor="middle" font-family="system-ui,sans-serif" font-size="12" font-weight="700" fill="#fff">${label}</text>`
    : `<circle cx="14" cy="14" r="4.5" fill="#fff"/>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="38" viewBox="0 0 28 38">
      <path d="M14 0C6.3 0 0 6.2 0 13.9 0 24.3 14 38 14 38s14-13.7 14-24.1C28 6.2 21.7 0 14 0z" fill="${color}"/>
      ${text}
    </svg>`,
  )}`;
}

interface MapViewProps {
  apiKey: string | null;
  mapId: string | null;
  markers: MapMarker[];
  /** Polyline codificada da rota do dia, quando houver. */
  polyline?: string | null;
  className?: string;
  onSelect?: (id: string) => void;
}

/**
 * Mapa interativo.
 *
 * Carregado dinamicamente e apenas quando entra em cena. Sem chave configurada,
 * mostra um aviso claro em vez de quebrar — a lista de locais continua acessível
 * na página e cada um tem o link "abrir no Google Maps", que não exige API.
 */
export function MapView({ apiKey, mapId, markers, polyline, className, onSelect }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const overlaysRef = useRef<Array<{ setMap: (map: google.maps.Map | null) => void }>>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [message, setMessage] = useState('');

  // 1) Carrega a biblioteca e cria o mapa uma única vez.
  useEffect(() => {
    let cancelled = false;

    if (!apiKey) {
      setStatus('error');
      setMessage('Mapa interativo indisponível: a chave do Google Maps não está configurada.');
      return;
    }

    loadGoogleMaps(apiKey)
      .then((maps) => {
        if (cancelled || !containerRef.current) return;
        mapRef.current = new maps.Map(containerRef.current, {
          center: { lat: markers[0]?.lat ?? -14.235, lng: markers[0]?.lng ?? -51.925 },
          zoom: markers.length > 0 ? 12 : 4,
          mapId: mapId ?? undefined,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          clickableIcons: false,
          gestureHandling: 'greedy',
        });
        infoRef.current = new maps.InfoWindow();
        setStatus('ready');
      })
      .catch((error: Error) => {
        if (cancelled) return;
        setStatus('error');
        setMessage(error.message || 'Não foi possível carregar o mapa.');
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, mapId]);

  // 2) Redesenha marcadores e rota quando os dados mudam.
  useEffect(() => {
    const map = mapRef.current;
    if (status !== 'ready' || !map || !window.google) return;

    for (const overlay of overlaysRef.current) overlay.setMap(null);
    overlaysRef.current = [];

    const maps = window.google.maps;
    const bounds = new maps.LatLngBounds();

    for (const marker of markers) {
      const position = { lat: marker.lat, lng: marker.lng };
      bounds.extend(position);

      const pin = new maps.Marker({
        map,
        position,
        title: marker.title,
        icon: {
          url: pinSvg(colorFor(marker.category), marker.label),
          scaledSize: new maps.Size(28, 38),
          anchor: new maps.Point(14, 38),
        },
      });

      pin.addListener('click', () => {
        onSelect?.(marker.id);
        const external =
          marker.externalUrl ??
          `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`;
        infoRef.current?.setContent(
          `<div style="font-family:system-ui,sans-serif;max-width:220px;padding:2px 0">
             <p style="margin:0;font-weight:600;font-size:13px;color:#16161a">${escapeHtml(marker.title)}</p>
             ${marker.subtitle ? `<p style="margin:2px 0 0;font-size:12px;color:#5c5b60">${escapeHtml(marker.subtitle)}</p>` : ''}
             ${marker.address ? `<p style="margin:4px 0 0;font-size:12px;color:#5c5b60">${escapeHtml(marker.address)}</p>` : ''}
             <a href="${external}" target="_blank" rel="noopener noreferrer"
                style="display:inline-block;margin-top:8px;font-size:12px;font-weight:600;color:#0f766e;text-decoration:none">
               Abrir no Google Maps
             </a>
           </div>`,
        );
        infoRef.current?.open({ map, anchor: pin });
      });

      overlaysRef.current.push(pin);
    }

    if (polyline) {
      const path: LatLng[] = decodePolyline(polyline);
      const line = new maps.Polyline({
        map,
        path,
        strokeColor: '#2563eb',
        strokeOpacity: 0.85,
        strokeWeight: 4,
      });
      for (const point of path) bounds.extend(point);
      overlaysRef.current.push(line);
    }

    if (markers.length === 1) {
      map.setCenter({ lat: markers[0].lat, lng: markers[0].lng });
      map.setZoom(15);
    } else if (markers.length > 1) {
      map.fitBounds(bounds, 48);
    }
  }, [markers, polyline, status, onSelect]);

  if (status === 'error') {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center rounded-[14px] border border-dashed border-line-strong bg-surface p-8 text-center',
          className,
        )}
      >
        <MapPinOff className="mb-3 h-6 w-6 text-ink-faint" aria-hidden />
        <p className="text-[13px] font-medium text-ink">Mapa indisponível</p>
        <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-ink-soft">{message}</p>
        <p className="mt-2 max-w-sm text-[12px] leading-relaxed text-ink-faint">
          A lista de locais abaixo continua funcionando, e cada endereço abre direto no aplicativo do
          Google Maps.
        </p>
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden rounded-[14px] border border-line bg-surface-muted', className)}>
      <div ref={containerRef} className="h-full w-full" role="application" aria-label="Mapa da viagem" />
      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface-muted">
          <span className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            Carregando o mapa…
          </span>
        </div>
      )}
    </div>
  );
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
