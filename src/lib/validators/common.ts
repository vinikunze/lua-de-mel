import { z } from 'zod';
import { CURRENCIES } from '@/lib/config';

/** Campo de texto opcional: string vazia vira null. */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null);

export const requiredText = (label: string, max = 200) =>
  z
    .string({ message: `Informe ${label}.` })
    .trim()
    .min(1, `Informe ${label}.`)
    .max(max, `Máximo de ${max} caracteres.`);

/** Valor monetário vindo de um input de texto ("1.250,00" ou "1250.00"). */
export const money = () =>
  z
    .union([z.string(), z.number()])
    .optional()
    .nullable()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === '') return null;
      const raw = String(value).trim().replace(/\s/g, '');
      const normalized =
        raw.includes(',') && raw.lastIndexOf(',') > raw.lastIndexOf('.')
          ? raw.replace(/\./g, '').replace(',', '.')
          : raw.replace(/,/g, '');
      const parsed = Number(normalized);
      if (!Number.isFinite(parsed)) {
        ctx.addIssue({ code: 'custom', message: 'Valor inválido.' });
        return null;
      }
      if (parsed < 0) {
        ctx.addIssue({ code: 'custom', message: 'O valor não pode ser negativo.' });
        return null;
      }
      return Math.round(parsed * 100) / 100;
    });

export const requiredMoney = () =>
  money().refine((v) => v !== null, { message: 'Informe um valor.' }) as unknown as z.ZodType<number>;

export const dateOnly = (label = 'a data') =>
  z
    .string({ message: `Informe ${label}.` })
    .regex(/^\d{4}-\d{2}-\d{2}$/, `Informe ${label} no formato correto.`);

export const optionalDateOnly = () =>
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Data inválida.')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const timeOnly = (label = 'o horário') =>
  z.string({ message: `Informe ${label}.` }).regex(/^\d{2}:\d{2}$/, `Informe ${label} no formato HH:mm.`);

export const optionalTime = () =>
  z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Horário inválido.')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const currency = () =>
  z
    .enum(CURRENCIES.map((c) => c.code) as [string, ...string[]])
    .default('BRL');

export const timezone = () =>
  z
    .string()
    .trim()
    .min(1)
    .refine(
      (tz) => {
        try {
          new Intl.DateTimeFormat('pt-BR', { timeZone: tz });
          return true;
        } catch {
          return false;
        }
      },
      { message: 'Fuso horário inválido.' },
    )
    .default('America/Sao_Paulo');

export const optionalUrl = () =>
  z
    .string()
    .trim()
    .transform((v) => (v === '' ? null : v))
    .nullable()
    .optional()
    .transform((v) => v ?? null)
    .refine(
      (value) => {
        if (!value) return true;
        try {
          const url = new URL(value.startsWith('http') ? value : `https://${value}`);
          return url.protocol === 'http:' || url.protocol === 'https:';
        } catch {
          return false;
        }
      },
      { message: 'Endereço da web inválido.' },
    )
    .transform((value) => {
      if (!value) return null;
      return value.startsWith('http') ? value : `https://${value}`;
    });

export const uuid = (label = 'identificador') =>
  z.string().uuid({ message: `${label} inválido.` });

export const optionalUuid = () =>
  z
    .string()
    .uuid()
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const iata = () =>
  z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{3}$/, 'O código IATA tem 3 letras (ex.: GRU).')
    .or(z.literal(''))
    .optional()
    .nullable()
    .transform((v) => (v === '' || v === undefined ? null : v));

export const optionalBoolean = () =>
  z
    .union([z.boolean(), z.literal('on'), z.literal('true'), z.literal('false'), z.literal('')])
    .optional()
    .transform((v) => v === true || v === 'on' || v === 'true');

export const paymentStatus = () =>
  z.enum(['unpaid', 'partial', 'paid', 'refunded', 'cancelled']).default('unpaid');

export type Money = z.infer<ReturnType<typeof money>>;
