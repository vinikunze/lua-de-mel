import {
  BedDouble, CalendarDays, Car, CheckSquare, FileText, Home, Link2, Map, MapPin,
  Phone, Plane, Route, Search, Settings, Users, Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavEntry {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Aparece na barra inferior do celular. */
  primary?: boolean;
  group?: 'planejamento' | 'reservas' | 'organizacao';
}

export function tripNav(tripId: string): NavEntry[] {
  const base = `/viagens/${tripId}`;
  return [
    { href: base, label: 'Início', icon: Home, primary: true },
    { href: `${base}/roteiro`, label: 'Roteiro', icon: CalendarDays, primary: true, group: 'planejamento' },
    { href: `${base}/mapa`, label: 'Mapa', icon: Map, primary: true, group: 'planejamento' },
    { href: `${base}/financeiro`, label: 'Gastos', icon: Wallet, primary: true, group: 'organizacao' },
    { href: `${base}/calendario`, label: 'Calendário', icon: CalendarDays, group: 'planejamento' },
    { href: `${base}/voos`, label: 'Voos', icon: Plane, group: 'reservas' },
    { href: `${base}/hospedagens`, label: 'Hospedagens', icon: BedDouble, group: 'reservas' },
    { href: `${base}/carros`, label: 'Aluguel de carro', icon: Car, group: 'reservas' },
    { href: `${base}/locais`, label: 'Locais', icon: MapPin, group: 'planejamento' },
    { href: `${base}/rotas`, label: 'Rotas', icon: Route, group: 'planejamento' },
    { href: `${base}/documentos`, label: 'Documentos', icon: FileText, group: 'organizacao' },
    { href: `${base}/checklist`, label: 'Checklist', icon: CheckSquare, group: 'organizacao' },
    { href: `${base}/informacoes`, label: 'Informações rápidas', icon: Phone, group: 'organizacao' },
    { href: `${base}/links`, label: 'Links rápidos', icon: Link2, group: 'organizacao' },
    { href: `${base}/participantes`, label: 'Participantes', icon: Users, group: 'organizacao' },
    { href: `${base}/busca`, label: 'Buscar na viagem', icon: Search },
    { href: `${base}/pdf`, label: 'Gerar PDF', icon: FileText },
    { href: `${base}/configuracoes`, label: 'Configurações', icon: Settings },
  ];
}

export const GROUP_LABEL: Record<string, string> = {
  planejamento: 'Planejamento',
  reservas: 'Reservas',
  organizacao: 'Organização',
};

/** Extrai o id da viagem de um caminho como /viagens/<uuid>/roteiro. */
export function tripIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/viagens\/([0-9a-fA-F-]{36})/);
  return match ? match[1] : null;
}
