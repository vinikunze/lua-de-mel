import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { autocompletePlaces, GoogleNotConfiguredError } from '@/lib/google/places';

/**
 * Autocomplete de endereços.
 *
 * Roda no servidor de propósito: a chave da Places API fica fora do navegador,
 * e conseguimos aplicar session token + field mask para reduzir custo.
 * O debounce fica no cliente.
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const input = request.nextUrl.searchParams.get('q')?.trim() ?? '';
  const sessionToken = request.nextUrl.searchParams.get('session') ?? undefined;
  const lat = Number(request.nextUrl.searchParams.get('lat'));
  const lng = Number(request.nextUrl.searchParams.get('lng'));

  if (input.length < 3) return NextResponse.json({ suggestions: [] });

  try {
    const suggestions = await autocompletePlaces(input, {
      sessionToken,
      bias: Number.isFinite(lat) && Number.isFinite(lng) ? { latitude: lat, longitude: lng } : undefined,
    });
    return NextResponse.json({ suggestions });
  } catch (error) {
    if (error instanceof GoogleNotConfiguredError) {
      return NextResponse.json({ error: error.message, notConfigured: true }, { status: 503 });
    }
    console.error('[api/places/autocomplete]', error);
    return NextResponse.json(
      { error: 'Não foi possível buscar endereços agora. Você pode digitar o endereço manualmente.' },
      { status: 502 },
    );
  }
}
