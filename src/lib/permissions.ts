/**
 * Permissões da viagem.
 *
 * Estas funções são a versão de interface das políticas de RLS — servem para
 * esconder botões e evitar chamadas inúteis. A garantia real está no banco:
 * mesmo que alguém burle a interface, o Postgres recusa a operação.
 */
import type { MemberRole } from '@/types/database';

export type Ability =
  | 'trip:view'
  | 'trip:edit'
  | 'trip:delete'
  | 'trip:invite'
  | 'members:manage'
  | 'content:create'
  | 'content:edit'
  | 'content:delete'
  | 'documents:upload'
  | 'documents:delete'
  | 'documents:view'
  | 'pdf:generate';

const ABILITIES: Record<MemberRole, Ability[]> = {
  owner: [
    'trip:view', 'trip:edit', 'trip:delete', 'trip:invite', 'members:manage',
    'content:create', 'content:edit', 'content:delete',
    'documents:upload', 'documents:delete', 'documents:view', 'pdf:generate',
  ],
  editor: [
    'trip:view', 'trip:edit',
    'content:create', 'content:edit', 'content:delete',
    'documents:upload', 'documents:view', 'pdf:generate',
  ],
  viewer: ['trip:view', 'documents:view', 'pdf:generate'],
};

export function can(role: MemberRole | null | undefined, ability: Ability): boolean {
  if (!role) return false;
  return ABILITIES[role].includes(ability);
}

export function isOwner(role: MemberRole | null | undefined): boolean {
  return role === 'owner';
}

export function canEdit(role: MemberRole | null | undefined): boolean {
  return role === 'owner' || role === 'editor';
}

export const ROLE_LABEL: Record<MemberRole, string> = {
  owner: 'Proprietário',
  editor: 'Editor',
  viewer: 'Visualizador',
};

export const ROLE_DESCRIPTION: Record<MemberRole, string> = {
  owner: 'Controle total: edita, exclui, convida e gerencia participantes.',
  editor: 'Pode visualizar, adicionar e editar informações da viagem.',
  viewer: 'Pode visualizar, gerar PDF e acessar mapas e documentos.',
};
