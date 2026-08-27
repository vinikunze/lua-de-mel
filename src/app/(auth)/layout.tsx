import Link from 'next/link';
import { Logo } from '@/components/shared/logo';
import { APP } from '@/lib/config';

const HIGHLIGHTS = [
  'Voos, hotéis e carro com localizador, horário e voucher no mesmo lugar.',
  'Roteiro dia a dia com mapa, distâncias e tempo de deslocamento.',
  'Orçamento, pagamentos e divisão entre viajantes.',
  'PDF completo para levar impresso e usar sem internet.',
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Coluna de apresentação — só no desktop, para não roubar espaço no celular */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-showcase p-12 text-showcase-foreground lg:flex">
        {/* Brilho dourado discreto, para o painel não ser um bloco chapado */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_-10%,rgba(217,177,105,0.16),transparent_55%),radial-gradient(circle_at_88%_110%,rgba(217,177,105,0.10),transparent_50%)]"
        />
        <Link href="/" className="relative inline-flex">
          <Logo size="lg" className="[&_rect]:fill-accent [&_path]:fill-showcase [&_circle]:fill-accent [&_span]:text-showcase-foreground" />
        </Link>

        <div className="relative max-w-md">
          <h2 className="font-display text-[34px] leading-[1.15] text-balance">
            Tudo sobre a sua viagem em um só lugar.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed opacity-70">
            Chega de procurar reserva no e-mail, endereço no WhatsApp e horário no aplicativo da companhia aérea.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => (
              <li key={item} className="flex gap-3 text-[13.5px] leading-relaxed opacity-80">
                <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-50">
          {APP.name} — seus dados ficam protegidos por autenticação e políticas de acesso no banco.
        </p>
      </aside>

      <main id="conteudo" className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="mb-10 inline-flex lg:hidden">
            <Logo size="md" />
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}
