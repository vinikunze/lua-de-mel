import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { ChecklistBoard } from '@/components/checklist/checklist-board';
import { PageHeader } from '@/components/ui/section';
import type { ChecklistWithItems } from '@/server/queries/trips';

export const metadata: Metadata = { title: 'Checklist' };
export const dynamic = 'force-dynamic';

export default async function ChecklistPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('checklists')
    .select('*, items:checklist_items(*)')
    .eq('trip_id', tripId)
    .order('position');

  const checklists = ((data ?? []) as ChecklistWithItems[]).map((list) => ({
    ...list,
    items: [...(list.items ?? [])].sort((a, b) => a.position - b.position),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checklist"
        description="O que resolver antes de viajar e o que não pode faltar na mala."
      />
      <ChecklistBoard tripId={tripId} checklists={checklists} canEdit={canEdit} />
    </div>
  );
}
