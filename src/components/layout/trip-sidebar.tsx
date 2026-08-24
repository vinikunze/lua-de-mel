'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { GROUP_LABEL, tripNav } from '@/lib/navigation';
import { cn } from '@/lib/utils';

/** Navegação lateral do desktop. No celular quem manda é a barra inferior. */
export function TripSidebar({ tripId }: { tripId: string }) {
  const pathname = usePathname();
  const entries = tripNav(tripId);
  const home = entries[0];
  const groups = ['planejamento', 'reservas', 'organizacao'] as const;
  const loose = entries.filter((e) => !e.group && e !== home);

  const isActive = (href: string) =>
    href === `/viagens/${tripId}` ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  const link = (href: string, label: string, Icon: (typeof entries)[number]['icon']) => (
    <li key={href}>
      <Link
        href={href}
        aria-current={isActive(href) ? 'page' : undefined}
        className={cn(
          'flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-[13px] transition-colors',
          isActive(href)
            ? 'bg-surface-muted font-medium text-ink'
            : 'text-ink-soft hover:bg-surface-muted/60 hover:text-ink',
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="truncate">{label}</span>
      </Link>
    </li>
  );

  return (
    <nav aria-label="Seções da viagem" className="sticky top-20 space-y-5">
      <ul className="space-y-0.5">{link(home.href, home.label, home.icon)}</ul>

      {groups.map((group) => {
        const items = entries.filter((e) => e.group === group);
        if (items.length === 0) return null;
        return (
          <div key={group}>
            <h3 className="px-2.5 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
              {GROUP_LABEL[group]}
            </h3>
            <ul className="space-y-0.5">{items.map((e) => link(e.href, e.label, e.icon))}</ul>
          </div>
        );
      })}

      {loose.length > 0 && (
        <div className="border-t border-line pt-4">
          <ul className="space-y-0.5">{loose.map((e) => link(e.href, e.label, e.icon))}</ul>
        </div>
      )}
    </nav>
  );
}
