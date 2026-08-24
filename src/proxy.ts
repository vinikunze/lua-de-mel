import type { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/session';

export default async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Ignora arquivos estáticos e imagens; tudo o mais passa pela renovação de sessão.
     */
    '/((?!_next/static|_next/image|favicon.ico|icons/|screenshots/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|webmanifest)$).*)',
  ],
};
