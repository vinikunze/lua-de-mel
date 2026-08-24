import type { Metadata } from 'next';
import { loadTripAccess } from '@/server/trip-access';
import { createClient } from '@/lib/supabase/server';
import { FinanceBoard } from '@/components/finance/finance-board';
import { PageHeader } from '@/components/ui/section';
import type { ExpenseWithSplits } from '@/server/queries/trips';

export const metadata: Metadata = { title: 'Financeiro' };
export const dynamic = 'force-dynamic';

export default async function FinancePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const { canEdit } = await loadTripAccess(tripId);

  const supabase = await createClient();
  const { data } = await supabase
    .from('expenses')
    .select('*, splits:expense_splits(*)')
    .eq('trip_id', tripId)
    .order('expense_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financeiro"
        description="Orçado contra o real, pagamentos e a divisão entre os viajantes."
      />
      <FinanceBoard
        tripId={tripId}
        expenses={(data ?? []) as unknown as ExpenseWithSplits[]}
        canEdit={canEdit}
      />
    </div>
  );
}
