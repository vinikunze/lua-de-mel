import type { Metadata } from 'next';
import Link from 'next/link';
import { SignUpForm } from '@/components/auth/sign-up-form';

export const metadata: Metadata = { title: 'Criar conta' };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight text-ink">Criar conta</h1>
      <p className="mt-2 text-sm text-ink-soft">
        Leva menos de um minuto. Depois é só criar a primeira viagem.
      </p>

      <div className="mt-8">
        <SignUpForm />
      </div>

      <p className="mt-8 text-center text-[13px] text-ink-soft">
        Já tem conta?{' '}
        <Link href="/entrar" className="font-semibold text-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </div>
  );
}
