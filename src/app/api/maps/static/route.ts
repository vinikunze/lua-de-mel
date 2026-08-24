import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { serverMapsKey } from '@/lib/env';

const STATIC_MAPS_URL = 'https://maps.googleapis.com/maps/api/staticmap';

/**
 * Proxy da Maps Static API.
 * A imagem é usada no PDF e em pré-visualizações; a chave de servidor nunca
 * aparece no HTML porque a montagem da URL acontece aqui.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new NextResponse('Não autenticado.', { status: 401 });

  const key = serverMapsKey();
  if (!key) return new NextResponse('Google Maps não configurado.', { status: 503 });

  const allowed = new Set(['size', 'scale', 'maptype', 'language', 'markers', 'path', 'center', 'zoom']);
  const params = new URLSearchParams();
  for (const [name, value] of request.nextUrl.searchParams.entries()) {
    if (allowed.has(name)) params.append(name, value);
  }
  params.set('key', key);

  try {
    const response = await fetch(`${STATIC_MAPS_URL}?${params.toString()}`, {
      next: { revalidate: 86_400 },
    });

    if (!response.ok) {
      return new NextResponse('Não foi possível gerar o mapa.', { status: 502 });
    }

    return new NextResponse(response.body, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') ?? 'image/png',
        // Cache longo: o mapa de um trecho não muda.
        'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (error) {
    console.error('[api/maps/static]', error);
    return new NextResponse('Não foi possível gerar o mapa.', { status: 502 });
  }
}
