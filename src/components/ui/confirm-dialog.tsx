'use client';

import * as React from 'react';
import { AlertDialog } from 'radix-ui';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
}

/**
 * Confirmação obrigatória para ações destrutivas: excluir viagem, reserva,
 * documento ou remover um participante.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  destructive = true,
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[18px] bg-surface p-6 shadow-float animate-slide-up">
          <AlertDialog.Title className="text-base font-semibold text-ink">{title}</AlertDialog.Title>
          {description && (
            <AlertDialog.Description className="mt-2 text-[13px] leading-relaxed text-ink-soft">
              {description}
            </AlertDialog.Description>
          )}
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <AlertDialog.Cancel className={cn(buttonVariants({ variant: 'outline' }))} disabled={loading}>
              {cancelLabel}
            </AlertDialog.Cancel>
            <button
              type="button"
              disabled={loading}
              onClick={() => void onConfirm()}
              className={cn(buttonVariants({ variant: destructive ? 'danger' : 'primary' }))}
            >
              {loading ? 'Aguarde…' : confirmLabel}
            </button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

/** Hook utilitário para acionar o diálogo em listas. */
export function useConfirm() {
  const [state, setState] = React.useState<{
    open: boolean;
    title: string;
    description?: React.ReactNode;
    confirmLabel?: string;
    onConfirm: () => void | Promise<void>;
  }>({ open: false, title: '', onConfirm: () => {} });
  const [loading, setLoading] = React.useState(false);

  const confirm = React.useCallback(
    (options: {
      title: string;
      description?: React.ReactNode;
      confirmLabel?: string;
      onConfirm: () => void | Promise<void>;
    }) => setState({ ...options, open: true }),
    [],
  );

  const dialog = (
    <ConfirmDialog
      open={state.open}
      onOpenChange={(open) => setState((s) => ({ ...s, open }))}
      title={state.title}
      description={state.description}
      confirmLabel={state.confirmLabel}
      loading={loading}
      onConfirm={async () => {
        setLoading(true);
        try {
          await state.onConfirm();
          setState((s) => ({ ...s, open: false }));
        } finally {
          setLoading(false);
        }
      }}
    />
  );

  return { confirm, dialog };
}
