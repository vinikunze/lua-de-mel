/**
 * Leitura centralizada das variáveis de ambiente.
 *
 * A aplicação precisa continuar de pé mesmo com integrações não configuradas:
 * em vez de lançar erro na importação, expomos flags de disponibilidade e a UI
 * decide o que esconder ou avisar.
 *
 * Sobre o prefixo `NEXT_PUBLIC_`: ele não é um rótulo, é um comando. O Next
 * substitui `process.env.NEXT_PUBLIC_X` pelo valor literal dentro do JavaScript
 * enviado ao navegador — qualquer pessoa lê no "ver código-fonte". Por isso só
 * carregam o prefixo os valores que o próprio navegador precisa ler. Tudo o que
 * é consultado apenas no servidor fica sem prefixo, mesmo não sendo segredo:
 * o que não sai daqui não pode vazar.
 */

function read(...names: string[]): string | undefined {
  // No navegador `process.env` existe, mas só com as chaves NEXT_PUBLIC_.
  // Protegemos o acesso para que uma variável de servidor lida por engano
  // resulte em `undefined` em vez de quebrar a página.
  const env = typeof process === 'undefined' ? undefined : process.env;
  if (!env) return undefined;
  for (const name of names) {
    const value = env[name];
    if (value && value.trim() !== '') return value.trim();
  }
  return undefined;
}

// --- Supabase ----------------------------------------------------------------
// Estes dois PRECISAM do prefixo: `src/lib/supabase/client.ts` roda no
// navegador. A chave anônima é pública por natureza — quem protege os dados é
// o RLS do banco, não o segredo da chave. A Service Role Key nunca aparece aqui.
export const SUPABASE_URL = read('NEXT_PUBLIC_SUPABASE_URL');
export const SUPABASE_ANON_KEY = read(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
);

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export function requireSupabaseEnv(): { url: string; key: string } {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      'Supabase não configurado. Defina NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url: SUPABASE_URL, key: SUPABASE_ANON_KEY };
}

// --- Google Maps -------------------------------------------------------------

/**
 * Chave usada para carregar o Maps JavaScript API.
 *
 * O valor acaba visível no navegador — vai na URL do script — mas quem o lê é
 * um Server Component, que o repassa como propriedade só para a página do mapa.
 * Sem o prefixo, a chave deixa de ser embutida em todo o pacote JavaScript do
 * site e aparece apenas onde há mapa. A proteção real continua sendo a
 * restrição por referrer HTTP no Google Cloud.
 */
export const GOOGLE_MAPS_BROWSER_KEY = read(
  'GOOGLE_MAPS_BROWSER_API_KEY',
  'NEXT_PUBLIC_GOOGLE_MAPS_API_KEY',
);

/**
 * Chave usada apenas no servidor (Places, Routes, Static Maps).
 * NUNCA deve chegar ao navegador — as chamadas passam pelas nossas rotas.
 */
export const GOOGLE_MAPS_SERVER_KEY =
  typeof window === 'undefined' ? read('GOOGLE_MAPS_SERVER_API_KEY') : undefined;

/** Identificador de estilo do mapa. Lido no servidor e enviado como propriedade. */
export const GOOGLE_MAPS_MAP_ID = read(
  'GOOGLE_MAPS_MAP_ID',
  'NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID',
);

export const hasBrowserMapsKey = Boolean(GOOGLE_MAPS_BROWSER_KEY);

export function serverMapsKey(): string | null {
  return GOOGLE_MAPS_SERVER_KEY ?? null;
}

// --- Aplicação ---------------------------------------------------------------

/**
 * Normaliza uma URL de origem vinda de variável de ambiente.
 *
 * Painéis de hospedagem costumam mostrar o domínio sem o protocolo, e é fácil
 * copiar "meu-app.vercel.app" em vez de "https://meu-app.vercel.app". Sem o
 * protocolo, os links de confirmação de e-mail e de convite sairiam quebrados —
 * então completamos aqui em vez de confiar em quem preencheu.
 */
function normalizeOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, '');
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // localhost e IPs locais não têm certificado; o resto assume-se HTTPS.
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(trimmed);
  return `${isLocal ? 'http' : 'https'}://${trimmed}`;
}

/**
 * Base dos links de confirmação de e-mail e de convite.
 *
 * Só é chamada em Server Actions (`src/server/actions/auth.ts`) e no montador de
 * convites (`src/server/invites.ts`), então a variável não precisa de prefixo
 * público. O nome antigo continua sendo aceito para não quebrar deploys que já
 * o tenham configurado.
 */
export function appUrl(): string {
  const explicit = read('APP_URL', 'NEXT_PUBLIC_APP_URL');
  if (explicit) return normalizeOrigin(explicit);
  const vercel = read('VERCEL_URL', 'NEXT_PUBLIC_VERCEL_URL');
  if (vercel) return normalizeOrigin(vercel);
  return 'http://localhost:3000';
}
