'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSortable } from '@dnd-kit/sortable';
import type { DraggableAttributes } from '@dnd-kit/core';
import type { SyntheticListenerMap } from '@dnd-kit/core/dist/hooks/utilities';
import { CSS } from '@dnd-kit/utilities';
import {
  CalendarClock, Check, ExternalLink, GripVertical, MoreVertical, Pencil, Phone, Trash2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dropdown, DropdownContent, DropdownItem, DropdownLabel, DropdownSeparator, DropdownTrigger,
} from '@/components/ui/dropdown';
import { EventIcon } from '@/components/trip/event-row';
import { OpenRouteLink } from '@/components/trip/open-route-link';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { EditDialog } from '@/components/shared/resource-dialog';
import { ItineraryForm } from '@/components/itinerary/itinerary-form';
import {
  deleteItineraryItemAction, moveItineraryItemAction, updateItineraryStatusAction,
} from '@/server/actions/itinerary';
import { toast } from '@/components/ui/toaster';
import { formatShortWeekday, formatTime } from '@/lib/format/date';
import { formatMoney } from '@/lib/format/money';
import { cn } from '@/lib/utils';
import type { TripEvent } from '@/lib/domain/timeline';
import type { ItineraryItemRow, PlaceRow } from '@/types/database';

interface ItineraryEventProps {
  event: TripEvent;
  tripId: string;
  canEdit: boolean;
  places: PlaceRow[];
  rawItem?: ItineraryItemRow;
  days: string[];
  warning?: string | null;
  sortable: boolean;
}

export function ItineraryEvent(props: ItineraryEventProps) {
  const { event, sortable } = props;
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    disabled: !sortable,
  });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn('relative', isDragging && 'z-10 opacity-60')}
    >
      <EventBody {...props} dragHandle={sortable ? { attributes, listeners } : null} />
    </div>
  );
}

