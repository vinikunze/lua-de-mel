import { Alert } from '@/components/ui/alert';
import type { ActionResult } from '@/server/action-result';

/** Erro geral do formulário (o que não pertence a um campo específico). */
export function FormError({ state }: { state: ActionResult<unknown> | null | undefined }) {
  if (!state || state.ok) return null;
  return (
    <Alert tone="danger" className="mb-1">
      {state.error}
    </Alert>
  );
}

export function fieldError(state: ActionResult<unknown> | null | undefined, field: string): string | null {
  if (!state || state.ok) return null;
  return state.fieldErrors?.[field] ?? null;
}
