import { GOOGLE_MAPS_MAP_ID, hasBrowserMapsKey, serverMapsKey } from '@/lib/env';

/**
 * Estado das integrações Google, consultado pela interface para decidir
 * o que exibir. Sem chave o sistema continua funcionando: o usuário digita
 * o endereço manualmente e os cálculos automáticos ficam ocultos.
 */
export interface GoogleCapabilities {
  /** Mapa interativo no navegador (Maps JavaScript API). */
  interactiveMap: boolean;
  /** Autocomplete de endereços e cálculo de rotas (via nosso servidor). */
  places: boolean;
  routes: boolean;
  staticMaps: boolean;
  mapId: string | null;
}

export function googleCapabilities(): GoogleCapabilities {
  const server = Boolean(serverMapsKey());
  return {
    interactiveMap: hasBrowserMapsKey,
    places: server,
    routes: server,
    staticMaps: server,
    mapId: GOOGLE_MAPS_MAP_ID ?? null,
  };
}

/** Alguma funcionalidade Google está disponível? */
export function anyGoogleFeature(caps: GoogleCapabilities): boolean {
  return caps.interactiveMap || caps.places || caps.routes || caps.staticMaps;
}
