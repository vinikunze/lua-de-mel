'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Erro dentro de uma viagem: mantém o restante do aplicativo navegável. */
export default function TripError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[viagem]', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center rounded-[14px] border border-dashed border-line-strong bg-surface px-6 py-12 text-center">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-danger-soft">
        <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
      </div>
      <h2 className="text-[15px] font-semibold text-ink">Não foi possível carregar esta seção</h2>
      <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-ink-soft">
        Pode ter sido uma instabilidade momentânea. Tente novamente; se persistir, volte para a home da
        viagem.
      </p>
      <div className="mt-6 flex gap-2">
        <Button size="sm" onClick={reset}>
          Tentar de novo
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/viagens">Minhas viagens</Link>
        </Button>
      </div>
    </div>
  );
}
