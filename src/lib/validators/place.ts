import { z } from 'zod';
import { optionalText, optionalUrl, requiredText } from './common';

export const PLACE_CATEGORIES = [
  'accommodation', 'restaurant', 'attraction', 'airport', 'parking',
  'car_rental', 'shopping', 'event', 'transport', 'other',
] as const;

export const PLACE_CATEGORY_LABEL: Record<(typeof PLACE_CATEGORIES)[number], string> = {
  accommodation: 'Hospedagem',
  restaurant: 'Restaurante',
  attraction: 'Atração',
  airport: 'Aeroporto',
  parking: 'Estacionamento',
  car_rental: 'Locadora',
  shopping: 'Compras',
  event: 'Evento',
  transport: 'Transporte',
  other: 'Outro',
};

/**
 * Resultado da busca de endereço.
 * Guardamos Place ID e coordenadas mesmo que o usuário nunca os veja —
 * é isso que garante mapa e rota corretos.
 */
export const placeSelectionSchema = z.object({
  name: requiredText('o nome do local'),
  formattedAddress: optionalText(300),
  googlePlaceId: optionalText(200),
  latitude: z.coerce.number().min(-90).max(90).nullable().optional(),
  longitude: z.coerce.number().min(-180).max(180).nullable().optional(),
  city: optionalText(120),
  country: optionalText(120),
  phone: optionalText(60),
  website: optionalUrl(),
  googleMapsUrl: optionalUrl(),
});

export type PlaceSelection = z.infer<typeof placeSelectionSchema>;

export const placeSchema = placeSelectionSchema.extend({
  category: z.enum(PLACE_CATEGORIES).default('other'),
  notes: optionalText(1000),
  isFavorite: z.boolean().default(false),
});

export type PlaceInput = z.infer<typeof placeSchema>;
