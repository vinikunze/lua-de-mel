'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;

/** Painel lateral (desktop) / folha inferior (celular). */
export function SheetContent({
  className,
  children,
  side = 'right',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { side?: 'right' | 'left' | 'bottom' }) {
  const position =
    side === 'bottom'
      ? 'inset-x-0 bottom-0 max-h-[90dvh] rounded-t-[20px] animate-slide-up'
      : side === 'left'
        ? 'inset-y-0 left-0 w-[88vw] max-w-sm animate-slide-in-right'
        : 'inset-y-0 right-0 w-[88vw] max-w-sm animate-slide-in-right';

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
      <DialogPrimitive.Content
        className={cn('fixed z-50 flex flex-col bg-surface shadow-float', position, className)}
        {...props}
      >
        {children}
        <DialogPrimitive.Close
          className="absolute right-4 top-4 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-muted hover:text-ink"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" aria-hidden />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export const SheetTitle = DialogPrimitive.Title;
export const SheetDescription = DialogPrimitive.Description;
