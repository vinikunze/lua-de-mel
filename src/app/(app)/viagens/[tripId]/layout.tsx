import { notFound } from 'next/navigation';
import { loadTripAccess } from '@/server/trip-access';
import { listTripMembers } from '@/server/queries/trips';
import { TripHeader } from '@/components/layout/trip-header';
import { TripSidebar } from '@/components/layout/trip-sidebar';
import { TripProvider } from '@/components/trip/trip-context';
import { QuickAddButton } from '@/components/trip/quick-add-button';
import { googleCapabilities } from '@/lib/google/config';
import { NotFoundError, ForbiddenError } from '@/lib/errors';

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;

  let access;
  try {
    access = await loadTripAccess(tripId);
  } catch (error) {
    if (error instanceof NotFoundError || error instanceof ForbiddenError) notFound();
    throw error;
  }

  const members = await listTripMembers(tripId);

  return (
    <TripProvider
      value={{
        trip: access.trip,
        role: access.role,
        google: googleCapabilities(),
        members: members
          .filter((m) => m.invite_status === 'accepted')
          .map((m) => ({
            id: m.id,
            name: m.profile?.full_name ?? m.display_name ?? m.invited_email ?? 'Participante',
            userId: m.user_id,
          })),
      }}
    >
      <TripHeader trip={access.trip} members={members} />

      <div className="mx-auto max-w-6xl gap-8 px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden lg:block print-hidden">
          <TripSidebar tripId={tripId} />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>

      {/* Botão de ação rápida — pensado para uso durante a viagem, no celular. */}
      <QuickAddButton tripId={tripId} canEdit={access.canEdit} />
    </TripProvider>
  );
}
