'use client';

/**
 * Carregamento sob demanda da Maps JavaScript API.
 *
 * Feito à mão de propósito: o script só é baixado quando um mapa entra em cena
 * e nunca é injetado duas vezes. Sem chave, resolvemos com erro tratado e a
 * interface mostra o fallback em vez de quebrar.
 */

declare global {
  interface Window {
    google?: typeof google;
    __nossaViagemMapsPromise?: Promise<typeof google.maps>;
  }
}

const SCRIPT_ID = 'google-maps-js-api';

export function loadGoogleMaps(apiKey: string | null | undefined): Promise<typeof google.maps> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Maps só carrega no navegador.'));
  }
  if (!apiKey) {
    return Promise.reject(new Error('Chave do Google Maps não configurada.'));
  }
  if (window.google?.maps) {
    return Promise.resolve(window.google.maps);
  }
  if (window.__nossaViagemMapsPromise) {
    return window.__nossaViagemMapsPromise;
  }

  window.__nossaViagemMapsPromise = new Promise<typeof google.maps>((resolve, reject) => {
    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;

    const handleLoad = () => {
      if (window.google?.maps) resolve(window.google.maps);
      else reject(new Error('Maps carregou, mas a API não ficou disponível.'));
    };

    if (existing) {
      existing.addEventListener('load', handleLoad);
      existing.addEventListener('error', () => reject(new Error('Falha ao carregar o Google Maps.')));
      return;
    }

    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      language: 'pt-BR',
      region: 'BR',
      libraries: 'marker,geometry',
      loading: 'async',
    });

    const script = document.createElement('script');
    script.id = SCRIPT_ID;
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
    script.async = true;
    script.defer = true;
    script.addEventListener('load', handleLoad);
    script.addEventListener('error', () => {
      window.__nossaViagemMapsPromise = undefined;
      reject(new Error('Falha ao carregar o Google Maps.'));
    });
    document.head.appendChild(script);
  });

  return window.__nossaViagemMapsPromise;
}
