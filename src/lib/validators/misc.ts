import { z } from 'zod';
import { optionalText, optionalUuid, requiredText } from './common';

// --- Documentos --------------------------------------------------------------
export const DOCUMENT_CATEGORIES = [
  'ticket', 'boarding_pass', 'accommodation', 'airbnb', 'car_rental',
  'attraction_ticket', 'insurance', 'receipt', 'personal_document', 'other',
] as const;

export const DOCUMENT_CATEGORY_LABEL: Record<(typeof DOCUMENT_CATEGORIES)[number], string> = {
  ticket: 'Passagem',
  boarding_pass: 'Cartão de embarque',
  accommodation: 'Hotel',
  airbnb: 'Airbnb',
  car_rental: 'Aluguel de carro',
  attraction_ticket: 'Ingresso',
  insurance: 'Seguro',
  receipt: 'Comprovante',
  personal_document: 'Documento pessoal',
  other: 'Outro',
};

export const ALLOWED_DOCUMENT_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
] as const;

export const documentMetaSchema = z.object({
  name: requiredText('o nome do documento', 160),
  category: z.enum(DOCUMENT_CATEGORIES).default('other'),
  flightId: optionalUuid(),
  accommodationId: optionalUuid(),
  carRentalId: optionalUuid(),
  itineraryItemId: optionalUuid(),
});

// --- Checklists --------------------------------------------------------------
export const checklistSchema = z.object({
  title: requiredText('o nome da lista', 120),
  kind: z.enum(['before_trip', 'packing', 'custom']).default('custom'),
});

export const checklistItemSchema = z.object({
  title: requiredText('o item', 200),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .or(z.literal(''))
    .optional()
    .transform((v) => (v ? v : null)),
  assignedTo: optionalUuid(),
  notes: optionalText(500),
});

// --- Contatos e links --------------------------------------------------------
export const CONTACT_KINDS = [
  'accommodation', 'airline', 'car_rental', 'insurance', 'emergency', 'hospital', 'embassy', 'other',
] as const;

export const CONTACT_KIND_LABEL: Record<(typeof CONTACT_KINDS)[number], string> = {
  accommodation: 'Hospedagem',
  airline: 'Companhia aérea',
  car_rental: 'Locadora',
  insurance: 'Seguro viagem',
  emergency: 'Emergência',
  hospital: 'Hospital',
  embassy: 'Consulado / Embaixada',
  other: 'Outro',
};

export const contactSchema = z.object({
  label: requiredText('o nome do contato', 120),
  kind: z.enum(CONTACT_KINDS).default('other'),
  phone: optionalText(60),
  email: optionalText(160),
  address: optionalText(300),
  referenceCode: optionalText(80),
  notes: optionalText(1000),
});

export const QUICK_LINK_CATEGORIES = [
  'airline', 'accommodation', 'car_rental', 'maps', 'attraction', 'tickets', 'restaurant', 'other',
] as const;

export const QUICK_LINK_CATEGORY_LABEL: Record<(typeof QUICK_LINK_CATEGORIES)[number], string> = {
  airline: 'Companhia aérea',
  accommodation: 'Hospedagem',
  car_rental: 'Locadora',
  maps: 'Mapas',
  attraction: 'Atração',
  tickets: 'Ingressos',
  restaurant: 'Restaurante',
  other: 'Outro',
};

export const quickLinkSchema = z.object({
  label: requiredText('o nome do link', 120),
  url: z
    .string()
    .trim()
    .min(1, 'Informe o endereço.')
    .transform((v) => (v.startsWith('http') ? v : `https://${v}`))
    .refine((v) => {
      try {
        const url = new URL(v);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    }, 'Endereço inválido.'),
  category: z.enum(QUICK_LINK_CATEGORIES).default('other'),
});

// --- Participantes -----------------------------------------------------------
export const inviteSchema = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }).trim().toLowerCase(),
  role: z.enum(['editor', 'viewer']).default('viewer'),
  displayName: optionalText(120),
});

export const memberRoleSchema = z.object({
  memberId: z.string().uuid(),
  role: z.enum(['editor', 'viewer']),
});

// --- Autenticação ------------------------------------------------------------
export const signUpSchema = z
  .object({
    fullName: requiredText('seu nome', 120),
    email: z.email({ message: 'Informe um e-mail válido.' }).trim().toLowerCase(),
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export const signInSchema = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }).trim().toLowerCase(),
  password: z.string().min(1, 'Informe sua senha.'),
});

export const forgotPasswordSchema = z.object({
  email: z.email({ message: 'Informe um e-mail válido.' }).trim().toLowerCase(),
});

export const resetPasswordSchema = z
  .object({
    password: z.string().min(8, 'A senha precisa ter ao menos 8 caracteres.').max(72),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'As senhas não conferem.',
    path: ['confirmPassword'],
  });

export const profileSchema = z.object({
  fullName: requiredText('seu nome', 120),
});
