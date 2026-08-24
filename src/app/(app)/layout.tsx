import { redirect } from 'next/navigation';
import { createClient, getCurrentUser } from '@/lib/supabase/server';
import { AppHeader } from '@/components/layout/app-header';
import { BottomNav } from '@/components/layout/bottom-nav';
import { InstallPrompt } from '@/components/shared/install-prompt';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect('/entrar');

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, avatar_url, email')
    .eq('id', user.id)
    .maybeSingle();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <AppHeader
        userName={profile?.full_name ?? user.email?.split('@')[0] ?? null}
        userEmail={profile?.email ?? user.email ?? null}
        avatarUrl={profile?.avatar_url ?? null}
      />
      {/* pb-20 reserva espaço para a navegação inferior no celular */}
      <main id="conteudo" className="flex-1 pb-20 lg:pb-10">
        {children}
      </main>
      <BottomNav />
      <InstallPrompt />
    </div>
  );
}
