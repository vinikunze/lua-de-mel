'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ExternalLink, Heart, Home, MapPin, MoreVertical, Pencil, Phone, Plus, Route, Trash2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, Input, Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { Dropdown, DropdownContent, DropdownItem, DropdownTrigger } from '@/components/ui/dropdown';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { ResourceDialog, EditDialog } from '@/components/shared/resource-dialog';
import { DialogBody, DialogFooter, DialogForm } from '@/components/ui/dialog';
import { SubmitButton } from '@/components/shared/submit-button';
import { FormError, fieldError } from '@/components/shared/form-error';
import { PlaceAutocomplete, type PlaceValue } from '@/components/maps/place-autocomplete';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { toast } from '@/components/ui/toaster';
import { useRouteLeg } from '@/hooks/use-route-leg';
import { useTrip } from '@/components/trip/trip-context';
import { deletePlaceAction, savePlaceAction, toggleFavoritePlaceAction } from '@/server/actions/places';
import { PLACE_CATEGORIES, PLACE_CATEGORY_LABEL } from '@/lib/validators/place';
import { formatDuration } from '@/lib/format/date';
import { formatDistance } from '@/lib/format/distance';
import { cn } from '@/lib/utils';
import { useActionState, useEffect } from 'react';
import type { ActionResult } from '@/server/action-result';
import type { AccommodationRow, PlaceRow } from '@/types/database';

interface PlacesBoardProps {
  tripId: string;
  places: PlaceRow[];
  accommodations: AccommodationRow[];
  canEdit: boolean;
}

