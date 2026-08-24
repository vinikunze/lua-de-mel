import type { Metadata } from 'next';
import { Download } from 'lucide-react';
import { loadTripAccess } from '@/server/trip-access';
import { updateTripAction } from '@/server/actions/trips';
import { TripForm } from '@/components/trip/trip-form';
import { TripDangerZone } from '@/components/trip/trip-danger-zone';
import { PageHeader } from '@/components/ui/section';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = { title: 'Configurações da viagem' };
export const dynamic = 'force-dynamic';

export default async function TripSettingsPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { trip, canEdit, isOwner } = await loadTripAccess(tripId);

  // Server Action já vinculada ao id da viagem.
  const action = updateTripAction.bind(null, tripId);

  return (
    <div className="space-y-8">
      <PageHeader title="Configurações" description="Dados gerais, exportação e exclusão da viagem." />

      {!canEdit && (
        <Alert tone="info">
          Seu acesso a esta viagem é apenas de visualização, então as alterações estão desabilitadas.
        </Alert>
      )}

      {canEdit && <TripForm action={action} trip={trip} submitLabel="Salvar alterações" />}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Exportar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[13px] leading-relaxed text-ink-soft">
            Baixe uma cópia dos dados desta viagem. O JSON serve como backup pessoal; o CSV abre no Excel; o
            .ics entra em qualquer calendário.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/viagens/${tripId}/exportar`} download>
                <Download className="h-4 w-4" aria-hidden />
                JSON completo
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/viagens/${tripId}/despesas.csv`} download>
                <Download className="h-4 w-4" aria-hidden />
                Despesas (CSV)
              </a>
            </Button>
            <Button asChild variant="outline" size="sm">
              <a href={`/api/viagens/${tripId}/ics`} download>
                <Download className="h-4 w-4" aria-hidden />
                Calendário (.ics)
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>

      {isOwner && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">Ações da viagem</h2>
          <TripDangerZone tripId={tripId} tripName={trip.name} />
        </section>
      )}
    </div>
  );
}
