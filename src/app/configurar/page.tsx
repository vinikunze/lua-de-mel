import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Circle } from 'lucide-react';
import { Logo } from '@/components/shared/logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { isSupabaseConfigured } from '@/lib/env';
import { googleCapabilities } from '@/lib/google/config';
import { APP } from '@/lib/config';

export const metadata: Metadata = { title: 'Configuração' };
export const dynamic = 'force-dynamic';

function Status({ ready, children }: { ready: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      {ready ? (
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-positive" aria-hidden />
      ) : (
        <Circle className="mt-0.5 h-4 w-4 shrink-0 text-ink-faint" aria-hidden />
      )}
      <div className="min-w-0 text-[13px] leading-relaxed text-ink-soft">{children}</div>
    </div>
  );
}

/**
 * Página de diagnóstico das integrações.
 * Mostra o que já está configurado e o que falta — sem nunca exibir o valor
 * das chaves, apenas se existem.
 */
export default function SetupPage() {
  const google = googleCapabilities();

  return (
    <main id="conteudo" className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <Link href="/" className="mb-8 inline-flex">
        <Logo />
      </Link>

      <h1 className="text-2xl font-semibold text-ink">Configuração do {APP.name}</h1>
      <p className="mt-2 text-[14px] leading-relaxed text-ink-soft">
        O sistema funciona em etapas: só o banco de dados é obrigatório. As integrações do Google são
        opcionais e podem ser ligadas depois — sem elas, o endereço é digitado à mão e os cálculos
        automáticos ficam ocultos.
      </p>

      <div className="mt-8 space-y-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <CardTitle>1. Banco de dados e autenticação</CardTitle>
            <Badge tone={isSupabaseConfigured ? 'positive' : 'danger'}>
              {isSupabaseConfigured ? 'Configurado' : 'Obrigatório'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <Status ready={isSupabaseConfigured}>
              Crie um projeto no Supabase, rode as migrations de{' '}
              <code className="rounded bg-surface-muted px-1 py-0.5 text-[12px]">supabase/migrations/</code> e
              preencha no <code className="rounded bg-surface-muted px-1 py-0.5 text-[12px]">.env.local</code>:
              <pre className="mt-2 overflow-x-auto rounded-[10px] bg-surface-muted p-3 text-[12px] leading-relaxed">
{`NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=`}
              </pre>
            </Status>
            <p className="text-[12px] text-ink-faint">
              A chave <strong>service role</strong> não é usada em lugar nenhum deste projeto e nunca deve ir
              para o navegador.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <CardTitle>2. Mapa interativo</CardTitle>
            <Badge tone={google.interactiveMap ? 'positive' : 'neutral'}>
              {google.interactiveMap ? 'Configurado' : 'Opcional'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <Status ready={google.interactiveMap}>
              Habilite a <strong>Maps JavaScript API</strong> no Google Cloud e crie uma chave restrita por
              referrer HTTP (seu domínio e <code>localhost</code>):
              <pre className="mt-2 overflow-x-auto rounded-[10px] bg-surface-muted p-3 text-[12px]">
{`GOOGLE_MAPS_BROWSER_API_KEY=`}
              </pre>
            </Status>
            <p className="text-[12px] text-ink-faint">
              Esta chave acaba visível na página do mapa — por isso a restrição por domínio é
              essencial.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3 pb-3">
            <CardTitle>3. Endereços, rotas e mapas do PDF</CardTitle>
            <Badge tone={google.places ? 'positive' : 'neutral'}>
              {google.places ? 'Configurado' : 'Opcional'}
            </Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            <Status ready={google.places}>
              Habilite <strong>Places API (New)</strong>, <strong>Routes API</strong> e{' '}
              <strong>Maps Static API</strong>. Crie uma chave <em>separada</em>, restrita a essas três APIs:
              <pre className="mt-2 overflow-x-auto rounded-[10px] bg-surface-muted p-3 text-[12px]">
{`GOOGLE_MAPS_SERVER_API_KEY=`}
              </pre>
            </Status>
            <p className="text-[12px] text-ink-faint">
              Sem o prefixo <code>NEXT_PUBLIC_</code>: esta chave é usada apenas no servidor e nunca chega ao
              navegador. Toda chamada passa por rotas internas da aplicação, que aplicam field masks, session
              tokens e cache para manter o custo baixo.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        <Button asChild>
          <Link href="/">Ir para o aplicativo</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/entrar">Entrar</Link>
        </Button>
      </div>

      <p className="mt-6 text-[12px] leading-relaxed text-ink-faint">
        O passo a passo completo — criação do projeto, migrations, storage, RLS e deploy — está no{' '}
        <code>README.md</code> do repositório.
      </p>
    </main>
  );
}
