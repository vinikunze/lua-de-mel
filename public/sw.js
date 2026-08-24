/**
 * Service worker do Nossa Viagem.
 *
 * Objetivo: durante a viagem, com internet ruim ou nenhuma, ainda dá para
 * consultar roteiro, voos, reservas, endereço do hotel, telefones e códigos.
 *
 * Estratégias:
 *   - assets do Next (/_next/static): cache primeiro (têm hash no nome).
 *   - navegação (páginas): rede primeiro, com o cache como rede de segurança.
 *   - API, autenticação e documentos: somente rede — nunca guardamos resposta
 *     autenticada de API nem arquivo privado no cache.
 *
 * O cache de páginas é apagado no logout (mensagem 'limpar-cache') para que
 * um aparelho compartilhado não guarde dados de outra pessoa.
 */

const VERSION = 'v1';
const SHELL_CACHE = `nv-shell-${VERSION}`;
const PAGES_CACHE = `nv-pages-${VERSION}`;
const ASSETS_CACHE = `nv-assets-${VERSION}`;

const SHELL_URLS = [
  '/offline',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

/** Nunca vão para o cache. */
const NEVER_CACHE = [/^\/api\//, /^\/auth\//, /^\/entrar/, /^\/cadastro/, /^\/nova-senha/, /^\/recuperar-senha/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('nv-') && !key.endsWith(VERSION))
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data === 'limpar-cache' || event.data?.type === 'limpar-cache') {
    event.waitUntil(caches.delete(PAGES_CACHE));
  }
  if (event.data?.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

function isNeverCached(pathname) {
  return NEVER_CACHE.some((pattern) => pattern.test(pathname));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (isNeverCached(url.pathname)) return;

  // Assets versionados: cache primeiro, é seguro e instantâneo.
  if (url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone();
              caches.open(ASSETS_CACHE).then((cache) => cache.put(request, copy));
            }
            return response;
          }),
      ),
    );
    return;
  }

  // Páginas: tenta a rede; sem rede, entrega a última versão vista.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          if (cached) return cached;
          const offline = await caches.match('/offline');
          return (
            offline ||
            new Response('<h1>Sem conexão</h1>', {
              status: 503,
              headers: { 'Content-Type': 'text/html; charset=utf-8' },
            })
          );
        }),
    );
  }
});
