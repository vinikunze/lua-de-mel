'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { acceptInviteAction } from '@/server/actions/members';

export function AcceptInvite({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function accept() {
    setError(null);
    startTransition(async () => {
      const result = await acceptInviteAction(token);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.replace(`/viagens/${result.data.tripId}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      {error && <Alert tone="danger">{error}</Alert>}
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={accept} loading={pending} size="lg" className="flex-1">
          Aceitar convite
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link href="/">Agora não</Link>
        </Button>
      </div>
    </div>
  );
}
