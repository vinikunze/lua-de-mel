import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { TripForm } from '@/components/trip/trip-form';
import { createTripAction } from '@/server/actions/trips';
import { PageHeader } from '@/components/ui/section';

export const metadata: Metadata = { title: 'Nova viagem' };

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
      <Link
        href="/viagens"
        className="mb-5 inline-flex items-center gap-1.5 text-[13px] text-ink-soft transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Viagens
      </Link>

      <PageHeader
        title="Nova viagem"
        description="Comece pelo essencial. Voos, hospedagem, roteiro e gastos entram depois, quando você tiver as informações."
      />

      <div className="mt-8">
        <TripForm action={createTripAction} submitLabel="Criar viagem" />
      </div>
    </div>
  );
}
