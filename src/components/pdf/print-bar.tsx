'use client';

import Link from 'next/link';
import { ArrowLeft, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Barra de ações que some na impressão. */
export function PrintBar({ tripId, tripName }: { tripId: string; tripName: string }) {
  return (
    <div className="print-hidden mb-6 flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-line bg-surface px-4 py-3">
      <div className="min-w-0">
        <p className="truncate text-[13px] font-medium text-ink">{tripName}</p>
        <p className="text-[12px] text-ink-soft">
          Use &ldquo;Salvar como PDF&rdquo; no destino da impressão para gerar o arquivo.
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href={`/viagens/${tripId}/pdf`}>
            <ArrowLeft className="h-4 w-4" aria-hidden />
            Opções
          </Link>
        </Button>
        <Button size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4" aria-hidden />
          Imprimir
        </Button>
      </div>
    </div>
  );
}
