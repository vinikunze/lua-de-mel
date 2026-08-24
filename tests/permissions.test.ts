import { describe, expect, it } from 'vitest';
import { can, canEdit, isOwner, ROLE_LABEL } from '@/lib/permissions';
import type { MemberRole } from '@/types/database';

/**
 * Estas regras espelham as políticas de RLS. Se um teste aqui mudar de
 * resultado, a política equivalente no banco também precisa mudar.
 */
describe('permissões por papel', () => {
  it('proprietário pode tudo', () => {
    expect(can('owner', 'trip:edit')).toBe(true);
    expect(can('owner', 'trip:delete')).toBe(true);
    expect(can('owner', 'members:manage')).toBe(true);
    expect(can('owner', 'documents:delete')).toBe(true);
  });

  it('editor altera conteúdo, mas não exclui a viagem nem gerencia participantes', () => {
    expect(can('editor', 'content:create')).toBe(true);
    expect(can('editor', 'content:edit')).toBe(true);
    expect(can('editor', 'documents:upload')).toBe(true);
    expect(can('editor', 'trip:delete')).toBe(false);
    expect(can('editor', 'members:manage')).toBe(false);
    expect(can('editor', 'trip:invite')).toBe(false);
  });

  it('visualizador apenas consulta, gera PDF e vê documentos', () => {
    expect(can('viewer', 'trip:view')).toBe(true);
    expect(can('viewer', 'pdf:generate')).toBe(true);
    expect(can('viewer', 'documents:view')).toBe(true);
    expect(can('viewer', 'content:create')).toBe(false);
    expect(can('viewer', 'content:edit')).toBe(false);
    expect(can('viewer', 'documents:upload')).toBe(false);
    expect(can('viewer', 'trip:edit')).toBe(false);
  });

  it('sem papel definido não pode nada', () => {
    expect(can(null, 'trip:view')).toBe(false);
    expect(can(undefined, 'pdf:generate')).toBe(false);
    expect(canEdit(null)).toBe(false);
    expect(isOwner(null)).toBe(false);
  });

  it('canEdit cobre proprietário e editor', () => {
    expect(canEdit('owner')).toBe(true);
    expect(canEdit('editor')).toBe(true);
    expect(canEdit('viewer')).toBe(false);
  });

  it('todo papel tem rótulo em português', () => {
    for (const role of ['owner', 'editor', 'viewer'] as MemberRole[]) {
      expect(ROLE_LABEL[role]).toBeTruthy();
    }
  });
});
