'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { requireSupabaseEnv } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient<Database>> | null = null;

/** Cliente Supabase do navegador. Usa apenas a chave pública (anon). */
export function createClient() {
  if (cached) return cached;
  const { url, key } = requireSupabaseEnv();
  cached = createBrowserClient<Database>(url, key);
  return cached;
}