export function PlacesBoard({ tripId, places, accommodations, canEdit }: PlacesBoardProps) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  // Base de referência para "distância do hotel".
  const base = accommodations.find((a) => a.latitude != null && a.longitude != null) ?? null;

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return places.filter((place) => {
      if (category && place.category !== category) return false;
      if (onlyFavorites && !place.is_favorite) return false;
      if (!term) return true;
      return (
        place.name.toLowerCase().includes(term) ||
        (place.formatted_address ?? '').toLowerCase().includes(term)
      );
    });
  }, [places, category, search, onlyFavorites]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="min-w-[12rem] flex-1">
          <label htmlFor="busca-locais" className="sr-only">
            Buscar local
          </label>
          <Input
            id="busca-locais"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou endereço"
            className="h-10"
          />
        </div>
        <div className="min-w-[10rem]">
          <label htmlFor="filtro-locais" className="sr-only">
            Categoria
          </label>
          <Select
            id="filtro-locais"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 text-[13px]"
          >
            <option value="">Todas as categorias</option>
            {PLACE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {PLACE_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
        </div>
        <Button
          type="button"
          variant={onlyFavorites ? 'accent' : 'outline'}
          size="sm"
          onClick={() => setOnlyFavorites((v) => !v)}
        >
          <Heart className={cn('h-4 w-4', onlyFavorites && 'fill-current')} aria-hidden />
          Favoritos
        </Button>
        {canEdit && (
          <ResourceDialog
            title="Adicionar local"
            description="Restaurantes, atrações, estacionamentos — o que você quiser guardar."
            size="md"
            autoOpenParam="novo"
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4" aria-hidden />
                Local
              </Button>
            }
          >
            {(close) => <PlaceForm tripId={tripId} onDone={close} />}
          </ResourceDialog>
        )}
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={MapPin}
          title={places.length === 0 ? 'Nenhum local salvo' : 'Nenhum local com esses filtros'}
          description={
            places.length === 0
              ? 'Salve restaurantes, atrações e pontos de interesse para reaproveitá-los no roteiro e vê-los no mapa.'
              : 'Ajuste a busca ou os filtros para encontrar o que procura.'
          }
          action={
            places.length === 0 &&
            canEdit && (
              <ResourceDialog title="Adicionar local" size="md" trigger={<Button size="sm">Adicionar local</Button>}>
                {(close) => <PlaceForm tripId={tripId} onDone={close} />}
              </ResourceDialog>
            )
          }
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              tripId={tripId}
              canEdit={canEdit}
              base={base}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PlaceCard({
  place,
  tripId,
  canEdit,
  base,
}: {
  place: PlaceRow;
  tripId: string;
  canEdit: boolean;
  base: AccommodationRow | null;
}) {
  const router = useRouter();
  const { google } = useTrip();
  const { state, compute } = useRouteLeg(tripId);
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const canMeasure =
    google.routes && base != null && place.latitude != null && place.longitude != null && base.id !== place.id;

  async function handleDelete() {
    setBusy(true);
    const result = await deletePlaceAction(tripId, place.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Local removido.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  async function toggleFavorite() {
    const result = await toggleFavoritePlaceAction(tripId, place.id, !place.is_favorite);
    if (result.ok) router.refresh();
    else toast.error(result.error);
  }

  return (
    <Card className="flex flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-ink">{place.name}</h3>
          <Badge tone="neutral" className="mt-1">
            {PLACE_CATEGORY_LABEL[place.category]}
          </Badge>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {canEdit && (
            <button
              type="button"
              onClick={() => void toggleFavorite()}
              aria-label={place.is_favorite ? 'Remover dos favoritos' : 'Marcar como favorito'}
              aria-pressed={place.is_favorite}
              className="rounded p-1.5 text-ink-faint transition-colors hover:text-danger"
            >
              <Heart className={cn('h-4 w-4', place.is_favorite && 'fill-danger text-danger')} aria-hidden />
            </button>
          )}
          {canEdit && (
            <Dropdown>
              <DropdownTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${place.name}`}>
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </Button>
              </DropdownTrigger>
              <DropdownContent>
                <DropdownItem onSelect={() => setEditing(true)}>
                  <Pencil className="h-4 w-4" aria-hidden />
                  Editar
                </DropdownItem>
                <DropdownItem destructive onSelect={() => setConfirming(true)}>
                  <Trash2 className="h-4 w-4" aria-hidden />
                  Excluir
                </DropdownItem>
              </DropdownContent>
            </Dropdown>
          )}
        </div>
      </div>

      {place.formatted_address && (
        <p className="mt-2 text-[12px] leading-relaxed text-ink-soft">{place.formatted_address}</p>
      )}
      {place.notes && <p className="mt-2 text-[12px] leading-relaxed text-ink-faint">{place.notes}</p>}

      {canMeasure && (
        <div className="mt-3">
          {state.status === 'idle' && (
            <button
              type="button"
              onClick={() =>
                void compute(
                  {
                    placeId: base?.google_place_id,
                    latitude: base?.latitude,
                    longitude: base?.longitude,
                    address: base?.address,
                  },
                  {
                    placeId: place.google_place_id,
                    latitude: place.latitude,
                    longitude: place.longitude,
                    address: place.formatted_address,
                  },
                )
              }
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-ink-faint transition-colors hover:text-accent"
            >
              <Home className="h-3.5 w-3.5" aria-hidden />
              Distância da hospedagem
            </button>
          )}
          {state.status === 'loading' && <p className="text-[12px] text-ink-faint">Calculando…</p>}
          {state.status === 'error' && <p className="text-[12px] text-ink-faint">{state.message}</p>}
          {state.status === 'ready' && (
            <p className="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2.5 py-1 text-[12px] text-ink-soft tabular">
              <Route className="h-3.5 w-3.5" aria-hidden />
              {formatDistance(state.result.distanceMeters)} · {formatDuration(state.result.durationSeconds)} de
              carro da hospedagem
            </p>
          )}
        </div>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 pt-3">
        <OpenRouteLink
          destination={{
            latitude: place.latitude,
            longitude: place.longitude,
            address: place.formatted_address,
            name: place.name,
            googlePlaceId: place.google_place_id,
          }}
          label="Abrir no mapa"
          className="text-[12px]"
        />
        {place.phone && (
          <a
            href={`tel:${place.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            <Phone className="h-3 w-3" aria-hidden />
            Ligar
          </a>
        )}
        {place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
          >
            <ExternalLink className="h-3 w-3" aria-hidden />
            Site
          </a>
        )}
      </div>

      {canEdit && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar local" size="md">
            <PlaceForm tripId={tripId} place={place} onDone={() => setEditing(false)} />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir este local?"
            description={`"${place.name}" será removido. Eventos do roteiro que usam este local continuam existindo, mas perdem a localização.`}
            confirmLabel="Excluir local"
            loading={busy}
            onConfirm={handleDelete}
          />
        </>
      )}
    </Card>
  );
}

function PlaceForm({ tripId, place, onDone }: { tripId: string; place?: PlaceRow; onDone: () => void }) {
  const router = useRouter();
  const { google } = useTrip();
  const action = savePlaceAction.bind(null, tripId, place?.id ?? null);
  const [state, formAction] = useActionState<ActionResult<{ id: string }> | null, FormData>(action, null);
  const [selected, setSelected] = useState<PlaceValue | null>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success(place ? 'Local atualizado.' : 'Local salvo.');
      onDone();
      router.refresh();
    }
  }, [state, place, onDone, router]);

  return (
    <DialogForm action={formAction} noValidate>
      <DialogBody className="space-y-5">
        <FormError state={state} />

        {!place && (
          <Field label="Buscar local" hint="Escolha na lista para salvar a localização exata.">
            <PlaceAutocomplete
              namePrefix="place"
              value={selected}
              onChange={setSelected}
              available={google.places}
            />
          </Field>
        )}

        <Field label="Nome" error={fieldError(state, 'name')} required={!selected}>
          <Input name="name" defaultValue={place?.name ?? ''} placeholder={selected?.name ?? 'Nome do local'} />
        </Field>

        <Field label="Categoria">
          <Select name="category" defaultValue={place?.category ?? selected?.category ?? 'attraction'}>
            {PLACE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {PLACE_CATEGORY_LABEL[value]}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Endereço" error={fieldError(state, 'formattedAddress')}>
          <Input
            name="address"
            defaultValue={place?.formatted_address ?? ''}
            placeholder={selected?.formattedAddress ?? 'Rua, número, cidade'}
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Telefone">
            <Input name="phone" type="tel" defaultValue={place?.phone ?? ''} />
          </Field>
          <Field label="Site" error={fieldError(state, 'website')}>
            <Input name="website" inputMode="url" defaultValue={place?.website ?? ''} placeholder="https://…" />
          </Field>
        </div>

        <Field label="Observações">
          <Textarea name="notes" rows={3} defaultValue={place?.notes ?? ''} />
        </Field>

        <label className="flex items-center gap-2.5 text-[13px] text-ink">
          <input
            type="checkbox"
            name="isFavorite"
            defaultChecked={place?.is_favorite}
            className="h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
          />
          Marcar como favorito
        </label>
      </DialogBody>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Cancelar
        </Button>
        <SubmitButton>{place ? 'Salvar alterações' : 'Salvar local'}</SubmitButton>
      </DialogFooter>
    </DialogForm>
  );
}
