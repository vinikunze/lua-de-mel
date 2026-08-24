'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfileAction } from '@/server/actions/auth';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { toast } from '@/components/ui/toaster';
import type { ActionResult } from '@/server/action-result';

export function ProfileForm({ fullName }: { fullName: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult<{ saved: true }> | null, FormData>(
    updateProfileAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      toast.success('Perfil atualizado.');
      router.refresh();
    }
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <FormError state={state} />
      <Field label="Nome completo" error={fieldError(state, 'fullName')} required>
        <Input name="fullName" defaultValue={fullName} autoComplete="name" required />
      </Field>
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}
