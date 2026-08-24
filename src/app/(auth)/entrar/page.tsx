import type { Metadata } from 'next';
import Link from 'next/link';
import { SignInForm } from '@/components/auth/sign-in-form';
import { isSupabaseConfigured } from '@/lib/env';
import { Alert } from '@/components/ui/alert';

export const metadata: Metadata = { title: 'Entrar' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ proximo?: string; erro?: string; cadastro?: string }>;
}) {
  const params = await searchParams;

  return (
    <div>
      <h1 className="text-[26px] font-semibold leading-tight text-ink">Bem-vindo de volta</h1>
      <p className="mt-2 text-sm text-ink-soft">Entre para acessar suas viagens.</p>

      {params.cadastro === 'confirme' && (
        <Alert tone="positive" className="mt-6" title="Confirme seu e-mail">
          Enviamos um link de confirmação. Depois de confirmar, volte aqui e entre.
        </Alert>
      )}
      {params.erro && (
        <Alert tone="danger" className="mt-6">
          {params.erro}
        </Alert>
      )}
      {!isSupabaseConfigured && (
        <Alert tone="warning" className="mt-6" title="Banco de dados não configurado">
          Defina as variáveis do Supabase no arquivo <code>.env.local</code>.{' '}
          <Link href="/configurar" className="font-semibold underline">
            Ver instruções
          </Link>
        </Alert>
      )}

      <div className="mt-8">
        <SignInForm next={params.proximo ?? '/'} />
      </div>

      <p className="mt-8 text-center text-[13px] text-ink-soft">
        Ainda não tem conta?{' '}
        <Link href="/cadastro" className="font-semibold text-ink underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </p>
    </div>
  );
}
