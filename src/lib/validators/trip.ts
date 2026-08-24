import { z } from 'zod';
import { currency, dateOnly, money, optionalText, optionalUrl, requiredText, timezone } from './common';

export const TRIP_STATUSES = ['planning', 'confirmed', 'ongoing', 'completed', 'cancelled'] as const;

export const TRIP_STATUS_LABEL: Record<(typeof TRIP_STATUSES)[number], string> = {
  planning: 'Planejando',
  confirmed: 'Confirmada',
  ongoing: 'Em andamento',
  completed: 'Finalizada',
  cancelled: 'Cancelada',
};

export const tripSchema = z
  .object({
    name: requiredText('o nome da viagem', 120),
    destinationLabel: optionalText(160),
    description: optionalText(2000),
    startDate: dateOnly('a data de ida'),
    endDate: dateOnly('a data de volta'),
    travelersCount: z.coerce
      .number()
      .int('Informe um número inteiro.')
      .min(1, 'Pelo menos 1 viajante.')
      .max(50, 'Máximo de 50 viajantes.')
      .default(1),
    baseCurrency: currency(),
    estimatedBudget: money(),
    coverImageUrl: optionalUrl(),
    timezone: timezone(),
    status: z.enum(TRIP_STATUSES).default('planning'),
    notes: optionalText(4000),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data de volta precisa ser igual ou posterior à data de ida.',
    path: ['endDate'],
  });

export type TripInput = z.infer<typeof tripSchema>;

export const destinationSchema = z.object({
  city: requiredText('a cidade', 120),
  state: optionalText(120),
  country: optionalText(120),
  placeId: optionalText(200),
  latitude: z.coerce.number().nullable().optional(),
  longitude: z.coerce.number().nullable().optional(),
});

export type DestinationInput = z.infer<typeof destinationSchema>;
