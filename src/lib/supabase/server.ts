import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { requireSupabaseEnv } from '@/lib/env';

/**
 * Cliente Supabase para Server Components, Route Handlers e Server Actions.
 * A sessão vem dos cookies — nunca da service role key.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const { url, key } = requireSupabaseEnv();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components não podem escrever cookies; o middleware cuida da renovação.
        }
      },
    },
  });
}

/** Usuário autenticado ou `null`. Sempre valida no servidor de auth. */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
