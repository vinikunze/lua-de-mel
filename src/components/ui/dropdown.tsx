'use client';

import * as React from 'react';
import { DropdownMenu as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Dropdown = Primitive.Root;
export const DropdownTrigger = Primitive.Trigger;

export function DropdownContent({
  className,
  align = 'end',
  sideOffset = 6,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'z-50 min-w-[200px] overflow-hidden rounded-[12px] border border-line bg-surface p-1 shadow-float animate-fade-in',
          className,
        )}
        {...props}
      />
    </Primitive.Portal>
  );
}

export function DropdownItem({
  className,
  destructive = false,
  ...props
}: React.ComponentPropsWithoutRef<typeof Primitive.Item> & { destructive?: boolean }) {
  return (
    <Primitive.Item
      className={cn(
        'flex cursor-pointer select-none items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-ink outline-none',
        'data-[highlighted]:bg-surface-muted data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
        destructive && 'text-danger data-[highlighted]:bg-danger-soft',
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator({ className }: { className?: string }) {
  return <Primitive.Separator className={cn('my-1 h-px bg-line', className)} />;
}

export function DropdownLabel({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      className={cn('px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint', className)}
      {...props}
    />
  );
}
