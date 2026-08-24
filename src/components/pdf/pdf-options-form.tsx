'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileDown, FileText, Printer } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import {
  PDF_SECTIONS, defaultOptions, optionsToQuery, type PdfMode, type PdfOptions,
} from '@/lib/pdf/options';

/**
 * Escolha do que entra no PDF antes de gerar.
 * As opções viajam pela URL, então o documento fica reimprimível com o mesmo
 * conteúdo e pode ser guardado como favorito.
 */
export function PdfOptionsForm({ tripId }: { tripId: string }) {
  const [mode, setMode] = useState<PdfMode>('completo');
  const [options, setOptions] = useState<PdfOptions>(() => defaultOptions('completo'));

  function changeMode(next: PdfMode) {
    setMode(next);
    setOptions(defaultOptions(next));
  }

  const href = `/viagens/${tripId}/pdf/documento?${optionsToQuery({ ...options, mode })}`;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        <ModeCard
          active={mode === 'resumido'}
          title="PDF resumido"
          description="Voos, hospedagem, carro, roteiro, endereços, contatos e mapas. Ideal para levar impresso ou consultar no celular."
          icon={FileText}
          onSelect={() => changeMode('resumido')}
        />
        <ModeCard
          active={mode === 'completo'}
          title="PDF completo"
          description="Tudo o que está no resumido, mais financeiro, checklist, documentos e observações."
          icon={FileDown}
          onSelect={() => changeMode('completo')}
        />
      </div>

      <Card>
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-ink">O que incluir</h2>
          <p className="mt-1 text-[12px] text-ink-soft">
            Desmarque o que não quiser no documento. Voos, hospedagem, carro e roteiro entram sempre.
          </p>

          <div className="mt-4 space-y-3">
            {PDF_SECTIONS.map((section) => (
              <label key={section.key} className="flex items-start gap-3">
                <Checkbox
                  checked={options[section.key]}
                  onCheckedChange={(checked) =>
                    setOptions((current) => ({ ...current, [section.key]: checked === true }))
                  }
                  aria-label={section.label}
                  className="mt-0.5"
                />
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink">{section.label}</span>
                  <span className="block text-[12px] text-ink-soft">{section.hint}</span>
                </span>
              </label>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button asChild size="lg">
          <Link href={href}>
            <Printer className="h-4 w-4" aria-hidden />
            Gerar PDF
          </Link>
        </Button>
        <p className="text-[12px] leading-relaxed text-ink-soft">
          O documento abre pronto para impressão. No navegador, escolha{' '}
          <strong className="font-medium text-ink">Salvar como PDF</strong> no destino da impressão — no
          celular, a opção aparece em &ldquo;Compartilhar → Imprimir&rdquo;.
        </p>
      </div>
    </div>
  );
}

function ModeCard({
  active,
  title,
  description,
  icon: Icon,
  onSelect,
}: {
  active: boolean;
  title: string;
  description: string;
  icon: typeof FileText;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        'rounded-[14px] border p-4 text-left transition-colors',
        active ? 'border-accent bg-accent-soft' : 'border-line bg-surface hover:border-line-strong',
      )}
    >
      <Icon className={cn('h-5 w-5', active ? 'text-accent' : 'text-ink-faint')} aria-hidden />
      <h3 className="mt-2.5 text-[14px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 text-[12.5px] leading-relaxed text-ink-soft">{description}</p>
    </button>
  );
}
