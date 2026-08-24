import type { Metadata } from 'next';
import Link from 'next/link';
import { Luggage, Plus } from 'lucide-react';
import { listTrips } from '@/server/queries/trips';
import { TripCard } from '@/components/trip/trip-card';
import { PageHeader } from '@/components/ui/section';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Viagens' };
export const dynamic = 'force-dynamic';

const FILTERS = [
  { key: 'proximas', label: 'Próximas' },
  { key: 'andamento', label: 'Em andamento' },
  { key: 'finalizadas', label: 'Finalizadas' },
  { key: 'todas', label: 'Todas' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export default async function TripsPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const params = await searchParams;
  const trips = await listTrips();

  const counts = {
    proximas: trips.filter((t) => t.phase === 'upcoming').length,
    andamento: trips.filter((t) => t.phase === 'ongoing').length,
    finalizadas: trips.filter((t) => t.phase === 'past').length,
    todas: trips.length,
  };

  const requested = (params.filtro as FilterKey | undefined) ?? null;
  // Sem filtro explícito, mostramos a aba que tem conteúdo relevante.
  const active: FilterKey =
    requested && FILTERS.some((f) => f.key === requested)
      ? requested
      : counts.andamento > 0
        ? 'andamento'
        : counts.proximas > 0
          ? 'proximas'
          : 'todas';

  const filtered = trips.filter((trip) => {
    if (active === 'todas') return true;
    if (active === 'proximas') return trip.phase === 'upcoming';
    if (active === 'andamento') return trip.phase === 'ongoing';
    return trip.phase === 'past';
  });

  const sorted = [...filtered].sort((a, b) =>
    active === 'finalizadas' ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader
        title="Viagens"
        description="Todas as viagens que você criou ou participa, das próximas ao histórico."
        action={
          <Button asChild size="sm">
            <Link href="/viagens/nova">
              <Plus className="h-4 w-4" aria-hidden />
              Nova viagem
            </Link>
          </Button>
        }
      />

      <nav aria-label="Filtrar viagens" className="no-scrollbar mt-6 flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((filter) => (
          <Link
            key={filter.key}
            href={`/viagens?filtro=${filter.key}`}
            aria-current={active === filter.key ? 'page' : undefined}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors',
              active === filter.key
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-line-strong bg-surface text-ink-soft hover:text-ink',
            )}
          >
            {filter.label}
            <span className="ml-1.5 tabular opacity-60">{counts[filter.key]}</span>
          </Link>
        ))}
      </nav>

      {sorted.length === 0 ? (
        <EmptyState
          className="mt-6"
          icon={Luggage}
          title="Nenhuma viagem nesta aba"
          description={
            active === 'finalizadas'
              ? 'Quando uma viagem terminar, ela aparece aqui para consulta futura.'
              : 'Crie uma viagem para começar a organizar voos, hospedagem e roteiro.'
          }
          action={
            active !== 'finalizadas' && (
              <Button asChild>
                <Link href="/viagens/nova">
                  <Plus className="h-4 w-4" aria-hidden />
                  Nova viagem
                </Link>
              </Button>
            )
          }
        />
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
}
