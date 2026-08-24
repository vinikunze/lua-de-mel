import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/shared/logo';

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
      <Logo className="mx-auto mb-8" />
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <Compass className="h-5 w-5 text-ink-faint" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-ink">Página não encontrada</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        O endereço não existe, ou a viagem que você procura foi removida — ou você não tem mais acesso a ela.
      </p>
      <div className="mt-7 flex justify-center gap-2">
        <Button asChild>
          <Link href="/">Ir para o início</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/viagens">Minhas viagens</Link>
        </Button>
      </div>
    </main>
  );
}
