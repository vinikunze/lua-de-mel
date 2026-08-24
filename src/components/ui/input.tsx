import * as React from 'react';
import { cn } from '@/lib/utils';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, type = 'text', ...props }, ref) {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          'h-11 w-full rounded-[12px] border border-line-strong bg-surface px-3.5 text-ink',
          'placeholder:text-ink-faint',
          'transition-colors focus:border-accent focus:outline-none focus-visible:outline-none',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 3, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        'w-full rounded-[12px] border border-line-strong bg-surface px-3.5 py-2.5 text-ink',
        'placeholder:text-ink-faint resize-y min-h-[80px]',
        'transition-colors focus:border-accent focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70',
        'aria-[invalid=true]:border-danger',
        className,
      )}
      {...props}
    />
  );
});

/**
 * Select nativo por decisão de UX: no celular abre o seletor do sistema,
 * que é mais rápido e acessível que qualquer dropdown customizado.
 */
export const Select = React.forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...props }, ref) {
  return (
    <div className="relative">
      <select
        ref={ref}
        className={cn(
          'h-11 w-full appearance-none rounded-[12px] border border-line-strong bg-surface pl-3.5 pr-9 text-ink',
          'transition-colors focus:border-accent focus:outline-none',
          'disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70',
          'aria-[invalid=true]:border-danger',
          className,
        )}
        {...props}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
      >
        <path d="m6 8 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
});
