'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToParentElement } from '@dnd-kit/modifiers';
import {
  SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CalendarDays, Filter, Plus } from 'lucide-react';
import { ItineraryEvent } from '@/components/itinerary/itinerary-event';
import { TravelLeg } from '@/components/itinerary/travel-leg';
import { ItineraryForm } from '@/components/itinerary/itinerary-form';
import { ResourceDialog } from '@/components/shared/resource-dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Select } from '@/components/ui/input';
import { toast } from '@/components/ui/toaster';
import { reorderItineraryAction } from '@/server/actions/itinerary';
import { useTrip } from '@/components/trip/trip-context';
import { sortEvents, type TripEvent } from '@/lib/domain/timeline';
import { ITINERARY_CATEGORIES, ITINERARY_CATEGORY_LABEL } from '@/lib/validators/itinerary';
import { formatFullWeekday, formatShortWeekday, todayInZone } from '@/lib/format/date';
import { cn } from '@/lib/utils';
import type { ItineraryItemRow, PlaceRow } from '@/types/database';

interface ItineraryBoardProps {
  tripId: string;
  days: string[];
  events: TripEvent[];
  items: ItineraryItemRow[];
  places: PlaceRow[];
  canEdit: boolean;
}

export function ItineraryBoard({ tripId, days, events, items, places, canEdit }: ItineraryBoardProps) {
  const router = useRouter();
  const { trip, google } = useTrip();
  const today = todayInZone(trip.timezone);

  // Abre no dia de hoje quando a viagem está acontecendo.
  const [activeDay, setActiveDay] = useState<string>(() =>
    days.includes(today) ? today : (days[0] ?? trip.start_date),
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [order, setOrder] = useState<Record<string, string[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const filtered = useMemo(
    () => (categoryFilter ? events.filter((e) => e.category === categoryFilter) : events),
    [events, categoryFilter],
  );

  const dayEvents = useMemo(() => {
    const list = sortEvents(filtered.filter((e) => e.dayDate === activeDay));
    const custom = order[activeDay];
    if (!custom) return list;
    // Ordem otimista logo após arrastar, antes de o servidor confirmar.
    const map = new Map(list.map((e) => [e.id, e]));
    const reordered = custom.map((id) => map.get(id)).filter((e): e is TripEvent => Boolean(e));
    const rest = list.filter((e) => !custom.includes(e.id));
    return [...reordered, ...rest];
  }, [filtered, activeDay, order]);

  const unscheduled = useMemo(() => filtered.filter((e) => !e.dayDate), [filtered]);

  const timedEvents = dayEvents.filter((e) => !e.allDay);
  const untimedEvents = dayEvents.filter((e) => e.allDay);
  const sortableIds = dayEvents.filter((e) => e.source === 'itinerary').map((e) => e.id);

  const countByDay = useMemo(() => {
    const counts = new Map<string, number>();
    for (const event of events) {
      if (!event.dayDate) continue;
      counts.set(event.dayDate, (counts.get(event.dayDate) ?? 0) + 1);
    }
    return counts;
  }, [events]);

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const ids = dayEvents.map((e) => e.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;

    const next = arrayMove(ids, oldIndex, newIndex);
    setOrder((current) => ({ ...current, [activeDay]: next }));

    // Só os eventos do roteiro têm posição gravável; reservas seguem o horário.
    const itineraryIds = next
      .map((id) => dayEvents.find((e) => e.id === id))
      .filter((e): e is TripEvent => e !== undefined && e.source === 'itinerary')
      .map((e) => e.sourceId);

    const result = await reorderItineraryAction(tripId, activeDay, itineraryIds);
    if (!result.ok) {
      toast.error(result.error);
      setOrder((current) => {
        const copy = { ...current };
        delete copy[activeDay];
        return copy;
      });
    } else {
      router.refresh();
    }
  }

  const rawItem = (event: TripEvent) => items.find((i) => i.id === event.sourceId);

  function warningFor(index: number): string | null {
    // Sobreposição direta de horários — o aviso de deslocamento vem do TravelLeg.
    if (index === 0) return null;
    const previous = timedEvents[index - 1];
    const current = timedEvents[index];
    if (!previous?.startsAt || !current?.startsAt) return null;
    const previousEnd = new Date(previous.endsAt ?? previous.startsAt).getTime();
    if (new Date(current.startsAt).getTime() < previousEnd) {
      return `Este evento começa antes de "${previous.title}" terminar.`;
    }
    return null;
  }

  function gapBetween(a: TripEvent, b: TripEvent): number | null {
    if (!a.startsAt || !b.startsAt) return null;
    return (new Date(b.startsAt).getTime() - new Date(a.endsAt ?? a.startsAt).getTime()) / 1000;
  }

  return (
    <div className="space-y-5">
      {/* Seletor de dias */}
      <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {days.map((day, index) => {
          const active = day === activeDay;
          const count = countByDay.get(day) ?? 0;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDay(day)}
              aria-current={active ? 'true' : undefined}
              className={cn(
                'flex shrink-0 flex-col items-start rounded-[12px] border px-3.5 py-2 text-left transition-colors',
                active
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-line bg-surface text-ink-soft hover:border-line-strong',
              )}
            >
              <span className="text-[10px] font-medium uppercase tracking-wide opacity-70">
                Dia {index + 1}
                {day === today && ' · hoje'}
              </span>
              <span className="text-[13px] font-semibold capitalize">{formatShortWeekday(day)}</span>
              <span className={cn('text-[11px] tabular', active ? 'opacity-70' : 'text-ink-faint')}>
                {count} {count === 1 ? 'item' : 'itens'}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold capitalize text-ink">{formatFullWeekday(activeDay)}</h2>
          <p className="text-[12px] text-ink-soft">
            {dayEvents.length} {dayEvents.length === 1 ? 'compromisso' : 'compromissos'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <label className="sr-only" htmlFor="filtro-categoria">
            Filtrar por categoria
          </label>
          <div className="relative">
            <Filter
              className="pointer-events-none absolute left-3 top-1/2 z-10 h-3.5 w-3.5 -translate-y-1/2 text-ink-faint"
              aria-hidden
            />
            <Select
              id="filtro-categoria"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-auto pl-8 text-[13px]"
            >
              <option value="">Todas as categorias</option>
              {ITINERARY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {ITINERARY_CATEGORY_LABEL[category]}
                </option>
              ))}
            </Select>
          </div>

          {canEdit && (
            <ResourceDialog
              title="Adicionar ao roteiro"
              description="Passeio, restaurante, deslocamento — com ou sem horário definido."
              autoOpenParam="novo"
              trigger={
                <Button size="sm">
                  <Plus className="h-4 w-4" aria-hidden />
                  <span className="hidden sm:inline">Adicionar evento</span>
                  <span className="sm:hidden">Evento</span>
                </Button>
              }
            >
              {(close) => (
                <ItineraryForm tripId={tripId} places={places} defaultDay={activeDay} onDone={close} />
              )}
            </ResourceDialog>
          )}
        </div>
      </div>

      {/* Linha do tempo do dia */}
      {dayEvents.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhum evento neste dia"
          description="Adicione passeios, refeições e deslocamentos para montar a agenda deste dia."
          action={
            canEdit && (
              <ResourceDialog title="Adicionar ao roteiro" trigger={<Button size="sm">Adicionar evento</Button>}>
                {(close) => (
                  <ItineraryForm tripId={tripId} places={places} defaultDay={activeDay} onDone={close} />
                )}
              </ResourceDialog>
            )
          }
        />
      ) : (
        <Card className="overflow-hidden p-1.5">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
            modifiers={[restrictToVerticalAxis, restrictToParentElement]}
          >
            <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
              {timedEvents.map((event, index) => {
                const next = timedEvents[index + 1];
                const bothMappable =
                  event.latitude != null && next?.latitude != null && next.longitude != null;
                return (
                  <div key={event.id}>
                    <ItineraryEvent
                      event={event}
                      tripId={tripId}
                      canEdit={canEdit}
                      places={places}
                      rawItem={rawItem(event)}
                      days={days}
                      warning={warningFor(index)}
                      sortable={canEdit && event.source === 'itinerary'}
                    />
                    {next && bothMappable && (
                      <TravelLeg
                        tripId={tripId}
                        available={google.routes}
                        origin={{
                          placeId: event.googlePlaceId,
                          latitude: event.latitude,
                          longitude: event.longitude,
                          address: event.address,
                        }}
                        destination={{
                          placeId: next.googlePlaceId,
                          latitude: next.latitude,
                          longitude: next.longitude,
                          address: next.address,
                        }}
                        gapSeconds={gapBetween(event, next)}
                      />
                    )}
                  </div>
                );
              })}

              {untimedEvents.length > 0 && (
                <div className="mt-2 border-t border-line pt-2">
                  <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-ink-faint">
                    A qualquer momento do dia
                  </p>
                  {untimedEvents.map((event) => (
                    <ItineraryEvent
                      key={event.id}
                      event={event}
                      tripId={tripId}
                      canEdit={canEdit}
                      places={places}
                      rawItem={rawItem(event)}
                      days={days}
                      sortable={canEdit && event.source === 'itinerary'}
                    />
                  ))}
                </div>
              )}
            </SortableContext>
          </DndContext>
        </Card>
      )}

      {/* Eventos ainda sem data */}
      {unscheduled.length > 0 && (
        <section>
          <h3 className="mb-2 text-[13px] font-semibold text-ink">
            Sem data definida
            <span className="ml-2 text-[12px] font-normal text-ink-faint">
              {unscheduled.length} {unscheduled.length === 1 ? 'item' : 'itens'}
            </span>
          </h3>
          <Card className="p-1.5">
            {unscheduled.map((event) => (
              <ItineraryEvent
                key={event.id}
                event={event}
                tripId={tripId}
                canEdit={canEdit}
                places={places}
                rawItem={rawItem(event)}
                days={days}
                sortable={false}
              />
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
