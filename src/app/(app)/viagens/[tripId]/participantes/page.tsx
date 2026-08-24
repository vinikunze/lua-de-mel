import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { listTripMembers } from '@/server/queries/trips';
import { MembersBoard } from '@/components/trip/members-board';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Participantes' };
export const dynamic = 'force-dynamic';

export default async function MembersPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { isOwner, userId } = await loadTripAccess(tripId);
  const members = await listTripMembers(tripId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Participantes"
        description="Quem tem acesso a esta viagem e o que cada pessoa pode fazer."
      />
      <MembersBoard tripId={tripId} members={members} isOwner={isOwner} currentUserId={userId} />
    </div>
  );
}
