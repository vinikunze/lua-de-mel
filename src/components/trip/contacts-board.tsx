'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, MapPin, Phone, Plus, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { toast } from '@/components/ui/toaster';
import { deleteContactAction, saveContactAction } from '@/server/actions/organization';
import { CONTACT_KINDS, CONTACT_KIND_LABEL } from '@/lib/validators/misc';
import type { ActionResult } from '@/server/action-result';
import type { ImportantContactRow } from '@/types/database';

export function ContactsBoard({
  tripId,
  contacts,
  canEdit,
}: {
  tripId: string;
  contacts: ImportantContactRow[];
  canEdit: boolean;
}) {
  return (
    <div className="space-y-4">
      <Alert tone="warning" title="Cuidado com dados sensíveis">
        Guarde aqui telefones, endereços e números de apólice. Nunca registre dados de cartão de crédito —
        o sistema não foi feito para isso e essas informações não devem ficar salvas em lugar nenhum.
      </Alert>

      {canEdit && (
        <ResourceDialog
          title="Novo contato"
          description="Hotel, locadora, seguro, emergência — o que você pode precisar às pressas."
          size="md"
          autoOpenParam="novo"
          trigger={
            <Button size="sm">
              <Plus className="h-4 w-4" aria-hidden />
              Adicionar contato
            </Button>
          }
        >
          {(close) => <ContactForm tripId={tripId} onDone={close} />}
        </ResourceDialog>
      )}

      {contacts.length === 0 ? (
        <EmptyState
          icon={Phone}
          title="Nenhum contato salvo"
          description="Telefone do hotel, da locadora, do seguro viagem e um contato de emergência — tudo em um lugar só."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {contacts.map((contact) => (
            <ContactCard key={contact.id} contact={contact} tripId={tripId} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function ContactCard({
  contact,
  tripId,
  canEdit,
}: {
  contact: ImportantContactRow;
  tripId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteContactAction(tripId, contact.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Contato removido.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-ink">{contact.label}</h3>
          <Badge tone="neutral" className="mt-1">
            {CONTACT_KIND_LABEL[contact.kind]}
          </Badge>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${contact.label}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <div className="mt-3 space-y-1.5 text-[13px]">
        {contact.phone && (
          <a
            href={`tel:${contact.phone.replace(/\s/g, '')}`}
            className="flex items-center gap-2 font-medium text-accent hover:underline"
          >
            <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {contact.phone}
          </a>
        )}
        {contact.email && (
          <a href={`mailto:${contact.email}`} className="flex items-center gap-2 text-accent hover:underline">
            <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{contact.email}</span>
          </a>
        )}
        {contact.address && (
          <p className="flex items-start gap-2 text-ink-soft">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
            {contact.address}
          </p>
        )}
        {contact.reference_code && (
          <p className="text-ink-soft">
            Referência: <span className="font-mono text-ink">{contact.reference_code}</span>
          </p>
        )}
        {contact.notes && <p className="text-[12px] text-ink-faint">{contact.notes}</p>}
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir este contato?"
        description={`"${contact.label}" será removido das informações rápidas.`}
        confirmLabel="Excluir contato"
        loading={busy}
        onConfirm={handleDelete}
      />
    </Card>
  );
}

function ContactForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const router = useRouter();
  const action = saveContactAction.bind(null, tripId, null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success('Contato salvo.');
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-4">
        <FormError state={state} />
        <Field label="Nome" error={fieldError(state, 'label')} required>
          <Input name="label" placeholder="Ex.: Hotel Casa da Montanha" required autoFocus />
        </Field>
        <Field label="Tipo">
          <Select name="kind" defaultValue="other">
            {CONTACT_KINDS.map((value) => (
              <option key={value} value={value}>
                {CONTACT_KIND_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone">
            <Input name="phone" type="tel" placeholder="(54) 3286-0000" />
          </Field>
          <Field label="E-mail">
            <Input name="email" type="email" inputMode="email" />
          </Field>
        </div>
        <Field label="Endereço">
          <Input name="address" />
        </Field>
        <Field label="Número de referência" hint="Apólice, reserva, protocolo.">
          <Input name="referenceCode" className="font-mono" />
        </Field>
        <Field label="Observações">
          <Textarea name="notes" rows={2} />
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>Salvar contato</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
