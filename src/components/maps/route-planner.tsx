'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Route as RouteIcon, Sparkles, Trash2, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import { EmptyState } from '@/components/ui/empty-state';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { toast } from '@/components/ui/toaster';
import { useTrip } from '@/components/trip/trip-context';
import { deleteRouteAction, saveRouteAction } from '@/server/actions/routes';
import { formatDuration, formatShortWeekday } from '@/lib/format/date';
import { formatDistance, travelModeLabel } from '@/lib/format/distance';
import { cn } from '@/lib/utils';
import type { RouteWithWaypoints } from '@/server/queries/trips';
import type { PlaceRow, TravelMode } from '@/types/database';

const MODES: TravelMode[] = ['DRIVE', 'WALK', 'TRANSIT', 'BICYCLE'];

export function RoutePlanner({
  tripId,
  places,
  routes,
  days,
  canEdit,
}: {
  tripId: string;
  places: PlaceRow[];
  routes: RouteWithWaypoints[];
  days: string[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const { google } = useTrip();
  const [building, setBuilding] = useState(false);
  const [name, setName] = useState('');
  const [dayDate, setDayDate] = useState('');
  const [mode, setMode] = useState<TravelMode>('DRIVE');
  const [optimize, setOptimize] = useState(false);
  const [stops, setStops] = useState<string[]>([]);
  const [pending, startTransition] = useTransition();

  const mappable = places.filter((p) => p.latitude != null && p.longitude != null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStops((current) => {
      const oldIndex = current.indexOf(String(active.id));
      const newIndex = current.indexOf(String(over.id));
      return arrayMove(current, oldIndex, newIndex);
    });
  }

  function save() {
    startTransition(async () => {
      const result = await saveRouteAction(tripId, null, {
        name: name.trim(),
        dayDate: dayDate || null,
        travelMode: mode,
        placeIds: stops,
        optimize,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(result.data.message ?? 'Rota salva.');
      setBuilding(false);
      setStops([]);
      setName('');
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {canEdit && !building && (
        <Button size="sm" onClick={() => setBuilding(true)} disabled={mappable.length < 2}>
          <Plus className="h-4 w-4" aria-hidden />
          Montar rota
        </Button>
      )}

      {mappable.length < 2 && (
        <p className="text-[13px] text-ink-soft">
          Salve pelo menos dois locais com endereço para montar uma rota com paradas.
        </p>
      )}

      {building && (
        <Card className="space-y-4 p-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Nome da rota">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex.: Volta pelo centro" />
            </Field>
            <Field label="Dia (opcional)">
              <Select value={dayDate} onChange={(e) => setDayDate(e.target.value)}>
                <option value="">Sem dia definido</option>
                {days.map((day) => (
                  <option key={day} value={day}>
                    {formatShortWeekday(day)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Como vai">
              <Select value={mode} onChange={(e) => setMode(e.target.value as TravelMode)}>
                {MODES.map((value) => (
                  <option key={value} value={value}>
                    {travelModeLabel(value).replace(/^de |^a /, '')}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div>
            <p className="mb-2 text-[13px] font-medium text-ink">Paradas na ordem</p>
            {stops.length === 0 ? (
              <p className="text-[12px] text-ink-soft">Adicione locais abaixo para montar o trajeto.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
                modifiers={[restrictToVerticalAxis, restrictToParentElement]}
              >
                <SortableContext items={stops} strategy={verticalListSortingStrategy}>
                  <ol className="space-y-1.5">
                    {stops.map((id, index) => {
                      const place = places.find((p) => p.id === id);
                      if (!place) return null;
                      return (
                        <SortableStop
                          key={id}
                          id={id}
                          index={index}
                          name={place.name}
                          address={place.formatted_address}
                          onRemove={() => setStops((current) => current.filter((s) => s !== id))}
                        />
                      );
                    })}
                  </ol>
                </SortableContext>
              </DndContext>
            )}
          </div>

          <div>
            <label htmlFor="adicionar-parada" className="mb-1.5 block text-[13px] font-medium text-ink">
              Adicionar parada
            </label>
            <Select
              id="adicionar-parada"
              value=""
              onChange={(e) => {
                if (e.target.value) setStops((current) => [...current, e.target.value]);
              }}
            >
              <option value="">Escolha um local…</option>
              {mappable
                .filter((place) => !stops.includes(place.id))
                .map((place) => (
                  <option key={place.id} value={place.id}>
                    {place.name}
                  </option>
                ))}
            </Select>
          </div>

          {stops.length > 2 && google.routes && (
            <label className="flex items-start gap-2.5 text-[13px] text-ink">
              <input
                type="checkbox"
                checked={optimize}
                onChange={(e) => setOptimize(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-line-strong accent-[var(--color-accent)]"
              />
              <span>
                Otimizar a ordem das paradas intermediárias
                <span className="block text-[12px] text-ink-faint">
                  A primeira e a última parada continuam onde estão. Sem marcar, mantemos exatamente a ordem
                  que você definiu.
                </span>
              </span>
            </label>
          )}

          <div className="flex justify-end gap-2 border-t border-line pt-4">
            <Button variant="outline" onClick={() => setBuilding(false)}>
              Cancelar
            </Button>
            <Button onClick={save} loading={pending} disabled={stops.length < 2}>
              Salvar rota
            </Button>
          </div>
        </Card>
      )}

      {routes.length === 0 && !building ? (
        <EmptyState
          icon={RouteIcon}
          title="Nenhuma rota salva"
          description="Monte trajetos com várias paradas — hotel, passeio, restaurante, hotel — e abra tudo de uma vez no Google Maps."
        />
      ) : (
        <div className="space-y-3">
          {routes.map((route) => (
            <SavedRoute key={route.id} route={route} tripId={tripId} canEdit={canEdit} />
          ))}
        </div>
      )}
    </div>
  );
}

function SortableStop({
  id,
  index,
  name,
  address,
  onRemove,
}: {
  id: string;
  index: number;
  name: string;
  address: string | null;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        'flex items-center gap-2 rounded-[10px] border border-line bg-surface px-2.5 py-2',
        isDragging && 'opacity-60',
      )}
    >
      <button
        type="button"
        className="cursor-grab touch-none rounded p-1 text-ink-faint active:cursor-grabbing"
        aria-label={`Reordenar ${name}`}
        {...attributes}
        {...listeners}
      >
        <GripVertical className="h-4 w-4" aria-hidden />
      </button>
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground tabular">
        {index + 1}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
        {address && <span className="block truncate text-[11px] text-ink-faint">{address}</span>}
      </span>
      <Button type="button" variant="ghost" size="icon-sm" onClick={onRemove} aria-label={`Remover ${name}`}>
        <X className="h-4 w-4" aria-hidden />
      </Button>
    </li>
  );
}

function SavedRoute({
  route,
  tripId,
  canEdit,
}: {
  route: RouteWithWaypoints;
  tripId: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const waypoints = [...(route.waypoints ?? [])].sort((a, b) => a.position - b.position);

  async function handleDelete() {
    setBusy(true);
    const result = await deleteRouteAction(tripId, route.id);
    setBusy(false);
    if (result.ok) {
      toast.success('Rota removida.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-[14px] font-semibold text-ink">{route.name ?? 'Rota'}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-soft">
            {route.day_date && <span>{formatShortWeekday(route.day_date)}</span>}
            <span>{travelModeLabel(route.travel_mode)}</span>
            {route.distance_meters != null && (
              <span className="font-medium text-ink tabular">{formatDistance(route.distance_meters)}</span>
            )}
            {route.duration_seconds != null && (
              <span className="tabular">
                {formatDuration(route.duration_in_traffic_seconds ?? route.duration_seconds)}
              </span>
            )}
            {route.optimize_waypoint_order && (
              <Badge tone="accent">
                <Sparkles className="h-3 w-3" aria-hidden />
                Otimizada
              </Badge>
            )}
            {route.stale && <Badge tone="warning">Sem cálculo automático</Badge>}
          </div>
        </div>
        {canEdit && (
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={`Excluir ${route.name ?? 'rota'}`}
            onClick={() => setConfirming(true)}
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </Button>
        )}
      </div>

      <ol className="mt-3 space-y-1">
        {waypoints.map((waypoint, index) => (
          <li key={waypoint.id} className="flex items-start gap-2.5 text-[13px]">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-muted text-[11px] font-semibold text-ink-soft tabular">
              {index + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-ink">{waypoint.label}</span>
              {waypoint.leg_distance_meters != null && index < waypoints.length - 1 && (
                <span className="block text-[11px] text-ink-faint tabular">
                  {formatDistance(waypoint.leg_distance_meters)} ·{' '}
                  {formatDuration(waypoint.leg_duration_seconds ?? 0)} até a próxima parada
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="mt-4 border-t border-line pt-3">
        <OpenRouteLink
          stops={waypoints.map((waypoint) => ({
            latitude: waypoint.latitude,
            longitude: waypoint.longitude,
            address: waypoint.address,
            name: waypoint.label,
          }))}
          mode={route.travel_mode}
          variant="button"
          label="Abrir no Google Maps"
        />
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Excluir esta rota?"
        description="O trajeto salvo será removido. Os locais continuam na viagem."
        confirmLabel="Excluir rota"
        loading={busy}
        onConfirm={handleDelete}
      />
    </Card>
  );
}
