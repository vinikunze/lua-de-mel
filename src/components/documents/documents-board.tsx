'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Download, Eye, FileImage, FileText, MoreVertical, Paperclip, Pencil, Trash2, Upload,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog, EditDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { Alert } from '@/components/ui/alert';
import { toast } from '@/components/ui/toaster';
import {
  deleteDocumentAction, getDocumentUrlAction, renameDocumentAction, uploadDocumentAction,
} from '@/server/actions/documents';
import { DOCUMENT_CATEGORIES, DOCUMENT_CATEGORY_LABEL } from '@/lib/validators/misc';
import { formatDate } from '@/lib/format/date';
import type { ActionResult } from '@/server/action-result';
import type { DocumentRow } from '@/types/database';

function formatSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsBoard({
  tripId,
  documents,
  canEdit,
}: {
  tripId: string;
  documents: DocumentRow[];
  canEdit: boolean;
}) {
  const [category, setCategory] = useState('');

  const filtered = useMemo(
    () => (category ? documents.filter((d) => d.category === category) : documents),
    [documents, category],
  );

  return (
    <div className="space-y-4">
      <Alert tone="info">
        Os arquivos ficam em armazenamento privado. Só participantes desta viagem conseguem abrir, e cada
        visualização usa um link temporário que expira em poucos minutos.
      </Alert>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-[11rem]">
          <label htmlFor="filtro-docs" className="sr-only">
            Categoria
          </label>
          <Select
            id="filtro-docs"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-9 text-[13px]"
          >
            <option value="">Todas as categorias</option>
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>

        {canEdit && (
          <ResourceDialog
            title="Enviar documento"
            description="PDF, JPG, PNG ou WebP, até 25 MB."
            size="md"
            autoOpenParam="novo"
            trigger={
              <Button size="sm">
                <Upload className="h-4 w-4" aria-hidden />
                Enviar documento
              </Button>
            }
          >
            {(close) => <UploadForm tripId={tripId} onDone={close} />}
          </ResourceDialog>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title={documents.length === 0 ? 'Nenhum documento anexado' : 'Nenhum documento nesta categoria'}
          description="Guarde aqui cartões de embarque, vouchers de hotel, contrato da locadora e ingressos — tudo junto e disponível na viagem."
          action={
            documents.length === 0 &&
            canEdit && (
              <ResourceDialog title="Enviar documento" size="md" trigger={<Button size="sm">Enviar documento</Button>}>
                {(close) => <UploadForm tripId={tripId} onDone={close} />}
              </ResourceDialog>
            )
          }
        />
      ) : (
        <Card className="divide-y divide-line">
          {filtered.map((document) => (
            <DocumentRowItem key={document.id} document={document} tripId={tripId} canEdit={canEdit} />
          ))}
        </Card>
      )}
    </div>
  );
}

function DocumentRowItem({
  document: doc,
  tripId,
  canEdit,
}: {
  document: DocumentRow;
  tripId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(doc.name);
  const [category, setCategory] = useState<string>(doc.category);

  const isImage = doc.mime_type?.startsWith('image/');
  const Icon = isImage ? FileImage : FileText;

  async function open(download: boolean) {
    const result = await getDocumentUrlAction(tripId, doc.id, { download });
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    window.open(result.data.url, '_blank', 'noopener,noreferrer');
  }

  async function handleDelete() {
    setBusy(true);
    const result = await deleteDocumentAction(tripId, doc.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Documento excluído.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  async function handleRename() {
    setBusy(true);
    const result = await renameDocumentAction(tripId, doc.id, name, category);
    setBusy(false);
    if (result.ok) {
      toast.success('Documento atualizado.');
      setEditing(false);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-ink-soft">
        <Icon className="h-4 w-4" aria-hidden />
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[13.5px] font-medium text-ink">{doc.name}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-soft">
          <Badge tone="neutral">{DOCUMENT_CATEGORY_LABEL[doc.category]}</Badge>
          {doc.size_bytes && <span className="tabular">{formatSize(doc.size_bytes)}</span>}
          <span className="tabular">{formatDate(doc.created_at.slice(0, 10))}</span>
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <Button variant="ghost" size="icon-sm" aria-label={`Visualizar ${doc.name}`} onClick={() => void open(false)}>
          <Eye className="h-4 w-4" aria-hidden />
        </Button>
        <Button variant="ghost" size="icon-sm" aria-label={`Baixar ${doc.name}`} onClick={() => void open(true)}>
          <Download className="h-4 w-4" aria-hidden />
        </Button>
        {canEdit && (
          <Dropdown>
            <DropdownTrigger asChild>
              <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${doc.name}`}>
                <MoreVertical className="h-4 w-4" aria-hidden />
              </Button>
            </DropdownTrigger>
            <DropdownContent>
              <DropdownItem onSelect={() => setEditing(true)}>
                <Pencil className="h-4 w-4" aria-hidden />
                Renomear
              </DropdownItem>
              <DropdownItem destructive onSelect={() => setConfirming(true)}>
                <Trash2 className="h-4 w-4" aria-hidden />
                Excluir
              </DropdownItem>
            </DropdownContent>
          </Dropdown>
        )}
      </div>

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Renomear documento" size="sm">
            <DialogBody className="space-y-4">
              <Field label="Nome" required>
                <Input value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Categoria">
                <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {DOCUMENT_CATEGORIES.map((value) => (
                    <option key={value} value={value}>
                      {DOCUMENT_CATEGORY_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </Field>
            </DialogBody>
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
              <Button onClick={() => void handleRename()} loading={busy}>
                Salvar
              </Button>
            </DialogFooter>
          </EditDialog>

          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir este documento?"
            description={`"${doc.name}" será apagado definitivamente do armazenamento. Não dá para desfazer.`}
            confirmLabel="Excluir documento"
            loading={busy}
            onConfirm={handleDelete}
          />
        </>
      )}
    </div>
  );
}

function UploadForm({ tripId, onDone }: { tripId: string; onDone: () => void }) {
  const router = useRouter();
  const action = uploadDocumentAction.bind(null, tripId);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success('Documento enviado.');
      onDone();
      router.refresh();
    }
  }, [state, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-5">
        <FormError state={state} />

        <Field label="Arquivo" error={fieldError(state, 'file')} required>
          <div className="flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              name="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              required
              onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
              className="block w-full text-[13px] text-ink-soft file:mr-3 file:rounded-[10px] file:border-0 file:bg-surface-muted file:px-3.5 file:py-2 file:text-[13px] file:font-medium file:text-ink"
            />
            <p className="text-[11px] text-ink-faint">PDF, JPG, PNG ou WebP. Até 25 MB.</p>
          </div>
        </Field>

        <Field label="Nome" hint="Deixe em branco para usar o nome do arquivo." error={fieldError(state, 'name')}>
          <Input name="name" placeholder={fileName || 'Ex.: Voucher hotel Gramado'} />
        </Field>

        <Field label="Categoria">
          <Select name="category" defaultValue="other">
            {DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {DOCUMENT_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>Enviar</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
