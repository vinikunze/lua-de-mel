'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signUpAction } from '@/server/actions/auth';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import type { ActionResult } from '@/server/action-result';

export function SignUpForm() {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult<{ needsConfirmation: boolean }> | null, FormData>(
    signUpAction,
    null,
  );

  useEffect(() => {
    if (!state?.ok) return;
    if (state.data.needsConfirmation) router.replace('/entrar?cadastro=confirme');
    else {
      router.replace('/');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError state={state} />

      <Field label="Nome completo" error={fieldError(state, 'fullName')} required>
        <Input name="fullName" autoComplete="name" placeholder="Como você quer ser chamado" required />
      </Field>

      <Field label="E-mail" error={fieldError(state, 'email')} required>
        <Input name="email" type="email" autoComplete="email" inputMode="email" required />
      </Field>

      <Field
        label="Senha"
        error={fieldError(state, 'password')}
        hint="Mínimo de 8 caracteres."
        required
      >
        <Input name="password" type="password" autoComplete="new-password" minLength={8} required />
      </Field>

      <Field label="Confirmar senha" error={fieldError(state, 'confirmPassword')} required>
        <Input name="confirmPassword" type="password" autoComplete="new-password" required />
      </Field>

      <SubmitButton size="lg" className="w-full">
        Criar conta
      </SubmitButton>
    </form>
  );
}
