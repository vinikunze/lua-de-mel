import type { ZodError } from 'zod';

export type FieldErrors = Record<string, string>;

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export function success<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

export function failure(error: string, fieldErrors?: FieldErrors): ActionResult<never> {
  return { ok: false, error, fieldErrors };
}

/** Converte os erros do Zod no formato que os formulários consomem. */
export function zodFailure(error: ZodError): ActionResult<never> {
  const fieldErrors: FieldErrors = {};
  for (const issue of error.issues) {
    const path = issue.path.join('.') || '_form';
    if (!fieldErrors[path]) fieldErrors[path] = issue.message;
  }
  const first = Object.values(fieldErrors)[0] ?? 'Revise os campos destacados.';
  return { ok: false, error: first, fieldErrors };
}
