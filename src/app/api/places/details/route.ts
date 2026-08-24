import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/server';
import { getPlaceDetails, GoogleNotConfiguredError, inferPlaceCategory } from '@/lib/google/places';

/** Detalhes de um local escolhido no autocomplete (encerra a sessão de cobrança). */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Não autenticado.' }, { status: 401 });

  const placeId = request.nextUrl.searchParams.get('placeId');
  const sessionToken = request.nextUrl.searchParams.get('session') ?? undefined;
  if (!placeId) return NextResponse.json({ error: 'placeId é obrigatório.' }, { status: 400 });

  try {
    const details = await getPlaceDetails(placeId, { sessionToken });
    return NextResponse.json({ place: { ...details, category: inferPlaceCategory(details.types) } });
  } catch (error) {
    if (error instanceof GoogleNotConfiguredError) {
      return NextResponse.json({ error: error.message, notConfigured: true }, { status: 503 });
    }
    console.error('[api/places/details]', error);
    return NextResponse.json({ error: 'Não foi possível carregar este local.' }, { status: 502 });
  }
}
