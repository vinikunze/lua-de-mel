'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ExternalLink, Link2, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { toast } from '@/components/ui/toaster';
import { deleteQuickLinkAction, saveQuickLinkAction } from '@/server/actions/organization';
import { QUICK_LINK_CATEGORIES, QUICK_LINK_CATEGORY_LABEL } from '@/lib/validators/misc';
import type { ActionResult } from '@/server/action-result';
import type { QuickLinkRow } from '@/types/database';

export function QuickLinksBoard({
  tripId,
  links,
  canEdit,
}: {
  tripId: string;
  links: QuickLinkRow[];
  canEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      {canEdit && (
        <ResourceDialog
          title="Novo link"
          description="Check-in da companhia, página da reserva, site da atração."
          size="sm"
          autoOpenParam="novo"
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar link
            </Button>
          }
        >
          {(close) => <QuickLinkForm tripId={tripId} onDone={close} />}
        </ResourceDialog>
      )}

      {links.length === 0 ? (
        <EmptyState
          icon={Link2}
          title="Nenhum link salvo"
          description="Salve os endereços que você mais acessa durante a viagem: check-in da companhia aérea, reserva do hotel, bilheteria das atrações."
        />
      ) : (
        <Card className="divide-y divide-line">
          {links.map((link) => (
            <LinkRow key={link.id} link={link} tripId={tripId} canEdit={canEdit} />
          ))}
        </Card>
      )}
    </div>
  );
}

function LinkRow({ link, tripId, canEdit }: { link: QuickLinkRow; tripId: string; canEdit: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteQuickLinkAction(tripId, link.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Link removido.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{link.label}</p>
        <p className="mt-0.5 flex items-center gap-2">
          <Badge tone="neutral">{QUICK_LINK_CATEGORY_LABEL[link.category]}</Badge>
          <span className="truncate text-[12px] text-ink-faint">{link.url}</span>
        </p>
      </div>
      <a
        href={link.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex shrink-0 items-center gap-1.5 text-[13px] font-semibold text-accent hover:underline"
      >
        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
        Abrir
      </a>
      {canEdit && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Excluir ${link.label}`}
          onClick={() => setConfirming(true)}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir este link?"
        description={`"${link.label}" sairá dos links rápidos.`}
        confirmLabel="Excluir link"
        loading={busy}
        onConfirm={handleDelete}
      />
    </div>
  );
}

function QuickLinkForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const router = useRouter();
  const action = saveQuickLinkAction.bind(null, tripId, null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success('Link salvo.');
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction} noValidate>
      <DialogBody className="space-y-4">
        <FormError state={state} />
        <Field label="Nome" error={fieldError(state, 'label')} required>
          <Input name="label" placeholder="Ex.: Check-in LATAM" required autoFocus />
        </Field>
        <Field label="Endereço" error={fieldError(state, 'url')} required>
          <Input name="url" inputMode="url" placeholder="https://…" required />
        </Field>
        <Field label="Categoria">
          <Select name="category" defaultValue="other">
            {QUICK_LINK_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {QUICK_LINK_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>Salvar link</SubmitButton>
      </DialogFooter>
    </form>
  );
}
