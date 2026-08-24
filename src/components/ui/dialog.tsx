'use client';

import * as React from 'react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({
  className,
  children,
  size = 'md',
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const width = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-lg',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
  }[size];

  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay animate-fade-in" />
      <DialogPrimitive.Content
        className={cn(
          // Celular: folha que sobe de baixo. Desktop: diálogo centralizado.
          'fixed z-50 flex flex-col bg-surface shadow-float',
          'inset-x-0 bottom-0 max-h-[92dvh] rounded-t-[20px] animate-slide-up',
          'sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-h-[88dvh] sm:w-full sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-[18px]',
          width,
          className,
        )}
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

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('shrink-0 border-b border-line px-5 py-4 pr-14 sm:px-6', className)}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn('text-base font-semibold leading-tight text-ink', className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn('mt-1 text-[13px] text-ink-soft', className)} {...props} />
  );
}

export function DialogBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('flex-1 overflow-y-auto px-5 py-5 sm:px-6', className)} {...props} />;
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'shrink-0 flex flex-col-reverse gap-2 border-t border-line px-5 py-4 safe-bottom sm:flex-row sm:justify-end sm:px-6',
        className,
      )}
      {...props}
    />
  );
}
