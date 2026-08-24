import { describe, expect, it } from 'vitest';
import { convertToBase, formatMoney, formatPercent, round2, splitEvenly, toNumber } from '@/lib/format/money';

describe('leitura de valores digitados', () => {
  it('aceita o formato brasileiro com vírgula decimal', () => {
    expect(toNumber('1.250,00')).toBe(1250);
    expect(toNumber('173,45')).toBe(173.45);
    expect(toNumber('0,99')).toBe(0.99);
  });

  it('aceita o formato com ponto decimal', () => {
    expect(toNumber('1250.00')).toBe(1250);
    expect(toNumber('1,250.50')).toBe(1250.5);
  });

  it('trata vazio e inválido como ausência de valor', () => {
    expect(toNumber('')).toBeNull();
    expect(toNumber(null)).toBeNull();
    expect(toNumber(undefined)).toBeNull();
    expect(toNumber('abc')).toBeNull();
  });

  it('aceita número já tipado', () => {
    expect(toNumber(42.5)).toBe(42.5);
    expect(toNumber(Number.NaN)).toBeNull();
  });
});

describe('arredondamento', () => {
  it('elimina o erro clássico de ponto flutuante', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.675)).toBe(2.68);
  });
});

describe('divisão entre viajantes', () => {
  it('divide igualmente quando não sobra centavo', () => {
    expect(splitEvenly(100, 2)).toEqual([50, 50]);
    expect(splitEvenly(1500, 2)).toEqual([750, 750]);
  });

  it('distribui os centavos que sobram sem perder nada', () => {
    const partes = splitEvenly(100, 3);
    expect(partes).toEqual([33.34, 33.33, 33.33]);
    expect(round2(partes.reduce((a, b) => a + b, 0))).toBe(100);
  });

  it('mantém a soma exata em casos difíceis', () => {
    for (const total of [0.01, 0.05, 10.01, 173.45, 999.99]) {
      for (const pessoas of [2, 3, 4, 5, 7]) {
        const partes = splitEvenly(total, pessoas);
        expect(partes).toHaveLength(pessoas);
        expect(round2(partes.reduce((a, b) => a + b, 0))).toBe(round2(total));
      }
    }
  });

  it('devolve lista vazia para zero pessoas', () => {
    expect(splitEvenly(100, 0)).toEqual([]);
  });
});

describe('conversão de moeda', () => {
  it('aplica o câmbio informado', () => {
    expect(convertToBase(100, 5.4)).toBe(540);
    expect(convertToBase('250,50', '5,40')).toBe(1352.7);
  });

  it('usa 1 quando o câmbio não faz sentido', () => {
    expect(convertToBase(100, null)).toBe(100);
    expect(convertToBase(100, 0)).toBe(100);
  });
});

describe('formatação', () => {
  it('usa o padrão brasileiro de moeda', () => {
    // O separador do Intl é um espaço não separável.
    expect(formatMoney(1250, 'BRL').replace(/ /g, ' ')).toBe('R$ 1.250,00');
    expect(formatMoney(0, 'BRL').replace(/ /g, ' ')).toBe('R$ 0,00');
  });

  it('mostra travessão quando não há valor', () => {
    expect(formatMoney(null)).toBe('—');
  });

  it('formata percentuais', () => {
    expect(formatPercent(0.32)).toBe('32%');
    expect(formatPercent(null)).toBe('—');
  });
});
