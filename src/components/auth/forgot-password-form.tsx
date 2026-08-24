'use client';

import { useActionState } from 'react';
import { requestPasswordResetAction } from '@/server/actions/auth';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { Alert } from '@/components/ui/alert';
import type { ActionResult } from '@/server/action-result';

export function ForgotPasswordForm() {
  const [state, formAction] = useActionState<ActionResult<{ sent: true }> | null, FormData>(
    requestPasswordResetAction,
    null,
  );

  if (state?.ok) {
    return (
      <Alert tone="positive" title="Verifique seu e-mail">
        Se existir uma conta com esse endereço, o link de recuperação já está a caminho. O link vale por
        pouco tempo — use assim que receber.
      </Alert>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="E-mail" error={fieldError(state, 'email')} required>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        Enviar link
      </SubmitButton>
    </form>
  );
}
