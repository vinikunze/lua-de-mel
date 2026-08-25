/**
 * Leitura centralizada das variáveis de ambiente.
 *
 * A aplicação precisa continuar de pé mesmo com integrações não configuradas:
 * em vez de lançar erro na importação, expomos flags de disponibilidade e a UI
 * decide o que esconder ou avisar.
 */

function read(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value && value.trim() !== '') return value.trim();
  }
  return undefined;
}

// --- Supabase (público) ------------------------------------------------------
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
/** Chave usada no navegador — restrinja por referrer HTTP no Google Cloud. */
export const GOOGLE_MAPS_BROWSER_KEY = read('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY');

/**
 * Chave usada apenas no servidor (Places, Routes, Static Maps).
 * NUNCA deve ser exposta ao navegador — por isso não tem prefixo NEXT_PUBLIC_.
 */
export const GOOGLE_MAPS_SERVER_KEY =
  typeof window === 'undefined' ? read('GOOGLE_MAPS_SERVER_API_KEY') : undefined;

export const GOOGLE_MAPS_MAP_ID = read('NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID');

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

export function appUrl(): string {
  const explicit = read('NEXT_PUBLIC_APP_URL');
  if (explicit) return normalizeOrigin(explicit);
  const vercel = read('NEXT_PUBLIC_VERCEL_URL', 'VERCEL_URL');
  if (vercel) return normalizeOrigin(vercel);
  return 'http://localhost:3000';
}
