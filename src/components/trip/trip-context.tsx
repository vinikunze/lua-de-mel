'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { MemberRole, TripRow } from '@/types/database';
import type { GoogleCapabilities } from '@/lib/google/config';
import { can, type Ability } from '@/lib/permissions';

interface TripContextValue {
  trip: TripRow;
  role: MemberRole;
  google: GoogleCapabilities;
  members: Array<{ id: string; name: string; userId: string | null }>;
}

const TripContext = createContext<TripContextValue | null>(null);

export function TripProvider({ value, children }: { value: TripContextValue; children: ReactNode }) {
  return <TripContext.Provider value={value}>{children}</TripContext.Provider>;
}

export function useTrip(): TripContextValue {
  const context = useContext(TripContext);
  if (!context) throw new Error('useTrip precisa estar dentro de <TripProvider>.');
  return context;
}

/** Atalho para esconder botões que o papel do usuário não permite. */
export function useCan(ability: Ability): boolean {
  const { role } = useTrip();
  return can(role, ability);
}