function EventBody({
  event,
  tripId,
  canEdit,
  places,
  rawItem,
  days,
  warning,
  dragHandle,
}: ItineraryEventProps & {
  dragHandle: { attributes: DraggableAttributes; listeners: SyntheticListenerMap | undefined } | null;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const isItinerary = event.source === 'itinerary';
  const done = event.status === 'done';

  async function handleDelete() {
    setBusy(true);
    const result = await deleteItineraryItemAction(tripId, event.sourceId);
    setBusy(false);
    if (result.ok) {
      toast.success('Evento removido.');
      setConfirming(false);
      router.refresh();
    } else toast.error(result.error);
  }

  async function toggleDone() {
    const result = await updateItineraryStatusAction(tripId, event.sourceId, done ? 'planned' : 'done');
    if (result.ok) router.refresh();
    else toast.error(result.error);
  }

  async function moveTo(day: string | null) {
    const result = await moveItineraryItemAction(tripId, event.sourceId, day);
    if (result.ok) {
      toast.success(day ? `Movido para ${formatShortWeekday(day)}.` : 'Movido para "sem data".');
      router.refresh();
    } else toast.error(result.error);
  }

  return (
    <article
      id={`evento-${event.sourceId}`}
      className={cn(
        'group relative flex scroll-mt-24 gap-3 rounded-[12px] border border-transparent bg-surface px-3 py-3 transition-colors',
        'hover:border-line',
        done && 'opacity-60',
      )}
    >
      {/* Horário */}
      <div className="w-11 shrink-0 pt-1 text-right">
        {event.allDay ? (
          <span className="text-[11px] text-ink-faint">—</span>
        ) : (
          <span className="text-[13px] font-semibold text-ink tabular">
            {formatTime(event.startsAt, event.timezone)}
          </span>
        )}
      </div>

      <EventIcon category={event.category} className="mt-0.5" />

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h4 className={cn('text-[14px] font-medium text-ink', done && 'line-through')}>{event.title}</h4>
            {event.subtitle && <p className="mt-0.5 truncate text-[12px] text-ink-soft">{event.subtitle}</p>}
            {event.endsAt && !event.allDay && (
              <p className="mt-0.5 text-[12px] text-ink-faint tabular">
                até {formatTime(event.endsAt, event.timezone)}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1">
            {!isItinerary && <Badge tone="neutral">Reserva</Badge>}
            {canEdit && isItinerary && dragHandle && (
              <button
                type="button"
                className="cursor-grab touch-none rounded p-1 text-ink-faint opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100 active:cursor-grabbing"
                aria-label={`Reordenar ${event.title}`}
                {...dragHandle.attributes}
                {...dragHandle.listeners}
              >
                <GripVertical className="h-4 w-4" aria-hidden />
              </button>
            )}
            {canEdit && isItinerary && (
              <Dropdown>
                <DropdownTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={`Ações de ${event.title}`}>
                    <MoreVertical className="h-4 w-4" aria-hidden />
                  </Button>
                </DropdownTrigger>
                <DropdownContent>
                  <DropdownItem onSelect={() => setEditing(true)}>
                    <Pencil className="h-4 w-4" aria-hidden />
                    Editar
                  </DropdownItem>
                  <DropdownItem onSelect={() => void toggleDone()}>
                    <Check className="h-4 w-4" aria-hidden />
                    {done ? 'Marcar como pendente' : 'Marcar como concluído'}
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownLabel>Mover para</DropdownLabel>
                  <div className="max-h-52 overflow-y-auto">
                    {days.map((day) => (
                      <DropdownItem
                        key={day}
                        disabled={day === event.dayDate}
                        onSelect={() => void moveTo(day)}
                      >
                        <CalendarClock className="h-4 w-4" aria-hidden />
                        {formatShortWeekday(day)}
                      </DropdownItem>
                    ))}
                    <DropdownItem disabled={!event.dayDate} onSelect={() => void moveTo(null)}>
                      Sem data definida
                    </DropdownItem>
                  </div>
                  <DropdownSeparator />
                  <DropdownItem destructive onSelect={() => setConfirming(true)}>
                    <Trash2 className="h-4 w-4" aria-hidden />
                    Excluir
                  </DropdownItem>
                </DropdownContent>
              </Dropdown>
            )}
          </div>
        </div>

        {event.address && <p className="mt-1 text-[12px] leading-relaxed text-ink-soft">{event.address}</p>}

        {(event.reservationCode || event.cost != null) && (
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            {event.reservationCode && (
              <Badge tone="outline" className="font-mono">
                {event.reservationCode}
              </Badge>
            )}
            {event.cost != null && (
              <span className="text-[12px] font-medium text-ink tabular">
                {formatMoney(event.cost, event.currency)}
              </span>
            )}
          </div>
        )}

        {event.notes && <p className="mt-1.5 text-[12px] leading-relaxed text-ink-soft">{event.notes}</p>}

        {warning && (
          <p className="mt-2 rounded-[8px] bg-warning-soft px-2.5 py-1.5 text-[12px] leading-relaxed text-warning">
            {warning}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
          {(event.latitude != null || event.address) && (
            <OpenRouteLink
              destination={{
                latitude: event.latitude,
                longitude: event.longitude,
                address: event.address,
                name: event.title,
                googlePlaceId: event.googlePlaceId,
              }}
              label="Abrir rota"
              className="text-[12px]"
            />
          )}
          {event.phone && (
            <a
              href={`tel:${event.phone.replace(/\s/g, '')}`}
              className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
            >
              <Phone className="h-3 w-3" aria-hidden />
              Ligar
            </a>
          )}
          {event.url && (
            <a
              href={event.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[12px] font-medium text-accent hover:underline"
            >
              <ExternalLink className="h-3 w-3" aria-hidden />
              Abrir link
            </a>
          )}
        </div>
      </div>

      {canEdit && isItinerary && rawItem && (
        <>
          <EditDialog open={editing} onOpenChange={setEditing} title="Editar evento">
            <ItineraryForm
              tripId={tripId}
              item={rawItem}
              places={places}
              onDone={() => setEditing(false)}
            />
          </EditDialog>
          <ConfirmDialog
            open={confirming}
            onOpenChange={setConfirming}
            title="Excluir este evento?"
            description={`"${event.title}" será removido do roteiro.`}
            confirmLabel="Excluir evento"
            loading={busy}
            onConfirm={handleDelete}
          />
        </>
      )}
    </article>
  );
}
