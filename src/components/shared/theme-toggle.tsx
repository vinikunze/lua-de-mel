'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { Monitor, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';

const OPTIONS = [
  { value: 'light', label: 'Claro', icon: Sun },
  { value: 'dark', label: 'Escuro', icon: Moon },
  { value: 'system', label: 'Sistema', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Evita divergência entre servidor e cliente na primeira renderização.
  useEffect(() => setMounted(true), []);

  return (
    <div role="radiogroup" aria-label="Tema da interface" className="flex gap-2">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mounted && theme === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              'inline-flex items-center gap-2 rounded-[10px] border px-3.5 py-2 text-[13px] font-medium transition-colors',
              active
                ? 'border-accent bg-accent-soft text-accent-strong'
                : 'border-line-strong text-ink-soft hover:text-ink',
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
