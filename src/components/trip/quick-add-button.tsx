'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarPlus, FileUp, MapPin, Plus, Receipt, Ticket } from 'lucide-react';
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

/**
 * Botão flutuante "+" do celular.
 * Existe para o cenário real da viagem: anotar um gasto na fila do restaurante,
 * salvar um local que alguém indicou, subir a foto de um comprovante.
 */
export function QuickAddButton({ tripId, canEdit }: { tripId: string; canEdit: boolean }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  if (!canEdit) return null;
  if (pathname.includes('/pdf/documento')) return null;

  const base = `/viagens/${tripId}`;
  const options = [
    { href: `${base}/roteiro?novo=1`, label: 'Evento no roteiro', icon: CalendarPlus },
    { href: `${base}/financeiro?novo=1`, label: 'Despesa', icon: Receipt },
    { href: `${base}/locais?novo=1`, label: 'Local', icon: MapPin },
    { href: `${base}/documentos?novo=1`, label: 'Documento', icon: FileUp },
    { href: `${base}/voos?novo=1`, label: 'Reserva de voo', icon: Ticket },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        aria-label="Adicionar"
        className="fixed bottom-[4.75rem] right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-float transition-transform active:scale-95 lg:hidden print-hidden"
      >
        <Plus className="h-6 w-6" aria-hidden />
      </SheetTrigger>
      <SheetContent side="bottom" className="rounded-t-[20px]">
        <div className="border-b border-line px-5 py-4">
          <SheetTitle className="text-base font-semibold text-ink">Adicionar</SheetTitle>
        </div>
        <ul className="space-y-1 p-3 safe-bottom">
          {options.map((option) => {
            const Icon = option.icon;
            return (
              <li key={option.href}>
                <Link
                  href={option.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 rounded-[12px] px-3 py-3.5 text-[14px] font-medium text-ink transition-colors active:bg-surface-muted"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-surface-muted">
                    <Icon className="h-4 w-4 text-ink-soft" aria-hidden />
                  </span>
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </SheetContent>
    </Sheet>
  );
}
