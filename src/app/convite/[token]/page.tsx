import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { AcceptInvite } from '@/components/trip/accept-invite';
import { Logo } from '@/components/shared/logo';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { TripCover } from '@/components/trip/trip-cover';
import { formatDateRange, tripDayCount } from '@/lib/format/date';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/permissions';

export const metadata: Metadata = { title: 'Convite de viagem' };
export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-fA-F-]{36}$/;

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const user = await getCurrentUser();
  if (!user) redirect(`/entrar?proximo=${encodeURIComponent(`/convite/${token}`)}`);

  const shell = (children: React.ReactNode) => (
    <main id="conteudo" className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <Link href="/" className="mb-8 inline-flex self-start">
        <Logo />
      </Link>
      {children}
    </main>
  );

  if (!UUID.test(token)) {
    return shell(
      <Alert tone="danger" title="Convite inválido">
        O endereço do convite não parece correto. Peça um novo link a quem organizou a viagem.
      </Alert>,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_invite_preview', { p_token: token });

  if (error) console.error('[convite]', error);

  const invite = Array.isArray(data) ? data[0] : null;

  if (!invite) {
    return shell(
      <>
        <Alert tone="danger" title="Convite não encontrado">
          Este convite não existe mais ou já foi usado. Peça um novo link a quem organizou a viagem.
        </Alert>
        <Button asChild variant="outline" className="mt-5 self-start">
          <Link href="/">Ir para minhas viagens</Link>
        </Button>
      </>,
    );
  }

  if (invite.invite_status === 'revoked') {
    return shell(
      <Alert tone="warning" title="Convite cancelado">
        Quem organiza a viagem cancelou este convite.
      </Alert>,
    );
  }

  if (invite.invite_status === 'accepted') {
    redirect(`/viagens/${invite.trip_id}`);
  }

  if (!invite.email_matches) {
    return shell(
      <>
        <Alert tone="warning" title="Este convite é de outra conta">
          O convite foi enviado para <strong>{invite.invited_email}</strong>, mas você está conectado com
          outro e-mail. Entre com a conta correta para aceitar.
        </Alert>
        <Button asChild variant="outline" className="mt-5 self-start">
          <Link href="/entrar">Trocar de conta</Link>
        </Button>
      </>,
    );
  }

  const days = tripDayCount(invite.start_date, invite.end_date);

  return shell(
    <div className="overflow-hidden rounded-[18px] border border-line bg-surface shadow-card">
      <TripCover name={invite.trip_name} imageUrl={invite.cover_image_url} className="h-32" />
      <div className="p-6">
        <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-ink-faint">
          Convite de viagem
        </p>
        <h1 className="mt-1 text-xl font-semibold text-ink">{invite.trip_name}</h1>
        <p className="mt-1.5 text-[13px] text-ink-soft tabular">
          {formatDateRange(invite.start_date, invite.end_date)} · {days} {days === 1 ? 'dia' : 'dias'}
        </p>

        {invite.owner_name && (
          <p className="mt-4 text-[13px] text-ink-soft">
            <strong className="font-medium text-ink">{invite.owner_name}</strong> convidou você para
            participar.
          </p>
        )}

        <div className="mt-4 rounded-[12px] bg-surface-muted px-4 py-3">
          <p className="text-[13px] font-medium text-ink">
            Seu acesso: {ROLE_LABEL[invite.role as keyof typeof ROLE_LABEL]}
          </p>
          <p className="mt-0.5 text-[12px] text-ink-soft">
            {ROLE_DESCRIPTION[invite.role as keyof typeof ROLE_DESCRIPTION]}
          </p>
        </div>

        <div className="mt-6">
          <AcceptInvite token={token} />
        </div>
      </div>
    </div>,
  );
}
