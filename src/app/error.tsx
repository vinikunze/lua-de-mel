'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Barreira de erro global.
 * O usuário vê uma mensagem útil; o detalhe técnico vai só para o console
 * do servidor e para o log do navegador — nunca para a tela.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[erro]', error);
  }, [error]);

  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-danger-soft">
        <AlertTriangle className="h-5 w-5 text-danger" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-ink">Algo deu errado</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        Não conseguimos carregar esta parte do aplicativo. Seus dados estão salvos — tente novamente em
        alguns instantes.
      </p>
      {error.digest && (
        <p className="mt-3 font-mono text-[11px] text-ink-faint">Código: {error.digest}</p>
      )}
      <div className="mt-7 flex justify-center gap-2">
        <Button onClick={reset}>Tentar de novo</Button>
        <Button asChild variant="outline">
          <Link href="/">Ir para o início</Link>
        </Button>
      </div>
    </main>
  );
}
