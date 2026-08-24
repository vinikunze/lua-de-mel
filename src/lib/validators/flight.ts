import { z } from 'zod';
import {
  currency, dateOnly, iata, money, optionalText, optionalTime, optionalUrl,
  paymentStatus, requiredText, timeOnly, timezone,
} from './common';

/**
 * O formulário trabalha com data + hora + fuso separados; a ação de servidor
 * combina os três no `timestamptz` correto. Assim um voo que sai às 06:40 em
 * Cuiabá e chega às 09:20 em São Paulo fica com a duração real.
 */
export const flightSchema = z
  .object({
    groupLabel: optionalText(60),
    airline: optionalText(120),
    airlineIata: optionalText(10),
    flightNumber: optionalText(20),
    bookingReference: optionalText(40),

    originAirport: requiredText('o aeroporto de origem', 160),
    originIata: iata(),
    originTerminal: optionalText(30),
    originTimezone: timezone(),

    destinationAirport: requiredText('o aeroporto de destino', 160),
    destinationIata: iata(),
    destinationTerminal: optionalText(30),
    destinationTimezone: timezone(),

    gate: optionalText(20),

    departureDate: dateOnly('a data de partida'),
    departureTime: timeOnly('o horário de partida'),
    boardingTime: optionalTime(),
    arrivalDate: dateOnly('a data de chegada'),
    arrivalTime: timeOnly('o horário de chegada'),

    cabinClass: optionalText(60),
    seats: optionalText(120),
    carryOnBaggage: optionalText(120),
    checkedBaggage: optionalText(120),

    pricePerPassenger: money(),
    taxes: money(),
    totalPrice: money(),
    currency: currency(),
    paymentMethod: optionalText(80),
    paymentStatus: paymentStatus(),

    airlineUrl: optionalUrl(),
    bookingUrl: optionalUrl(),
    notes: optionalText(2000),

    passengers: z
      .array(
        z.object({
          fullName: requiredText('o nome do passageiro', 160),
          seat: optionalText(20),
          ticketNumber: optionalText(60),
        }),
      )
      .max(20)
      .default([]),
  })
  .refine(
    (data) => `${data.arrivalDate}T${data.arrivalTime}` >= `${data.departureDate}T${data.departureTime}`,
    { message: 'A chegada não pode ser anterior à partida.', path: ['arrivalDate'] },
  );

export type FlightInput = z.infer<typeof flightSchema>;
