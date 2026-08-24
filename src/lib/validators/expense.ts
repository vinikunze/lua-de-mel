import { z } from 'zod';
import {
  currency, money, optionalDateOnly, optionalText, optionalUuid,
  paymentStatus, requiredText,
} from './common';

export const EXPENSE_CATEGORIES = [
  'flights', 'accommodation', 'transport', 'car_rental', 'fuel', 'tolls',
  'food', 'restaurants', 'tours', 'tickets', 'shopping', 'insurance',
  'parking', 'other',
] as const;

export const EXPENSE_CATEGORY_LABEL: Record<(typeof EXPENSE_CATEGORIES)[number], string> = {
  flights: 'Passagens',
  accommodation: 'Hospedagem',
  transport: 'Transporte',
  car_rental: 'Aluguel de carro',
  fuel: 'Combustível',
  tolls: 'Pedágios',
  food: 'Alimentação',
  restaurants: 'Restaurantes',
  tours: 'Passeios',
  tickets: 'Ingressos',
  shopping: 'Compras',
  insurance: 'Seguro viagem',
  parking: 'Estacionamento',
  other: 'Outros',
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: 'Não pago',
  partial: 'Parcialmente pago',
  paid: 'Pago',
  refunded: 'Reembolsado',
  cancelled: 'Cancelado',
};

export const expenseSchema = z
  .object({
    description: requiredText('a descrição', 200),
    category: z.enum(EXPENSE_CATEGORIES).default('other'),
    plannedAmount: money(),
    actualAmount: money(),
    currency: currency(),
    /** Câmbio informado manualmente; a arquitetura já prevê uma API futura. */
    exchangeRate: z.coerce
      .number()
      .positive('O câmbio precisa ser maior que zero.')
      .max(100000)
      .default(1),
    paymentStatus: paymentStatus(),
    paidAmount: money(),
    expenseDate: optionalDateOnly(),
    dueDate: optionalDateOnly(),
    paidAt: optionalDateOnly(),
    paymentMethod: optionalText(80),
    installments: z.coerce.number().int().min(1).max(60).default(1),
    paidByMemberId: optionalUuid(),
    splitEnabled: z.boolean().default(false),
    /** Participantes entre os quais o valor será dividido. */
    splitMemberIds: z.array(z.string().uuid()).default([]),
    notes: optionalText(2000),
    flightId: optionalUuid(),
    accommodationId: optionalUuid(),
    carRentalId: optionalUuid(),
    itineraryItemId: optionalUuid(),
  })
  .refine((data) => data.plannedAmount !== null || data.actualAmount !== null, {
    message: 'Informe pelo menos o valor planejado ou o valor real.',
    path: ['plannedAmount'],
  })
  .refine((data) => !data.splitEnabled || data.splitMemberIds.length > 0, {
    message: 'Escolha ao menos um participante para dividir.',
    path: ['splitMemberIds'],
  });

export type ExpenseInput = z.infer<typeof expenseSchema>;
