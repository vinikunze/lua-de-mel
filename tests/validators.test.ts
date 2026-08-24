import { describe, expect, it } from 'vitest';
import { tripSchema } from '@/lib/validators/trip';
import { flightSchema } from '@/lib/validators/flight';
import { accommodationSchema } from '@/lib/validators/accommodation';
import { expenseSchema } from '@/lib/validators/expense';
import { itineraryItemSchema } from '@/lib/validators/itinerary';
import { inviteSchema, quickLinkSchema, signUpSchema } from '@/lib/validators/misc';

const viagemValida = {
  name: 'Gramado 2027',
  startDate: '2027-08-04',
  endDate: '2027-08-14',
  travelersCount: 2,
  baseCurrency: 'BRL',
  timezone: 'America/Sao_Paulo',
  status: 'planning',
};

describe('viagem', () => {
  it('aceita os dados mínimos', () => {
    const result = tripSchema.safeParse(viagemValida);
    expect(result.success).toBe(true);
  });

  it('recusa volta anterior à ida', () => {
    const result = tripSchema.safeParse({ ...viagemValida, endDate: '2027-08-01' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['endDate']);
    }
  });

  it('recusa nome vazio', () => {
    expect(tripSchema.safeParse({ ...viagemValida, name: '   ' }).success).toBe(false);
  });

  it('recusa fuso horário inexistente', () => {
    expect(tripSchema.safeParse({ ...viagemValida, timezone: 'Marte/Olympus' }).success).toBe(false);
  });

  it('converte orçamento no formato brasileiro para número', () => {
    const result = tripSchema.safeParse({ ...viagemValida, estimatedBudget: '10.000,00' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.estimatedBudget).toBe(10000);
  });

  it('recusa orçamento negativo', () => {
    expect(tripSchema.safeParse({ ...viagemValida, estimatedBudget: '-500' }).success).toBe(false);
  });

  it('trata campos opcionais vazios como nulos', () => {
    const result = tripSchema.safeParse({ ...viagemValida, description: '', destinationLabel: '' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.description).toBeNull();
      expect(result.data.destinationLabel).toBeNull();
    }
  });
});

describe('voo', () => {
  const vooValido = {
    originAirport: 'Cuiabá',
    destinationAirport: 'Porto Alegre',
    originTimezone: 'America/Cuiaba',
    destinationTimezone: 'America/Sao_Paulo',
    departureDate: '2027-08-04',
    departureTime: '06:40',
    arrivalDate: '2027-08-04',
    arrivalTime: '09:20',
    currency: 'BRL',
    paymentStatus: 'unpaid',
    passengers: [],
  };

  it('aceita um trecho válido', () => {
    expect(flightSchema.safeParse(vooValido).success).toBe(true);
  });

  it('recusa chegada antes da partida', () => {
    const result = flightSchema.safeParse({ ...vooValido, arrivalTime: '05:00' });
    expect(result.success).toBe(false);
  });

  it('aceita voo que chega no dia seguinte', () => {
    const result = flightSchema.safeParse({
      ...vooValido,
      arrivalDate: '2027-08-05',
      arrivalTime: '05:00',
    });
    expect(result.success).toBe(true);
  });

  it('normaliza o código IATA para maiúsculas', () => {
    const result = flightSchema.safeParse({ ...vooValido, originIata: 'cgb' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.originIata).toBe('CGB');
  });

  it('recusa código IATA com tamanho errado', () => {
    expect(flightSchema.safeParse({ ...vooValido, originIata: 'CGBX' }).success).toBe(false);
  });
});

describe('hospedagem', () => {
  const base = {
    name: 'Hotel Casa da Montanha',
    kind: 'hotel',
    checkInDate: '2027-08-04',
    checkInTime: '14:00',
    checkOutDate: '2027-08-14',
    checkOutTime: '11:00',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    paymentStatus: 'unpaid',
  };

  it('aceita uma reserva válida', () => {
    expect(accommodationSchema.safeParse(base).success).toBe(true);
  });

  it('recusa check-out antes do check-in', () => {
    const result = accommodationSchema.safeParse({ ...base, checkOutDate: '2027-08-03' });
    expect(result.success).toBe(false);
  });

  it('interpreta o campo de café da manhã marcado', () => {
    const result = accommodationSchema.safeParse({ ...base, breakfastIncluded: 'on' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.breakfastIncluded).toBe(true);
  });
});

describe('despesa', () => {
  it('exige ao menos um dos valores', () => {
    const result = expenseSchema.safeParse({
      description: 'Jantar',
      category: 'restaurants',
      currency: 'BRL',
      exchangeRate: 1,
      paymentStatus: 'unpaid',
      installments: 1,
      splitEnabled: false,
      splitMemberIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('aceita apenas o valor planejado', () => {
    const result = expenseSchema.safeParse({
      description: 'Jantar',
      category: 'restaurants',
      plannedAmount: '200,00',
      currency: 'BRL',
      exchangeRate: 1,
      paymentStatus: 'unpaid',
      installments: 1,
      splitEnabled: false,
      splitMemberIds: [],
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.plannedAmount).toBe(200);
  });

  it('exige participantes quando a divisão está ligada', () => {
    const result = expenseSchema.safeParse({
      description: 'Hotel',
      category: 'accommodation',
      actualAmount: '1500',
      currency: 'BRL',
      exchangeRate: 1,
      paymentStatus: 'paid',
      installments: 1,
      splitEnabled: true,
      splitMemberIds: [],
    });
    expect(result.success).toBe(false);
  });

  it('recusa câmbio zero ou negativo', () => {
    const result = expenseSchema.safeParse({
      description: 'Compra',
      category: 'shopping',
      actualAmount: '100',
      currency: 'USD',
      exchangeRate: 0,
      paymentStatus: 'unpaid',
      installments: 1,
      splitEnabled: false,
      splitMemberIds: [],
    });
    expect(result.success).toBe(false);
  });
});

describe('evento do roteiro', () => {
  const base = {
    title: 'Lago Negro',
    category: 'attraction',
    timezone: 'America/Sao_Paulo',
    currency: 'BRL',
    status: 'planned',
  };

  it('aceita evento sem dia nem horário', () => {
    expect(itineraryItemSchema.safeParse(base).success).toBe(true);
  });

  it('recusa horário sem dia definido', () => {
    const result = itineraryItemSchema.safeParse({ ...base, startTime: '09:00' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['dayDate']);
  });

  it('recusa término antes do início', () => {
    const result = itineraryItemSchema.safeParse({
      ...base,
      dayDate: '2027-08-07',
      startTime: '14:00',
      endTime: '13:00',
    });
    expect(result.success).toBe(false);
  });
});

describe('outros formulários', () => {
  it('valida o e-mail do convite e normaliza para minúsculas', () => {
    const result = inviteSchema.safeParse({ email: '  Pessoa@Email.COM ', role: 'editor' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe('pessoa@email.com');
  });

  it('recusa e-mail inválido', () => {
    expect(inviteSchema.safeParse({ email: 'nao-e-email', role: 'viewer' }).success).toBe(false);
  });

  it('completa o protocolo do link rápido', () => {
    const result = quickLinkSchema.safeParse({
      label: 'Check-in',
      url: 'latam.com/check-in',
      category: 'airline',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.url).toBe('https://latam.com/check-in');
  });

  it('exige senhas iguais no cadastro', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Fulano',
      email: 'fulano@email.com',
      password: 'senha12345',
      confirmPassword: 'outra-senha',
    });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['confirmPassword']);
  });

  it('exige senha com pelo menos 8 caracteres', () => {
    const result = signUpSchema.safeParse({
      fullName: 'Fulano',
      email: 'fulano@email.com',
      password: 'curta',
      confirmPassword: 'curta',
    });
    expect(result.success).toBe(false);
  });
});
