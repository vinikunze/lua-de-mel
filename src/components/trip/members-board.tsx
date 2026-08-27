'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, Copy, LogOut, MoreVertical, Trash2, UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar } from '@/components/ui/avatar';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Alert } from '@/components/ui/alert';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { toast } from '@/components/ui/toaster';
import {
  inviteMemberAction, leaveTripAction, removeMemberAction, revokeInviteAction,
  transferOwnershipAction, updateMemberRoleAction,
} from '@/server/actions/members';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/permissions';
import { formatDate } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { TripMemberWithProfile } from '@/server/queries/trips';
import type { MemberRole } from '@/types/database';

export function MembersBoard({
  tripId,
  members,
  isOwner,
  currentUserId,
}: {
  tripId: string;
  members: TripMemberWithProfile[];
  isOwner: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);

  const accepted = members.filter((m) => m.invite_status === 'accepted');
  const pending = members.filter((m) => m.invite_status === 'pending');
  const revoked = members.filter((m) => m.invite_status === 'revoked');
  const me = members.find((m) => m.user_id === currentUserId);

  async function handleLeave() {
    setBusy(true);
    const result = await leaveTripAction(tripId);
    setBusy(false);
    if (result.ok) {
      toast.success('Você saiu da viagem.');
      router.push('/viagens');
    } else toast.error(result.error);
  }

  return (
    <div className="space-y-6">
      {isOwner && (
        <ResourceDialog
          title="Convidar participante"
          description="Gere um link de convite para quem vai viajar com você."
          size="md"
          trigger={
            <Button size="sm">
              <UserPlus className="h-4 w-4" aria-hidden />
              Convidar
            </Button>
          }
        >
          {(close) => <InviteForm tripId={tripId} onDone={close} />}
        </ResourceDialog>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold text-ink">
          Participantes
          <span className="ml-2 text-[12px] font-normal text-ink-faint tabular">{accepted.length}</span>
        </h2>
        <Card className="divide-y divide-line">
          {accepted.map((member) => (
            <MemberRow
              key={member.id}
              member={member}
              tripId={tripId}
              isOwner={isOwner}
              isSelf={member.user_id === currentUserId}
            />
          ))}
        </Card>
      </section>

      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold text-ink">
            Convites pendentes
            <span className="ml-2 text-[12px] font-normal text-ink-faint tabular">{pending.length}</span>
          </h2>
          <Card className="divide-y divide-line">
            {pending.map((member) => (
              <PendingRow key={member.id} member={member} tripId={tripId} isOwner={isOwner} />
            ))}
          </Card>
        </section>
      )}

      {revoked.length > 0 && isOwner && (
        <p className="text-[12px] text-ink-faint">
          {revoked.length} {revoked.length === 1 ? 'convite cancelado' : 'convites cancelados'}. Convide
          novamente pelo mesmo e-mail para reativar.
        </p>
      )}

      <section className="rounded-[14px] border border-line bg-surface p-4">
        <h3 className="text-[13px] font-semibold text-ink">O que cada papel pode fazer</h3>
        <dl className="mt-2 space-y-1.5 text-[12px]">
          {(['owner', 'editor', 'viewer'] as MemberRole[]).map((role) => (
            <div key={role} className="flex gap-2">
              <dt className="w-24 shrink-0 font-medium text-ink">{ROLE_LABEL[role]}</dt>
              <dd className="text-ink-soft">{ROLE_DESCRIPTION[role]}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-[11px] leading-relaxed text-ink-faint">
          As permissões valem também no banco de dados: mesmo com acesso direto à API, um visualizador não
          consegue alterar nada desta viagem.
        </p>
      </section>

      {!isOwner && me && (
        <div>
          <Button variant="outline" size="sm" onClick={() => setLeaving(true)}>
            <LogOut className="h-4 w-4" aria-hidden />
            Sair desta viagem
          </Button>
          <ConfirmDialog
            open={leaving}
            onOpenChange={setLeaving}
            title="Sair desta viagem?"
            description="Você perderá o acesso aos dados, documentos e roteiro. O proprietário pode convidar você de novo."
            confirmLabel="Sair da viagem"
            loading={busy}
            onConfirm={handleLeave}
          />
        </div>
      )}
    </div>
  );
}

function MemberRow({
  member,
  tripId,
  isOwner,
  isSelf,
}: {
  member: TripMemberWithProfile;
  tripId: string;
  isOwner: boolean;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState<'remove' | 'transfer' | null>(null);
  const [busy, setBusy] = useState(false);

  const name = member.profile?.full_name ?? member.display_name ?? member.invited_email ?? 'Participante';

  async function changeRole(role: MemberRole) {
    const result = await updateMemberRoleAction(tripId, member.id, role);
    if (result.ok) {
      toast.success('Papel atualizado.');
      router.refresh();
    } else toast.error(result.error);
  }

  async function remove() {
    setBusy(true);
    const result = await removeMemberAction(tripId, member.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Participante removido.');
      setConfirming(null);
      router.refresh();
    } else toast.error(result.error);
  }

  async function transfer() {
    if (!member.user_id) return;
    setBusy(true);
    const result = await transferOwnershipAction(tripId, member.user_id);
    setBusy(false);
    if (result.ok) {
      toast.success('Propriedade transferida.');
      setConfirming(null);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Avatar name={name} src={member.profile?.avatar_url} size="sm" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">
          {name}
          {isSelf && <span className="ml-1.5 text-[12px] font-normal text-ink-faint">(você)</span>}
        </p>
        {member.profile?.email && (
          <p className="truncate text-[12px] text-ink-soft">{member.profile.email}</p>
        )}
      </div>
      <Badge tone={member.role === 'owner' ? 'accent' : 'neutral'}>{ROLE_LABEL[member.role]}</Badge>

      {isOwner && member.role !== 'owner' && (
        <Dropdown>
          <DropdownTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${name}`}>
              <MoreVertical className="h-4 w-4" aria-hidden />
            </Button>
          </DropdownTrigger>
          <DropdownContent>
            <DropdownItem disabled={member.role === 'editor'} onSelect={() => void changeRole('editor')}>
              <Check className="h-4 w-4" aria-hidden />
              Tornar editor
            </DropdownItem>
            <DropdownItem disabled={member.role === 'viewer'} onSelect={() => void changeRole('viewer')}>
              <Check className="h-4 w-4" aria-hidden />
              Tornar visualizador
            </DropdownItem>
            {member.user_id && (
              <DropdownItem onSelect={() => setConfirming('transfer')}>
                Transferir propriedade
              </DropdownItem>
            )}
            <DropdownItem destructive onSelect={() => setConfirming('remove')}>
              <Trash2 className="h-4 w-4" aria-hidden />
              Remover da viagem
            </DropdownItem>
          </DropdownContent>
        </Dropdown>
      )}

      <ConfirmDialog
        open={confirming === 'remove'}
        onOpenChange={(open) => setConfirming(open ? 'remove' : null)}
        title="Remover este participante?"
        description={`${name} perderá o acesso a esta viagem, incluindo documentos e roteiro.`}
        confirmLabel="Remover participante"
        loading={busy}
        onConfirm={remove}
      />
      <ConfirmDialog
        open={confirming === 'transfer'}
        onOpenChange={(open) => setConfirming(open ? 'transfer' : null)}
        title="Transferir a propriedade da viagem?"
        description={`${name} passa a ser o proprietário e você vira editor. Só o novo proprietário poderá excluir a viagem ou gerenciar participantes.`}
        confirmLabel="Transferir"
        destructive={false}
        loading={busy}
        onConfirm={transfer}
      />
    </div>
  );
}

function PendingRow({
  member,
  tripId,
  isOwner,
}: {
  member: TripMemberWithProfile;
  tripId: string;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const link = typeof window !== 'undefined' ? `${window.location.origin}/convite/${member.invite_token}` : '';

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiado.');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar. Selecione e copie manualmente.');
    }
  }

  async function revoke() {
    const result = await revokeInviteAction(tripId, member.id);
    if (result.ok) {
      toast.success('Convite cancelado.');
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{member.invited_email}</p>
        <p className="text-[12px] text-ink-soft">
          Convidado como {ROLE_LABEL[member.role].toLowerCase()} em {formatDate(member.created_at.slice(0, 10))}
        </p>
      </div>
      {isOwner && (
        <>
          <Button variant="outline" size="sm" onClick={() => void copy()}>
            {copied ? <Check className="h-3.5 w-3.5" aria-hidden /> : <Copy className="h-3.5 w-3.5" aria-hidden />}
            <span className="hidden sm:inline">Copiar link</span>
          </Button>
          <Button variant="ghost" size="icon-sm" aria-label="Cancelar convite" onClick={() => void revoke()}>
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        </>
      )}
    </div>
  );
}

function InviteForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const router = useRouter();
  const action = inviteMemberAction.bind(null, tripId);
  const [state, formAction] = useActionState<ActionResult<{ link: string; email: string }> | null, FormData>(
    action,
    null,
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  if (state?.ok) {
    return (
      <>
        <DialogBody className="space-y-4">
          <Alert tone="positive" title="Convite criado">
            Envie este link para <strong>{state.data.email}</strong>. Ele só funciona para esse e-mail — se
            outra pessoa abrir, o acesso é recusado.
          </Alert>
          <div className="flex gap-2">
            <Input readOnly value={state.data.link} onFocus={(e) => e.currentTarget.select()} className="font-mono text-[12px]" />
            <Button
              type="button"
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(state.data.link);
                  setCopied(true);
                  toast.success('Link copiado.');
                } catch {
                  toast.error('Copie manualmente o link acima.');
                }
              }}
            >
              {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
            </Button>
          </div>
        </DialogBody>
        <DialogFooter>
          <Button onClick={onDone}>Concluir</Button>
        </DialogFooter>
      </>
    );
  }

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-4">
        <FormError state={state} />
        <Field label="E-mail" error={fieldError(state, 'email')} required>
          <Input name="email" type="email" inputMode="email" placeholder="pessoa@email.com" required autoFocus />
        </Field>
        <Field label="Nome" hint="Como essa pessoa aparece na viagem antes de aceitar.">
          <Input name="displayName" placeholder="Opcional" />
        </Field>
        <Field label="Nível de acesso">
          <Select name="role" defaultValue="editor">
            <option value="editor">Editor — pode adicionar e alterar informações</option>
            <option value="viewer">Visualizador — apenas consulta e PDF</option>
          </Select>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>Gerar convite</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
