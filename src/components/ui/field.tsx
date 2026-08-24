'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

const FieldContext = React.createContext<{ id: string; errorId: string; hasError: boolean } | null>(null);

export function useFieldContext() {
  return React.useContext(FieldContext);
}

interface FieldProps {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
  /** Deixa o campo ocupar a linha inteira em grades de duas colunas. */
  full?: boolean;
}

/**
 * Envelope padrão de campo: rótulo associado, dica, erro com aria-describedby.
 * Todo formulário do sistema usa este componente para manter a acessibilidade.
 */
export function Field({ label, hint, error, required, className, children, full }: FieldProps) {
  const id = React.useId();
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  const child = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': [error ? errorId : null, hint ? hintId : null].filter(Boolean).join(' ') || undefined,
        'aria-required': required || undefined,
      })
    : children;

  return (
    <FieldContext.Provider value={{ id, errorId, hasError: Boolean(error) }}>
      <div className={cn('flex flex-col gap-1.5', full && 'sm:col-span-2', className)}>
        {label && (
          <label htmlFor={id} className="text-[13px] font-medium text-ink">
            {label}
            {required && <span className="ml-0.5 text-danger" aria-hidden>*</span>}
          </label>
        )}
        {child}
        {hint && !error && (
          <p id={hintId} className="text-xs leading-relaxed text-ink-faint">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-danger">
            {error}
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

export function FieldGroup({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <fieldset className={cn('space-y-4', className)}>
      <legend className="sr-only">{title}</legend>
      <div>
        <h3 className="text-sm font-semibold text-ink">{title}</h3>
        {description && <p className="mt-0.5 text-[13px] text-ink-soft">{description}</p>}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}
