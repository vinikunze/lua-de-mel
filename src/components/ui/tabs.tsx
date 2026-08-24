'use client';

import * as React from 'react';
import { Tabs as Primitive } from 'radix-ui';
import { cn } from '@/lib/utils';

export const Tabs = Primitive.Root;

export function TabsList({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.List>) {
  return (
    <Primitive.List
      className={cn(
        'no-scrollbar flex gap-1 overflow-x-auto rounded-[12px] bg-surface-muted p-1',
        className,
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      className={cn(
        'flex-1 whitespace-nowrap rounded-[9px] px-3 py-1.5 text-[13px] font-medium text-ink-soft transition-colors',
        'data-[state=active]:bg-surface data-[state=active]:text-ink data-[state=active]:shadow-card',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: React.ComponentPropsWithoutRef<typeof Primitive.Content>) {
  return <Primitive.Content className={cn('mt-4 focus-visible:outline-none', className)} {...props} />;
}
