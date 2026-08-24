'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { EventIcon } from '@/components/trip/event-row';

export interface SearchEntry {
  id: string;
  title: string;
  subtitle: string | null;
  detail: string | null;
  category: string;
  section: string;
  href: string;
  /** Texto concatenado usado na busca — evita refazer a normalização a cada tecla. */
  haystack: string;
}

/** Remove acentos para que "sao pedro" encontre "São Pedro". */
function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function buildHaystack(...parts: Array<string | null | undefined>): string {
  return normalize(parts.filter(Boolean).join(' '));
}

export function TripSearch({ entries }: { entries: SearchEntry[] }) {
  const [query, setQuery] = useState('');

  const results = useMemo(() => {
    const term = normalize(query.trim());
    if (term.length < 2) return [];
    const words = term.split(/\s+/);
    return entries.filter((entry) => words.every((word) => entry.haystack.includes(word))).slice(0, 60);
  }, [entries, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, SearchEntry[]>();
    for (const entry of results) {
      const bucket = map.get(entry.section);
      if (bucket) bucket.push(entry);
      else map.set(entry.section, [entry]);
    }
    return [...map.entries()];
  }, [results]);

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
          aria-hidden
        />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Restaurante, localizador, hotel, documento, endereço…"
          className="h-12 pl-10 text-[15px]"
          aria-label="Buscar na viagem"
          autoFocus
        />
      </div>

      {query.trim().length < 2 ? (
        <p className="text-[13px] text-ink-soft">
          Digite ao menos duas letras. A busca cobre voos, hospedagens, carro, roteiro, locais, despesas,
          documentos, contatos e links desta viagem.
        </p>
      ) : results.length === 0 ? (
        <EmptyState
          icon={Search}
          compact
          title="Nada encontrado"
          description={`Nenhum resultado para "${query}". Tente outra palavra ou parte do código da reserva.`}
        />
      ) : (
        <div className="space-y-5">
          {grouped.map(([section, items]) => (
            <section key={section}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                {section}
                <span className="ml-2 tabular">{items.length}</span>
              </h2>
              <Card className="divide-y divide-line">
                {items.map((entry) => (
                  <Link
                    key={entry.id}
                    href={entry.href}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-muted"
                  >
                    <EventIcon category={entry.category} className="h-8 w-8" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-medium text-ink">{entry.title}</p>
                      {entry.subtitle && (
                        <p className="truncate text-[12px] text-ink-soft">{entry.subtitle}</p>
                      )}
                    </div>
                    {entry.detail && (
                      <Badge tone="outline" className="shrink-0">
                        {entry.detail}
                      </Badge>
                    )}
                  </Link>
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
