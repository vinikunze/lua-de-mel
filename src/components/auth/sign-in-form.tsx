'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInAction, signInWithGoogleAction } from '@/server/actions/auth';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/server/action-result';

export function SignInForm({ next }: { next: string }) {
  const router = useRouter();
  const [state, formAction] = useActionState<ActionResult<{ redirectTo: string }> | null, FormData>(
    signInAction,
    null,
  );

  useEffect(() => {
    if (state?.ok) {
      router.replace(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="space-y-5">
      <form action={formAction} className="space-y-4" noValidate>
        <input type="hidden" name="proximo" value={next} />
        <FormError state={state} />

        <Field label="E-mail" error={fieldError(state, 'email')} required>
          <Input
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="voce@email.com"
            required
          />
        </Field>

        <Field
          label="Senha"
          error={fieldError(state, 'password')}
          required
          hint={
            <Link href="/recuperar-senha" className="text-ink-soft underline-offset-2 hover:underline">
              Esqueci minha senha
            </Link>
          }
        >
          <Input name="password" type="password" autoComplete="current-password" required />
        </Field>

        <SubmitButton size="lg" className="w-full">
          Entrar
        </SubmitButton>
      </form>

      <div className="flex items-center gap-3">
        <span className="h-px flex-1 bg-line" />
        <span className="text-[11px] uppercase tracking-wide text-ink-faint">ou</span>
        <span className="h-px flex-1 bg-line" />
      </div>

      {/* O login com Google depende do provedor estar habilitado no Supabase. */}
      <form action={signInWithGoogleAction}>
        <input type="hidden" name="proximo" value={next} />
        <Button type="submit" variant="outline" size="lg" className="w-full">
          <GoogleMark />
          Continuar com Google
        </Button>
      </form>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.51 6.16-4.51Z" />
    </svg>
  );
}
