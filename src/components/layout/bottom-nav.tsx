'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, MoreHorizontal, Plus, Luggage, User } from 'lucide-react';
import { GROUP_LABEL, tripIdFromPath, tripNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { useState } from 'react';

/**
 * Navegação inferior — a principal forma de navegar no celular.
 * Dentro de uma viagem mostra Início / Roteiro / Mapa / Gastos / Mais;
 * fora dela, a navegação geral do aplicativo.
 */
export function BottomNav() {
  const pathname = usePathname();
  const tripId = tripIdFromPath(pathname);
  const [moreOpen, setMoreOpen] = useState(false);

  if (pathname.startsWith('/viagens/') && pathname.endsWith('/pdf/documento')) return null;

  const entries = tripId
    ? tripNav(tripId).filter((e) => e.primary)
    : [
        { href: '/', label: 'Início', icon: Home },
        { href: '/viagens', label: 'Viagens', icon: Luggage },
        { href: '/viagens/nova', label: 'Nova', icon: Plus },
        { href: '/perfil', label: 'Perfil', icon: User },
      ];

  const isActive = (href: string) =>
    href === '/' || (tripId && href === `/viagens/${tripId}`)
      ? pathname === href
      : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <nav
      data-bottom-nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 backdrop-blur-lg lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = isActive(entry.href);
          return (
            <li key={entry.href} className="flex-1">
              <Link
                href={entry.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  // Alvo de toque de 56px de altura — confortável com o celular na mão
                  'flex h-14 flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                  active ? 'text-accent' : 'text-ink-faint',
                )}
              >
                <Icon className="h-[21px] w-[21px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                {entry.label}
              </Link>
            </li>
          );
        })}

        {tripId && (
          <li className="flex-1">
            <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
              <SheetTrigger
                className={cn(
                  'flex h-14 w-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-ink-faint transition-colors',
                )}
              >
                <MoreHorizontal className="h-[21px] w-[21px]" strokeWidth={1.8} aria-hidden />
                Mais
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-[20px]">
                <div className="border-b border-line px-5 py-4">
                  <SheetTitle className="text-base font-semibold text-ink">Tudo da viagem</SheetTitle>
                </div>
                <div className="overflow-y-auto px-3 py-4 safe-bottom">
                  <MoreLinks tripId={tripId} onNavigate={() => setMoreOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          </li>
        )}
      </ul>
    </nav>
  );
}

function MoreLinks({ tripId, onNavigate }: { tripId: string; onNavigate: () => void }) {
  const entries = tripNav(tripId).filter((e) => !e.primary);
  const groups = ['reservas', 'planejamento', 'organizacao'] as const;

  return (
    <div className="space-y-5">
      {groups.map((group) => {
        const items = entries.filter((e) => e.group === group);
        if (items.length === 0) return null;
        return (
          <section key={group}>
            <h3 className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              {GROUP_LABEL[group]}
            </h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {items.map((entry) => {
                const Icon = entry.icon;
                return (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      onClick={onNavigate}
                      className="flex items-center gap-2.5 rounded-[12px] bg-surface-muted px-3 py-3 text-[13px] font-medium text-ink"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                      <span className="truncate">{entry.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <section>
        <ul className="grid grid-cols-2 gap-1.5">
          {entries
            .filter((e) => !e.group)
            .map((entry) => {
              const Icon = entry.icon;
              return (
                <li key={entry.href}>
                  <Link
                    href={entry.href}
                    onClick={onNavigate}
                    className="flex items-center gap-2.5 rounded-[12px] border border-line px-3 py-3 text-[13px] font-medium text-ink"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-ink-soft" aria-hidden />
                    <span className="truncate">{entry.label}</span>
                  </Link>
                </li>
              );
            })}
        </ul>
      </section>
    </div>
  );
}
