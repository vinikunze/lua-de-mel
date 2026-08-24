import { Skeleton } from '@/components/ui/skeleton';

export default function TripLoading() {
  return (
    <div className="space-y-6" role="status" aria-label="Carregando">
      <Skeleton className="h-7 w-48" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="h-64 w-full" />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}
