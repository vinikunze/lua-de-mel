import type { Metadata } from 'next';
import { ResetPasswordForm } from '@/components/auth/reset-password-form';

export const metadata: Metadata = { title: 'Nova senha' };

export default function ResetPasswordPage() {
  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight text-ink">Definir nova senha</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Escolha uma senha nova para a sua conta. Você continuará conectado depois de salvar.
      </p>

      <div className="mt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
