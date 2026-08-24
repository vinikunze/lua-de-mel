import type { Metadata } from 'next';
import { WifiOff } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { OfflineActions } from '@/components/shared/offline-actions';

export const metadata: Metadata = { title: 'Sem conexão' };

/**
 * Página mostrada quando não há rede e a página pedida não está em cache.
 * Precisa ser estática — é ela que o service worker guarda na instalação.
 */
export default function OfflinePage() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-5 text-center">
      <Logo className="mx-auto mb-8" />
      <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-surface-muted">
        <WifiOff className="h-5 w-5 text-ink-faint" aria-hidden />
      </div>
      <h1 className="text-xl font-semibold text-ink">Você está sem conexão</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        As páginas que você já abriu continuam disponíveis — roteiro, voos, reservas e endereços ficam
        guardados no aparelho. Esta em especial ainda não tinha sido carregada.
      </p>
      <OfflineActions />
      <p className="mt-8 text-[12px] leading-relaxed text-ink-faint">
        Dica: antes de viajar, abra as seções que você vai precisar e gere o PDF da viagem. Assim tudo fica
        acessível mesmo sem internet.
      </p>
    </main>
  );
}
