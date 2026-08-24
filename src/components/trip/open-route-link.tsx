import { Navigation } from 'lucide-react';
import { buildNavigateFromHereUrl, buildRouteUrlFromStops, type MapPoint } from '@/lib/google/maps-url';
import type { TravelMode } from '@/types/database';
import { cn } from '@/lib/utils';

/**
 * "Abrir no Google Maps" — link puro, sem API key.
 * Funciona no celular abrindo direto o aplicativo de navegação.
 */
export function OpenRouteLink({
  stops,
  destination,
  mode = 'DRIVE',
  label,
  className,
  variant = 'link',
}: {
  stops?: MapPoint[];
  destination?: MapPoint;
  mode?: TravelMode;
  label?: string;
  className?: string;
  variant?: 'link' | 'button';
}) {
  const url = stops && stops.length >= 2
    ? buildRouteUrlFromStops(stops, mode)
    : destination
      ? buildNavigateFromHereUrl(destination, mode)
      : null;

  if (!url) return null;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        variant === 'button'
          ? 'inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-line-strong bg-surface px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-muted'
          : 'inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent underline-offset-4 hover:underline',
        className,
      )}
    >
      <Navigation className="h-3.5 w-3.5" aria-hidden />
      {label ?? 'Abrir no Google Maps'}
    </a>
  );
}
