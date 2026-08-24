import { APP } from '@/lib/config';

/** 12,7 km — abaixo de 1 km mostra em metros. */
export function formatDistance(meters: number | null | undefined): string {
  if (meters === null || meters === undefined || !Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  return `${new Intl.NumberFormat(APP.locale, {
    minimumFractionDigits: km >= 100 ? 0 : 1,
    maximumFractionDigits: km >= 100 ? 0 : 1,
  }).format(km)} km`;
}

const MODE_LABEL: Record<string, string> = {
  DRIVE: 'de carro',
  WALK: 'a pé',
  TRANSIT: 'de transporte público',
  BICYCLE: 'de bicicleta',
  TWO_WHEELER: 'de moto',
};

export function travelModeLabel(mode: string): string {
  return MODE_LABEL[mode] ?? '';
}
