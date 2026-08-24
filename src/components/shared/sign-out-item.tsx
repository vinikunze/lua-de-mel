'use client';

import { useRef } from 'react';
import { LogOut } from 'lucide-react';
import { signOutAction } from '@/server/actions/auth';

/**
 * Sair da conta limpando o cache de páginas do service worker.
 * Sem isso, em um aparelho compartilhado a próxima pessoa poderia ver páginas
 * da viagem de quem usou antes.
 */
export function SignOutItem({ className }: { className?: string }) {
  const formRef = useRef<HTMLFormElement>(null);

  async function clearCachesAndSubmit(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        registration?.active?.postMessage({ type: 'limpar-cache' });
      }
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key.startsWith('nv-pages')).map((key) => caches.delete(key)));
      }
    } catch {
      // Limpar o cache é um cuidado extra: se falhar, o logout continua.
    }
    formRef.current?.requestSubmit();
  }

  return (
    <form ref={formRef} action={signOutAction} className={className}>
      <button type="submit" onClick={clearCachesAndSubmit} className="flex w-full items-center gap-2.5">
        <LogOut className="h-4 w-4" aria-hidden />
        Sair
      </button>
    </form>
  );
}
