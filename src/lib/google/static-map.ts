/**
 * Maps Static API — imagens de mapa para o PDF e para pré-visualizações.
 * A URL é montada no servidor e servida por /api/maps/static, de forma que a
 * chave de servidor nunca chega ao navegador.
 */
import type { LatLng } from '@/lib/google/polyline';

export interface StaticMapMarker extends LatLng {
  label?: string;
  color?: string;
}

export interface StaticMapOptions {
  width?: number;
  height?: number;
  scale?: 1 | 2;
  markers?: StaticMapMarker[];
  polyline?: string | null;
  zoom?: number;
  center?: LatLng;
  mapType?: 'roadmap' | 'terrain';
}

/** Monta a query string do Static Maps (sem a chave). */
export function staticMapParams(options: StaticMapOptions): URLSearchParams {
  const params = new URLSearchParams();
  const width = Math.min(options.width ?? 640, 640);
  const height = Math.min(options.height ?? 360, 640);
  params.set('size', `${width}x${height}`);
  params.set('scale', String(options.scale ?? 2));
  params.set('maptype', options.mapType ?? 'roadmap');
  params.set('language', 'pt-BR');

  const markers = options.markers ?? [];
  for (const marker of markers) {
    const parts = [`color:${marker.color ?? '0x0f172a'}`];
    if (marker.label) parts.push(`label:${marker.label.slice(0, 1).toUpperCase()}`);
    parts.push(`${marker.lat.toFixed(6)},${marker.lng.toFixed(6)}`);
    params.append('markers', parts.join('|'));
  }

  if (options.polyline) {
    params.append('path', `color:0x2563ebcc|weight:4|enc:${options.polyline}`);
  }

  // Sem marcadores nem rota, o mapa precisa de centro e zoom explícitos.
  if (markers.length === 0 && !options.polyline && options.center) {
    params.set('center', `${options.center.lat},${options.center.lng}`);
    params.set('zoom', String(options.zoom ?? 13));
  } else if (markers.length === 1 && !options.polyline) {
    params.set('zoom', String(options.zoom ?? 15));
  }

  return params;
}

/** URL interna e segura — a chave fica no servidor. */
export function internalStaticMapUrl(options: StaticMapOptions): string {
  return `/api/maps/static?${staticMapParams(options).toString()}`;
}

const LABELS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function markerLabelFor(index: number): string {
  return LABELS[index % LABELS.length];
}
