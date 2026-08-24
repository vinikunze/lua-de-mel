'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Moon, Plus, Settings, Sun, User as UserIcon } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger,
} from '@/components/ui/dropdown';
import { SignOutItem } from '@/components/shared/sign-out-item';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  userName: string | null;
  userEmail: string | null;
  avatarUrl: string | null;
}

export function AppHeader({ userName, userEmail, avatarUrl }: AppHeaderProps) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();

  const links = [
    { href: '/', label: 'Início' },
    { href: '/viagens', label: 'Viagens' },
  ];

  return (
    <header
      data-app-header
      className="sticky top-0 z-30 border-b border-line bg-canvas/85 backdrop-blur-lg safe-top"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="shrink-0" aria-label="Ir para o início">
          <Logo size="sm" />
        </Link>

        <nav aria-label="Seções" className="ml-2 hidden items-center gap-1 lg:flex">
          {links.map((link) => {
            const active = link.href === '/' ? pathname === '/' : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-[10px] px-3 py-1.5 text-[13px] font-medium transition-colors',
                  active ? 'bg-surface-muted text-ink' : 'text-ink-soft hover:text-ink',
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Button asChild size="sm" variant="primary" className="hidden sm:inline-flex">
            <Link href="/viagens/nova">
              <Plus className="h-4 w-4" aria-hidden />
              Nova viagem
            </Link>
          </Button>

          <Dropdown>
            <DropdownTrigger
              className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Sua conta"
            >
              <Avatar name={userName} src={avatarUrl} size="sm" />
            </DropdownTrigger>
            <DropdownContent>
              <DropdownLabel>{userName ?? 'Sua conta'}</DropdownLabel>
              {userEmail && (
                <p className="truncate px-2.5 pb-2 text-[12px] text-ink-faint">{userEmail}</p>
              )}
              <DropdownSeparator />
              <DropdownItem asChild>
                <Link href="/perfil">
                  <UserIcon className="h-4 w-4" aria-hidden />
                  Meu perfil
                </Link>
              </DropdownItem>
              <DropdownItem asChild>
                <Link href="/configurar">
                  <Settings className="h-4 w-4" aria-hidden />
                  Integrações
                </Link>
              </DropdownItem>
              <DropdownItem
                onSelect={(event) => {
                  event.preventDefault();
                  setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
                }}
              >
                {resolvedTheme === 'dark' ? (
                  <Sun className="h-4 w-4" aria-hidden />
                ) : (
                  <Moon className="h-4 w-4" aria-hidden />
                )}
                {resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
              </DropdownItem>
              <DropdownSeparator />
              <DropdownItem asChild destructive>
                <SignOutItem />
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        </div>
      </div>
    </header>
  );
}
