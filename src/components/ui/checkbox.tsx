'use client';

import * as React from 'react';
import { Checkbox as Primitive, Switch as SwitchPrimitive } from 'radix-ui';
import { Check, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Checkbox = React.forwardRef<
  React.ComponentRef<typeof Primitive.Root>,
  React.ComponentPropsWithoutRef<typeof Primitive.Root>
>(function Checkbox({ className, ...props }, ref) {
  return (
    <Primitive.Root
      ref={ref}
      className={cn(
        // Alvo de toque confortável no celular
        'peer flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border border-line-strong bg-surface',
        'transition-colors data-[state=checked]:border-accent data-[state=checked]:bg-accent',
        'data-[state=indeterminate]:border-accent data-[state=indeterminate]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <Primitive.Indicator className="text-white">
        {props.checked === 'indeterminate' ? (
          <Minus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        ) : (
          <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
        )}
      </Primitive.Indicator>
    </Primitive.Root>
  );
});

export const Switch = React.forwardRef<
  React.ComponentRef<typeof SwitchPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>
>(function Switch({ className, ...props }, ref) {
  return (
    <SwitchPrimitive.Root
      ref={ref}
      className={cn(
        'peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent',
        'bg-line-strong transition-colors data-[state=checked]:bg-accent',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block h-5 w-5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0" />
    </SwitchPrimitive.Root>
  );
});
