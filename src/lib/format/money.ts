/**
 * Valores monetários.
 * Nunca guardamos texto formatado: no banco tudo é numeric(14,2) e aqui vira string.
 */
import { APP, CURRENCIES } from '@/lib/config';

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c.code === code)?.symbol ?? code;
}

export function formatMoney(
  value: number | string | null | undefined,
  currency: string = APP.defaultCurrency,
  options: { hideSymbol?: boolean; decimals?: number } = {},
): string {
  const amount = toNumber(value);
  if (amount === null) return '—';
  const decimals = options.decimals ?? 2;
  return new Intl.NumberFormat(APP.locale, {
    style: options.hideSymbol ? 'decimal' : 'currency',
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(amount);
}

/** Versão compacta para cards: R$ 8,7 mil. */
export function formatMoneyCompact(
  value: number | string | null | undefined,
  currency: string = APP.defaultCurrency,
): string {
  const amount = toNumber(value);
  if (amount === null) return '—';
  if (Math.abs(amount) < 10_000) return formatMoney(amount, currency);
  return new Intl.NumberFormat(APP.locale, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatPercent(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat(APP.locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/** Converte o que vem do Postgres (string) ou de um input em número. */
export function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const normalized = value.trim().replace(/\s/g, '');
  // Aceita tanto "1234.56" quanto "1.234,56"
  const parsed =
    normalized.includes(',') && normalized.lastIndexOf(',') > normalized.lastIndexOf('.')
      ? Number(normalized.replace(/\./g, '').replace(',', '.'))
      : Number(normalized.replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

/** Arredonda para 2 casas evitando erro de ponto flutuante (0.1 + 0.2). */
export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Converte um valor em moeda estrangeira para a moeda base da viagem. */
export function convertToBase(
  amount: number | string | null | undefined,
  exchangeRate: number | string | null | undefined,
): number {
  const value = toNumber(amount) ?? 0;
  const rate = toNumber(exchangeRate) ?? 1;
  return round2(value * (rate > 0 ? rate : 1));
}

/**
 * Divide um valor entre N pessoas sem perder centavos.
 * A sobra é distribuída um centavo por vez, do primeiro para o último.
 */
export function splitEvenly(total: number, parts: number): number[] {
  if (parts <= 0) return [];
  const cents = Math.round(round2(total) * 100);
  const base = Math.trunc(cents / parts);
  const remainder = cents - base * parts;
  return Array.from({ length: parts }, (_, i) => round2((base + (i < remainder ? 1 : 0)) / 100));
}
