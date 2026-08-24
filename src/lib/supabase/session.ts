import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import type { Database } from '@/types/database';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '@/lib/env';

const PUBLIC_ROUTES = [
  '/entrar',
  '/cadastro',
  '/recuperar-senha',
  '/nova-senha',
  '/auth',
  '/configurar',
  '/manifest.webmanifest',
  '/sw.js',
  '/offline',
];

function isPublic(pathname: string) {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/** Renova a sessão a cada requisição e protege as rotas privadas. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    // Sem configuração, direciona para a página de instruções em vez de quebrar.
    if (!isPublic(request.nextUrl.pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/configurar';
      return NextResponse.redirect(url);
    }
    return response;
  }

  const supabase = createServerClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = '/entrar';
    url.searchParams.set('proximo', pathname);
    return NextResponse.redirect(url);
  }

  if (user && (pathname === '/entrar' || pathname === '/cadastro')) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}
