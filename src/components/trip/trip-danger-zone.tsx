'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { toast } from '@/components/ui/toaster';
import { deleteTripAction, duplicateTripAction } from '@/server/actions/trips';

export function TripDangerZone({ tripId, tripName }: { tripId: string; tripName: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteTripAction(tripId);
    setBusy(false);
    if (result.ok) {
      toast.success('Viagem excluída.');
      router.push('/viagens');
    } else toast.error(result.error);
  }

  async function handleDuplicate() {
    setBusy(true);
    const result = await duplicateTripAction(tripId);
    setBusy(false);
    if (result.ok) {
      toast.success('Cópia criada. Ajuste as datas e comece a preencher.');
      router.push(`/viagens/${result.data.tripId}`);
    } else toast.error(result.error);
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[14px] border border-line bg-surface p-4">
        <h3 className="text-[13px] font-semibold text-ink">Duplicar viagem</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">
          Cria uma nova viagem com os mesmos destino, moeda e orçamento, com datas daqui a 30 dias. Reservas
          e roteiro não são copiados.
        </p>
        <Button variant="outline" size="sm" className="mt-3" onClick={handleDuplicate} loading={busy}>
          <Copy className="h-4 w-4" aria-hidden />
          Duplicar
        </Button>
      </div>

      <div className="rounded-[14px] border border-danger/30 bg-danger-soft p-4">
        <h3 className="text-[13px] font-semibold text-danger">Excluir viagem</h3>
        <p className="mt-1 text-[12px] leading-relaxed text-danger/90">
          Apaga a viagem e tudo o que está dentro dela: voos, hospedagens, roteiro, despesas, documentos e
          participantes. Esta ação não pode ser desfeita.
        </p>
        <Button variant="danger" size="sm" className="mt-3" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" aria-hidden />
          Excluir viagem
        </Button>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={`Excluir "${tripName}"?`}
        description="Todos os dados desta viagem serão apagados definitivamente, inclusive os documentos enviados. Não há como recuperar depois."
        confirmLabel="Sim, excluir tudo"
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}
