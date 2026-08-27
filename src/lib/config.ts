/**
 * Configuração central do produto.
 * O nome fica aqui para poder ser trocado em um único lugar.
 */
export const APP = {
  name: 'Nossa Viagem',
  shortName: 'Viagem',
  tagline: 'A central da sua viagem, do planejamento à volta para casa.',
  description:
    'Organize voos, hospedagens, carro, roteiro, mapas, gastos e documentos de todas as suas viagens em um só lugar.',
  themeColor: '#0b0a0f',
  backgroundColor: '#0b0a0f',
  locale: 'pt-BR',
  defaultCurrency: 'BRL',
  defaultTimezone: 'America/Sao_Paulo',
} as const;

export const CURRENCIES = [
  { code: 'BRL', label: 'Real brasileiro', symbol: 'R$' },
  { code: 'USD', label: 'Dólar americano', symbol: 'US$' },
  { code: 'EUR', label: 'Euro', symbol: '€' },
  { code: 'ARS', label: 'Peso argentino', symbol: 'AR$' },
  { code: 'CLP', label: 'Peso chileno', symbol: 'CL$' },
  { code: 'UYU', label: 'Peso uruguaio', symbol: 'U$' },
  { code: 'GBP', label: 'Libra esterlina', symbol: '£' },
  { code: 'JPY', label: 'Iene', symbol: '¥' },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]['code'];

/** Fusos usados com mais frequência, oferecidos como atalho nos formulários. */
export const COMMON_TIMEZONES = [
  'America/Sao_Paulo',
  'America/Cuiaba',
  'America/Manaus',
  'America/Bahia',
  'America/Fortaleza',
  'America/Rio_Branco',
  'America/Argentina/Buenos_Aires',
  'America/Santiago',
  'America/Montevideo',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Mexico_City',
  'Europe/Lisbon',
  'Europe/Madrid',
  'Europe/Paris',
  'Europe/Rome',
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Dubai',
] as const;

export const MAX_DOCUMENT_SIZE_BYTES = 25 * 1024 * 1024;
export const MAX_COVER_SIZE_BYTES = 8 * 1024 * 1024;

export const DOCUMENT_BUCKET = 'trip-documents';
export const COVER_BUCKET = 'trip-covers';
