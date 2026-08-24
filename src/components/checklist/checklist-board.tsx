'use client';

import { useActionState, useEffect, useOptimistic, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, ListPlus, Plus, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { toast } from '@/components/ui/toaster';
import {
  addChecklistItemAction, createChecklistAction, deleteChecklistAction,
  deleteChecklistItemAction, toggleChecklistItemAction,
} from '@/server/actions/organization';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/server/action-result';
import type { ChecklistWithItems } from '@/server/queries/trips';

export function ChecklistBoard({
  tripId,
  checklists,
  canEdit,
}: {
  tripId: string;
  checklists: ChecklistWithItems[];
  canEdit: boolean;
}) {
  const allItems = checklists.flatMap((list) => list.items);
  const done = allItems.filter((item) => item.is_done).length;

  return (
    <div className="space-y-5">
      {allItems.length > 0 && (
        <Card className="p-4">
          <div className="mb-2 flex items-baseline justify-between text-[13px]">
            <span className="font-medium text-ink">Progresso geral</span>
            <span className="text-ink-soft tabular">
              {done} de {allItems.length} concluídos
            </span>
          </div>
          <Progress
            value={done}
            max={allItems.length}
            tone={done === allItems.length ? 'positive' : 'accent'}
            label="Progresso das listas"
          />
        </Card>
      )}

      {canEdit && (
        <ResourceDialog
          title="Nova lista"
          description="Crie listas próprias — documentos do carro, presentes, o que for."
          size="sm"
          trigger={
            <Button size="sm" variant="outline">
              <ListPlus className="h-4 w-4" aria-hidden />
              Nova lista
            </Button>
          }
        >
          {(close) => <ChecklistForm tripId={tripId} onDone={close} />}
        </ResourceDialog>
      )}

      {checklists.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="Nenhuma lista ainda"
          description="Crie listas para o antes da viagem e para a mala — assim nada fica para trás."
        />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {checklists.map((checklist) => (
            <ChecklistCard key={checklist.id} tripId={tripId} checklist={checklist} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function ChecklistCard({
  tripId,
  checklist,
  canEdit,
}: {
  tripId: string;
  checklist: ChecklistWithItems;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [newItem, setNewItem] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [, startTransition] = useTransition();

  // Marcar/desmarcar responde na hora; o servidor confirma logo depois.
  const [optimisticItems, toggleOptimistic] = useOptimistic(
    checklist.items,
    (items, payload: { id: string; isDone: boolean }) =>
      items.map((item) => (item.id === payload.id ? { ...item, is_done: payload.isDone } : item)),
  );

  const done = optimisticItems.filter((item) => item.is_done).length;

  function toggle(itemId: string, isDone: boolean) {
    startTransition(async () => {
      toggleOptimistic({ id: itemId, isDone });
      const result = await toggleChecklistItemAction(tripId, itemId, isDone);
      if (!result.ok) toast.error(result.error);
      router.refresh();
    });
  }

  async function addItem() {
    const title = newItem.trim();
    if (!title) return;
    setNewItem('');
    const result = await addChecklistItemAction(tripId, checklist.id, title);
    if (!result.ok) {
      toast.error(result.error);
      setNewItem(title);
      return;
    }
    router.refresh();
  }

  async function removeItem(itemId: string) {
    const result = await deleteChecklistItemAction(tripId, itemId);
    if (!result.ok) toast.error(result.error);
    else router.refresh();
  }

  async function removeList() {
    setBusy(true);
    const result = await deleteChecklistAction(tripId, checklist.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Lista removida.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="text-[14px] font-semibold text-ink">{checklist.title}</h3>
          <p className="mt-0.5 text-[12px] text-ink-soft tabular">
            {done} de {optimisticItems.length} concluídos
          </p>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir lista ${checklist.title}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <ul className="mt-3 space-y-0.5">
        {optimisticItems.map((item) => (
          <li key={item.id} className="group flex items-center gap-2.5 rounded-[8px] px-1 py-1.5">
            <Checkbox
              checked={item.is_done}
              disabled={!canEdit}
              onCheckedChange={(checked) => toggle(item.id, checked === true)}
              aria-label={item.title}
              id={`item-${item.id}`}
            />
            <label
              htmlFor={`item-${item.id}`}
              className={cn(
                'min-w-0 flex-1 cursor-pointer text-[13px] text-ink',
                item.is_done && 'text-ink-faint line-through',
              )}
            >
              {item.title}
            </label>
            {canEdit && (
              <button
                type="button"
                onClick={() => void removeItem(item.id)}
                aria-label={`Remover ${item.title}`}
                className="rounded p-1 text-ink-faint opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" aria-hidden />
              </button>
            )}
          </li>
        ))}
        {optimisticItems.length === 0 && (
          <li className="px-1 py-2 text-[12px] text-ink-faint">Lista vazia.</li>
        )}
      </ul>

      {canEdit && (
        <form
          className="mt-3 flex gap-2 border-t border-line pt-3"
          onSubmit={(event) => {
            event.preventDefault();
            void addItem();
          }}
        >
          <Input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            placeholder="Adicionar item"
            aria-label={`Adicionar item em ${checklist.title}`}
            className="h-9"
          />
          <Button type="submit" size="sm" variant="outline" disabled={!newItem.trim()}>
            <Plus className="h-4 w-4" aria-hidden />
          </Button>
        </form>
      )}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir esta lista?"
        description={`"${checklist.title}" e todos os seus itens serão removidos.`}
        confirmLabel="Excluir lista"
        loading={busy}
        onConfirm={removeList}
      />
    </Card>
  );
}

function ChecklistForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const router = useRouter();
  const action = createChecklistAction.bind(null, tripId);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);

  useEffect(() => {
    if (state?.ok) {
      toast.success('Lista criada.');
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <form action={formAction} noValidate>
      <DialogBody className="space-y-4">
        <FormError state={state} />
        <Field label="Nome da lista" error={fieldError(state, 'title')} required>
          <Input name="title" placeholder="Ex.: Documentos do carro" required autoFocus />
        </Field>
        <Field label="Tipo">
          <Select name="kind" defaultValue="custom">
            <option value="before_trip">Antes da viagem</option>
            <option value="packing">Mala</option>
            <option value="custom">Personalizada</option>
          </Select>
        </Field>
      </DialogBody>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>Criar lista</SubmitButton>
      </DialogFooter>
    </form>
  );
}
