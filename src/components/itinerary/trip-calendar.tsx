'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EventIcon } from '@/components/trip/event-row';
import { EmptyState } from '@/components/ui/empty-state';
import { eventsOfDay, type TripEvent } from '@/lib/domain/timeline';
import {
  addDaysToDateOnly, daysBetween, eachDayInRange, formatDate, formatFullWeekday,
  formatTime, parseDateOnly, toDateOnly, todayInZone,
} from '@/lib/format/date';
import { cn } from '@/lib/utils';
import { CalendarDays } from 'lucide-react';

type View = 'mes' | 'semana' | 'dia' | 'agenda';

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Cor do ponto/indicador por categoria — mesmo código de cor do resto do sistema. */
function categoryColor(category: string): string {
  return `var(--color-cat-${['flight', 'accommodation', 'car', 'restaurant', 'attraction', 'tour', 'shopping', 'event', 'payment'].includes(category) ? category : 'other'})`;
}

export function TripCalendar({
  events,
  startDate,
  endDate,
  timezone,
}: {
  events: TripEvent[];
  startDate: string;
  endDate: string;
  timezone: string;
}) {
  const today = todayInZone(timezone);
  const initialDay = daysBetween(startDate, today) >= 0 && daysBetween(today, endDate) >= 0 ? today : startDate;

  const [view, setView] = useState<View>('mes');
  const [anchor, setAnchor] = useState<string>(initialDay);

  const tripDays = useMemo(() => eachDayInRange(startDate, endDate), [startDate, endDate]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(value) => setView(value as View)}>
          <TabsList className="w-auto">
            <TabsTrigger value="mes">Mês</TabsTrigger>
            <TabsTrigger value="semana">Semana</TabsTrigger>
            <TabsTrigger value="dia">Dia</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
          </TabsList>
        </Tabs>

        {view !== 'agenda' && (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Período anterior"
              onClick={() => setAnchor((current) => shift(current, view, -1))}
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </Button>
            <span className="min-w-[9rem] text-center text-[13px] font-medium capitalize text-ink">
              {label(anchor, view)}
            </span>
            <Button
              variant="outline"
              size="icon-sm"
              aria-label="Próximo período"
              onClick={() => setAnchor((current) => shift(current, view, 1))}
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAnchor(initialDay)}>
              Hoje
            </Button>
          </div>
        )}
      </div>

      {view === 'mes' && <MonthView anchor={anchor} events={events} tripDays={tripDays} today={today} onPick={(day) => { setAnchor(day); setView('dia'); }} />}
      {view === 'semana' && <WeekView anchor={anchor} events={events} tripDays={tripDays} today={today} />}
      {view === 'dia' && <DayView day={anchor} events={events} />}
      {view === 'agenda' && <AgendaView events={events} tripDays={tripDays} today={today} />}
    </div>
  );
}

function shift(anchor: string, view: View, direction: number): string {
  if (view === 'dia') return addDaysToDateOnly(anchor, direction);
  if (view === 'semana') return addDaysToDateOnly(anchor, direction * 7);
  const date = parseDateOnly(anchor);
  date.setUTCMonth(date.getUTCMonth() + direction, 1);
  return toDateOnly(date);
}

function label(anchor: string, view: View): string {
  if (view === 'dia') return formatFullWeekday(anchor);
  if (view === 'semana') {
    const start = startOfWeek(anchor);
    return `${formatDate(start)} – ${formatDate(addDaysToDateOnly(start, 6))}`;
  }
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    parseDateOnly(anchor),
  );
}

function startOfWeek(day: string): string {
  const date = parseDateOnly(day);
  return addDaysToDateOnly(day, -date.getUTCDay());
}

