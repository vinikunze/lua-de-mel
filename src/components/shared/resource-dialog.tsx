'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

/**
 * Diálogo padrão de cadastro/edição.
 * Aceita abrir automaticamente via `?novo=1` — é assim que o botão de ação
 * rápida do celular leva direto ao formulário certo.
 */
export function ResourceDialog({
  title,
  description,
  triggerLabel,
  children,
  size = 'lg',
  autoOpenParam,
  trigger,
}: {
  title: string;
  description?: string;
  triggerLabel?: string;
  children: (close: () => void) => ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  autoOpenParam?: string;
  trigger?: ReactNode;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const shouldAutoOpen = Boolean(autoOpenParam) && searchParams.get(autoOpenParam ?? '') === '1';

  // O estado inicial já nasce aberto quando veio `?novo=1`, sem efeito extra.
  const [open, setOpen] = useState(shouldAutoOpen);

  useEffect(() => {
    // Limpa o parâmetro da URL para o diálogo não reabrir ao voltar.
    if (shouldAutoOpen) router.replace(window.location.pathname, { scroll: false });
  }, [shouldAutoOpen, router]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <Plus className="h-4 w-4" aria-hidden />
            {triggerLabel ?? 'Adicionar'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children(() => setOpen(false))}
      </DialogContent>
    </Dialog>
  );
}

/** Versão controlada, para editar um item já existente. */
export function EditDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'lg',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size={size}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}
