import type { Metadata } from 'next';
import Link from 'next/link';
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form';

export const metadata: Metadata = { title: 'Recuperar senha' };

export default function ForgotPasswordPage() {
  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight text-ink">Recuperar senha</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Informe seu e-mail e enviaremos um link para criar uma nova senha.
      </p>

      <div className="mt-8">
        <ForgotPasswordForm />
      </div>

      <p className="mt-8 text-center text-[13px] text-ink-soft">
        <Link href="/entrar" className="font-semibold text-ink underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </div>
  );
}
