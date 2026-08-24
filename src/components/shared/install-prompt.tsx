'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Download, Share, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { APP } from '@/lib/config';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const DISMISS_KEY = 'nv:instalacao-dispensada';

/**
 * O ambiente do navegador é lido com `useSyncExternalStore` em vez de efeito +
 * setState: no servidor o valor é sempre "não mostrar" e no cliente vem certo já
 * na primeira renderização, sem piscar nem provocar renderização em cascata.
 */
const subscribeToNothing = () => () => {};

function readEnvironment(): 'hidden' | 'ios' | 'waiting' {
  try {
    if (localStorage.getItem(DISMISS_KEY) === '1') return 'hidden';
  } catch {
    // Navegador com armazenamento bloqueado: seguimos mostrando o convite.
  }

  const standalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as { standalone?: boolean }).standalone === true;
  if (standalone) return 'hidden';

  return /iphone|ipad|ipod/i.test(window.navigator.userAgent) ? 'ios' : 'waiting';
}

/**
 * Convite para instalar o aplicativo na tela inicial.
 *
 * No Android e no desktop usamos o evento nativo de instalação; no iOS o
 * navegador não oferece esse evento, então explicamos o caminho manual.
 * A dispensa fica no localStorage — é preferência de interface, não dado.
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  const environment = useSyncExternalStore(
    subscribeToNothing,
    readEnvironment,
    () => 'hidden' as const,
  );

  const iosHint = environment === 'ios';
  const visible = !dismissed && environment !== 'hidden' && (iosHint || deferred !== null);

  useEffect(() => {
    if (environment !== 'waiting') return;

    function onPrompt(event: Event) {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    }

    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, [environment]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // Sem armazenamento o convite volta na próxima visita; é aceitável.
    }
  }

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  }

  if (!visible) return null;

  return (
    <div className="print-hidden fixed inset-x-3 bottom-[4.75rem] z-30 rounded-[14px] border border-line bg-surface p-4 shadow-float lg:inset-x-auto lg:bottom-5 lg:right-5 lg:max-w-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted">
          <Download className="h-4 w-4 text-ink-soft" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-ink">Instalar o {APP.name}</p>
          {iosHint ? (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Toque em{' '}
              <Share className="inline h-3.5 w-3.5 align-text-bottom" aria-label="Compartilhar" /> e escolha
              &ldquo;Adicionar à Tela de Início&rdquo; para usar como aplicativo, com acesso offline ao
              roteiro.
            </p>
          ) : (
            <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
              Adicione à tela inicial para abrir mais rápido e consultar o roteiro mesmo sem internet.
            </p>
          )}
          {!iosHint && (
            <Button size="sm" className="mt-3" onClick={install}>
              Instalar
            </Button>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dispensar"
          className="shrink-0 rounded p-1 text-ink-faint transition-colors hover:text-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
