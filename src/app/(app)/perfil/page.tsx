import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { signOutAction } from '@/server/actions/auth';
import { ProfileForm } from '@/components/auth/profile-form';
import { PageHeader } from '@/components/ui/section';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { ThemeToggle } from '@/components/shared/theme-toggle';
import { listTrips } from '@/server/queries/trips';

export const metadata: Metadata = { title: 'Meu perfil' };
export const dynamic = 'force-dynamic';

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const trips = await listTrips();
  const owned = trips.filter((trip) => trip.owner_id === user.id).length;

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <PageHeader title="Meu perfil" description="Seus dados e preferências no aplicativo." />

      <Card>
        <CardContent className="flex items-center gap-4 p-5">
          <Avatar name={profile?.full_name} src={profile?.avatar_url} size="lg" />
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">
              {profile?.full_name ?? 'Sem nome definido'}
            </p>
            <p className="truncate text-[13px] text-ink-soft">{profile?.email ?? user.email}</p>
            <p className="mt-1 text-[12px] text-ink-faint tabular">
              {trips.length} {trips.length === 1 ? 'viagem' : 'viagens'} · {owned}{' '}
              {owned === 1 ? 'criada por você' : 'criadas por você'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Dados pessoais</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={profile?.full_name ?? ''} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Aparência</CardTitle>
        </CardHeader>
        <CardContent>
          <ThemeToggle />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Sessão</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={signOutAction}>
            <Button type="submit" variant="outline">
              <LogOut className="h-4 w-4" aria-hidden />
              Sair da conta
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
