import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { loadTripBundle } from '@/server/queries/trips';
import { buildPdfData } from '@/lib/pdf/document-data';
import { optionsFromParams } from '@/lib/pdf/options';
import { TripDocument } from '@/components/pdf/trip-document';
import { PrintBar } from '@/components/pdf/print-bar';

export const metadata: Metadata = { title: 'Documento da viagem' };
export const dynamic = 'force-dynamic';

export default async function PdfDocumentPage({
  params,
  searchParams,
}: {
  params: Promise<{ tripId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ tripId }, query] = await Promise.all([params, searchParams]);
  const { trip } = await loadTripAccess(tripId);

  const options = optionsFromParams(query);
  const bundle = await loadTripBundle(tripId, trip);
  const data = await buildPdfData(bundle, options);

  return (
    <div className="pdf-screen">
      <PrintBar tripId={tripId} tripName={trip.name} />
      <TripDocument data={data} options={options} />
    </div>
  );
}