function MonthView({
  anchor,
  events,
  tripDays,
  today,
  onPick,
}: {
  anchor: string;
  events: TripEvent[];
  tripDays: string[];
  today: string;
  onPick: (day: string) => void;
}) {
  const date = parseDateOnly(anchor);
  const firstOfMonth = toDateOnly(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12)));
  const lastOfMonth = toDateOnly(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12)));
  const gridStart = startOfWeek(firstOfMonth);
  const gridEnd = addDaysToDateOnly(startOfWeek(lastOfMonth), 6);
  const cells = eachDayInRange(gridStart, gridEnd);
  const currentMonth = date.getUTCMonth();

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b border-line bg-surface-muted/50">
        {WEEKDAYS.map((weekday) => (
          <div key={weekday} className="px-1 py-2 text-center text-[11px] font-medium uppercase text-ink-faint">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day) => {
          const dayEvents = eventsOfDay(events, day);
          const inMonth = parseDateOnly(day).getUTCMonth() === currentMonth;
          const inTrip = tripDays.includes(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPick(day)}
              className={cn(
                'min-h-[4.5rem] border-b border-r border-line p-1.5 text-left transition-colors last:border-r-0 hover:bg-surface-muted sm:min-h-[6rem]',
                !inMonth && 'bg-surface-muted/30',
                inTrip && 'bg-accent-soft/40',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-6 w-6 items-center justify-center rounded-full text-[12px] tabular',
                  day === today ? 'bg-primary font-semibold text-primary-foreground' : inMonth ? 'text-ink' : 'text-ink-faint',
                )}
              >
                {Number(day.slice(-2))}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayEvents.slice(0, 3).map((event) => (
                  <span key={event.id} className="flex items-center gap-1">
                    <span
                      className="h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{ backgroundColor: categoryColor(event.category) }}
                      aria-hidden
                    />
                    <span className="truncate text-[10px] leading-tight text-ink-soft">{event.title}</span>
                  </span>
                ))}
                {dayEvents.length > 3 && (
                  <span className="block text-[10px] text-ink-faint">+{dayEvents.length - 3}</span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function WeekView({
  anchor,
  events,
  tripDays,
  today,
}: {
  anchor: string;
  events: TripEvent[];
  tripDays: string[];
  today: string;
}) {
  const start = startOfWeek(anchor);
  const days = eachDayInRange(start, addDaysToDateOnly(start, 6));

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {days.map((day) => {
        const dayEvents = eventsOfDay(events, day);
        return (
          <Card
            key={day}
            className={cn('p-3', day === today && 'border-accent', !tripDays.includes(day) && 'opacity-60')}
          >
            <p className="text-[12px] font-semibold capitalize text-ink">{formatFullWeekday(day)}</p>
            {dayEvents.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-faint">Sem compromissos</p>
            ) : (
              <ul className="mt-2 space-y-1.5">
                {dayEvents.map((event) => (
                  <li key={event.id} className="flex items-start gap-2">
                    <span className="w-9 shrink-0 text-[11px] text-ink-faint tabular">
                      {event.allDay ? '—' : formatTime(event.startsAt, event.timezone)}
                    </span>
                    <span className="min-w-0 truncate text-[12px] text-ink">{event.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function DayView({ day, events }: { day: string; events: TripEvent[] }) {
  const dayEvents = eventsOfDay(events, day);

  if (dayEvents.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Nenhum compromisso neste dia"
        description="Escolha outro dia ou adicione eventos pelo roteiro."
      />
    );
  }

  return (
    <Card className="divide-y divide-line">
      {dayEvents.map((event) => (
        <div key={event.id} className="flex items-start gap-3 p-4">
          <span className="w-12 shrink-0 pt-1 text-[13px] font-semibold text-ink tabular">
            {event.allDay ? '—' : formatTime(event.startsAt, event.timezone)}
          </span>
          <EventIcon category={event.category} />
          <div className="min-w-0 flex-1">
            <p className="text-[14px] font-medium text-ink">{event.title}</p>
            {event.address && <p className="mt-0.5 text-[12px] text-ink-soft">{event.address}</p>}
          </div>
          {event.href && (
            <Link href={event.href} className="shrink-0 text-[12px] font-medium text-accent hover:underline">
              Ver
            </Link>
          )}
        </div>
      ))}
    </Card>
  );
}

function AgendaView({
  events,
  tripDays,
  today,
}: {
  events: TripEvent[];
  tripDays: string[];
  today: string;
}) {
  const withEvents = tripDays.filter((day) => eventsOfDay(events, day).length > 0);

  if (withEvents.length === 0) {
    return (
      <EmptyState
        icon={CalendarDays}
        title="Agenda vazia"
        description="Cadastre voos, hospedagens e eventos do roteiro para preencher o calendário."
      />
    );
  }

  return (
    <div className="space-y-5">
      {withEvents.map((day) => (
        <section key={day}>
          <h3
            className={cn(
              'mb-2 text-[13px] font-semibold capitalize',
              day === today ? 'text-accent' : 'text-ink',
            )}
          >
            {formatFullWeekday(day)}
            {day === today && ' · hoje'}
          </h3>
          <Card className="divide-y divide-line">
            {eventsOfDay(events, day).map((event) => (
              <div key={event.id} className="flex items-start gap-3 px-4 py-3">
                <span className="w-11 shrink-0 text-[12px] text-ink-faint tabular">
                  {event.allDay ? '—' : formatTime(event.startsAt, event.timezone)}
                </span>
                <EventIcon category={event.category} className="h-8 w-8" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-ink">{event.title}</p>
                  {event.address && <p className="truncate text-[12px] text-ink-soft">{event.address}</p>}
                </div>
              </div>
            ))}
          </Card>
        </section>
      ))}
    </div>
  );
}
