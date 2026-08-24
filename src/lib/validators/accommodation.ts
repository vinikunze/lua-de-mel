import { z } from 'zod';
import {
  currency, dateOnly, money, optionalBoolean, optionalText, optionalUrl,
  paymentStatus, requiredText, timeOnly, timezone,
} from './common';
import { placeSelectionSchema } from './place';

export const ACCOMMODATION_KINDS = [
  'hotel', 'airbnb', 'guesthouse', 'resort', 'house', 'apartment', 'hostel', 'other',
] as const;

export const ACCOMMODATION_KIND_LABEL: Record<(typeof ACCOMMODATION_KINDS)[number], string> = {
  hotel: 'Hotel',
  airbnb: 'Airbnb',
  guesthouse: 'Pousada',
  resort: 'Resort',
  house: 'Casa',
  apartment: 'Apartamento',
  hostel: 'Hostel',
  other: 'Outro',
};

export const accommodationSchema = z
  .object({
    name: requiredText('o nome da hospedagem', 160),
    kind: z.enum(ACCOMMODATION_KINDS).default('hotel'),
    place: placeSelectionSchema.partial().optional(),
    address: optionalText(300),
    googlePlaceId: optionalText(200),
    latitude: z.coerce.number().nullable().optional(),
    longitude: z.coerce.number().nullable().optional(),
    phone: optionalText(60),
    website: optionalUrl(),
    bookingUrl: optionalUrl(),
    platform: optionalText(80),
    bookingReference: optionalText(60),

    checkInDate: dateOnly('a data de check-in'),
    checkInTime: timeOnly('o horário de check-in'),
    checkOutDate: dateOnly('a data de check-out'),
    checkOutTime: timeOnly('o horário de check-out'),
    timezone: timezone(),
    checkInWindow: optionalText(80),
    checkOutWindow: optionalText(80),

    guests: z.coerce.number().int().min(1).max(50).nullable().optional(),
    roomType: optionalText(120),
    breakfastIncluded: optionalBoolean(),
    parkingIncluded: optionalBoolean(),

    nightlyRate: money(),
    taxes: money(),
    totalPrice: money(),
    paidAmount: money(),
    currency: currency(),
    paymentMethod: optionalText(80),
    paymentStatus: paymentStatus(),
    cancellationPolicy: optionalText(2000),

    // Aluguel por temporada (Airbnb e similares)
    hostName: optionalText(120),
    hostContact: optionalText(120),
    wifiPassword: optionalText(120),
    accessInstructions: optionalText(2000),
    houseRules: optionalText(2000),

    notes: optionalText(2000),
  })
  .refine(
    (data) => `${data.checkOutDate}T${data.checkOutTime}` >= `${data.checkInDate}T${data.checkInTime}`,
    { message: 'O check-out precisa ser depois do check-in.', path: ['checkOutDate'] },
  );

export type AccommodationInput = z.infer<typeof accommodationSchema>;
