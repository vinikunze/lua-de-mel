import { NextResponse } from 'next/server';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { slugify } from '@/lib/utils';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

/**
 * Exportação completa da viagem em JSON.
 * Serve como backup do usuário e como ponto de partida para importações futuras.
 * Campos sensíveis (senha do Wi-Fi, instruções de entrada) são incluídos porque
 * o arquivo é gerado sob autenticação e baixado pelo próprio participante.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;

  try {
    const { trip } = await loadTripAccess(tripId);
    const bundle = await loadTripBundle(tripId, trip);

    const payload = {
      exportadoEm: new Date().toISOString(),
      versao: 1,
      viagem: bundle.trip,
      participantes: bundle.members.map((member) => ({
        id: member.id,
        nome: member.profile?.full_name ?? member.display_name,
        email: member.profile?.email ?? member.invited_email,
        papel: member.role,
        situacaoDoConvite: member.invite_status,
      })),
      destinos: bundle.destinations,
      locais: bundle.places,
      voos: bundle.flights,
      hospedagens: bundle.accommodations,
      carros: bundle.carRentals,
      roteiro: bundle.itinerary,
      rotas: bundle.routes,
      despesas: bundle.expenses,
      documentos: bundle.documents.map((doc) => ({
        ...doc,
        // O arquivo em si fica no Storage privado; exportamos apenas o metadado.
        storage_path: undefined,
      })),
      checklists: bundle.checklists,
      contatos: bundle.contacts,
      links: bundle.quickLinks,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${slugify(trip.name) || 'viagem'}.json"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof NotFoundError) {
      return new NextResponse(error.message, { status: 403 });
    }
    console.error('[api/viagens/exportar]', error);
    return new NextResponse('Não foi possível exportar a viagem.', { status: 500 });
  }
}
