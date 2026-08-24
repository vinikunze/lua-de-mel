import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { PdfOptionsForm } from '@/components/pdf/pdf-options-form';
import { PageHeader } from '@/components/ui/section';
import { Alert } from '@/components/ui/alert';
import { googleCapabilities } from '@/lib/google/config';

export const metadata: Metadata = { title: 'Gerar PDF' };
export const dynamic = 'force-dynamic';

export default async function PdfPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  await loadTripAccess(tripId);
  const caps = googleCapabilities();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gerar PDF da viagem"
        description="Um documento que funciona sem internet: endereços, horários, códigos de reserva e telefones sempre em texto."
      />

      {!caps.staticMaps && (
        <Alert tone="info">
          Os mapas de cada dia precisam da Maps Static API configurada. Sem ela, o roteiro sai completo, só
          sem as imagens de mapa — a lista de paradas continua no documento.
        </Alert>
      )}

      <PdfOptionsForm tripId={tripId} />
    </div>
  );
}
