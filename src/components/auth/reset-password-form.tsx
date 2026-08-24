'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updatePasswordAction } from '@/server/actions/auth';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { toast } from '@/components/ui/toaster';
import type { ActionResult } from '@/server/action-result';

export function ResetPasswordForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult<{ updated: true }> | null, FormData>(
    updatePasswordAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success('Senha atualizada.');
      router.replace('/');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Nova senha" error={fieldError(state, 'password')} hint="Mínimo de 8 caracteres." required>
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>
      <Field label="Confirmar nova senha" error={fieldError(state, 'confirmPassword')} required>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton size="lg" className="w-full">
        Salvar senha
      </SubmitButton>
    </form>
  );
}
