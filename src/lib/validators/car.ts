import { z } from 'zod';
import {
  currency, dateOnly, money, optionalText, optionalUrl, paymentStatus,
  requiredText, timeOnly, timezone,
} from './common';

export const carRentalSchema = z
  .object({
    company: requiredText('a locadora', 120),
    category: optionalText(80),
    vehicleModel: optionalText(120),
    bookingReference: optionalText(60),

    pickupLocation: optionalText(160),
    pickupAddress: optionalText(300),
    pickupPlaceId: optionalText(200),
    pickupDate: dateOnly('a data de retirada'),
    pickupTime: timeOnly('o horário de retirada'),
    pickupTimezone: timezone(),

    dropoffLocation: optionalText(160),
    dropoffAddress: optionalText(300),
    dropoffPlaceId: optionalText(200),
    dropoffDate: dateOnly('a data de devolução'),
    dropoffTime: timeOnly('o horário de devolução'),
    dropoffTimezone: timezone(),

    dailyRate: money(),
    daysCount: z.coerce.number().int().min(1).max(365).nullable().optional(),
    totalPrice: money(),
    paidAmount: money(),
    depositAmount: money(),
    currency: currency(),
    paymentStatus: paymentStatus(),

    insurance: optionalText(300),
    fuelPolicy: optionalText(200),
    mileagePolicy: optionalText(200),
    mainDriver: optionalText(160),
    additionalDriver: optionalText(160),
    companyPhone: optionalText(60),
    bookingUrl: optionalUrl(),
    notes: optionalText(2000),
  })
  .refine(
    (data) => `${data.dropoffDate}T${data.dropoffTime}` >= `${data.pickupDate}T${data.pickupTime}`,
    { message: 'A devolução precisa ser depois da retirada.', path: ['dropoffDate'] },
  );

export type CarRentalInput = z.infer<typeof carRentalSchema>;
