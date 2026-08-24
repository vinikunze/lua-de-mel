'use client';

import { RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function OfflineActions() {
  return (
    <div className="mt-7 flex justify-center gap-2">
      <Button onClick={() => window.location.reload()}>
        <RefreshCw className="h-4 w-4" aria-hidden />
        Tentar de novo
      </Button>
      <Button asChild variant="outline">
        <Link href="/">Ir para o início</Link>
      </Button>
    </div>
  );
}
