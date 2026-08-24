import { z } from 'zod';
import {
  currency, money, optionalDateOnly, optionalText, optionalTime, optionalUrl,
  optionalUuid, requiredText, timezone,
} from './common';

export const ITINERARY_CATEGORIES = [
  'flight', 'accommodation', 'car', 'restaurant', 'attraction', 'tour',
  'transport', 'shopping', 'event', 'payment', 'free', 'other',
] as const;

export const ITINERARY_CATEGORY_LABEL: Record<(typeof ITINERARY_CATEGORIES)[number], string> = {
  flight: 'Voo',
  accommodation: 'Hospedagem',
  car: 'Carro',
  restaurant: 'Restaurante',
  attraction: 'Atração',
  tour: 'Passeio',
  transport: 'Deslocamento',
  shopping: 'Compras',
  event: 'Evento',
  payment: 'Pagamento',
  free: 'Tempo livre',
  other: 'Outro',
};

export const ITINERARY_STATUSES = ['planned', 'confirmed', 'done', 'cancelled'] as const;

export const ITINERARY_STATUS_LABEL: Record<(typeof ITINERARY_STATUSES)[number], string> = {
  planned: 'Planejado',
  confirmed: 'Confirmado',
  done: 'Concluído',
  cancelled: 'Cancelado',
};

/**
 * Um evento pode existir sem horário (ex.: "comprar chocolate") e até sem dia
 * definido — nesse caso aparece na lista "sem data definida".
 */
export const itineraryItemSchema = z
  .object({
    title: requiredText('o nome do evento', 160),
    category: z.enum(ITINERARY_CATEGORIES).default('other'),
    dayDate: optionalDateOnly(),
    startTime: optionalTime(),
    endTime: optionalTime(),
    timezone: timezone(),
    placeId: optionalUuid(),
    address: optionalText(300),
    description: optionalText(2000),
    cost: money(),
    currency: currency(),
    reservationCode: optionalText(60),
    url: optionalUrl(),
    phone: optionalText(60),
    status: z.enum(ITINERARY_STATUSES).default('planned'),
    notes: optionalText(2000),
  })
  .refine((data) => !(data.startTime && !data.dayDate), {
    message: 'Para definir um horário é preciso escolher o dia.',
    path: ['dayDate'],
  })
  .refine((data) => !data.endTime || !data.startTime || data.endTime >= data.startTime, {
    message: 'O término precisa ser depois do início.',
    path: ['endTime'],
  });

export type ItineraryItemInput = z.infer<typeof itineraryItemSchema>;

export const reorderSchema = z.object({
  dayDate: optionalDateOnly(),
  itemIds: z.array(z.string().uuid()).min(1),
});
