import { describe, expect, it } from 'vitest';
import {
  addDaysToDateOnly, dateInZone, daysBetween, eachDayInRange, formatCountdown, formatDate,
  formatDateRange, formatDuration, formatSpan, dayShift, isWithinRange, nightsBetween,
  parseDateOnly, timeInZone, toDateOnly, tripDayCount, tripPhase, zonedToUtc,
} from '@/lib/format/date';

describe('conversão entre fuso local e instante absoluto', () => {
  it('converte um horário de Cuiabá (UTC-4) para UTC', () => {
    const instant = zonedToUtc('2027-08-04', '06:40', 'America/Cuiaba');
    expect(instant.toISOString()).toBe('2027-08-04T10:40:00.000Z');
  });

  it('converte um horário de São Paulo (UTC-3) para UTC', () => {
    const instant = zonedToUtc('2027-08-04', '09:20', 'America/Sao_Paulo');
    expect(instant.toISOString()).toBe('2027-08-04T12:20:00.000Z');
  });

  it('trata Nova York e São Paulo como fusos distintos', () => {
    const ny = zonedToUtc('2027-08-04', '12:00', 'America/New_York');
    const sp = zonedToUtc('2027-08-04', '12:00', 'America/Sao_Paulo');
    expect(ny.getTime()).not.toBe(sp.getTime());
    // Em agosto, Nova York está 1 h atrás de São Paulo.
    expect((ny.getTime() - sp.getTime()) / 3_600_000).toBe(1);
  });

  it('faz a volta completa: local -> UTC -> local', () => {
    const instant = zonedToUtc('2027-01-15', '23:45', 'America/Sao_Paulo');
    expect(dateInZone(instant, 'America/Sao_Paulo')).toBe('2027-01-15');
    expect(timeInZone(instant, 'America/Sao_Paulo')).toBe('23:45');
  });

  it('mostra o mesmo instante em horários diferentes conforme o fuso', () => {
    const instant = zonedToUtc('2027-08-04', '22:00', 'America/Sao_Paulo');
    expect(timeInZone(instant, 'America/Sao_Paulo')).toBe('22:00');
    expect(timeInZone(instant, 'America/Cuiaba')).toBe('21:00');
    expect(timeInZone(instant, 'Europe/Lisbon')).toBe('02:00');
  });

  it('lida com a virada de meia-noite', () => {
    const instant = zonedToUtc('2027-03-10', '00:00', 'America/Sao_Paulo');
    expect(timeInZone(instant, 'America/Sao_Paulo')).toBe('00:00');
    expect(dateInZone(instant, 'America/Sao_Paulo')).toBe('2027-03-10');
  });

  it('atravessa o horário de verão do hemisfério norte sem deslocar o relógio', () => {
    const antes = zonedToUtc('2027-03-13', '12:00', 'America/New_York');
    const depois = zonedToUtc('2027-03-15', '12:00', 'America/New_York');
    expect(timeInZone(antes, 'America/New_York')).toBe('12:00');
    expect(timeInZone(depois, 'America/New_York')).toBe('12:00');
  });
});

describe('datas sem hora', () => {
  it('não desloca o dia ao interpretar YYYY-MM-DD', () => {
    expect(toDateOnly(parseDateOnly('2027-08-04'))).toBe('2027-08-04');
    expect(formatDate('2027-08-04')).toBe('04/08/2027');
  });

  it('conta dias e noites da viagem', () => {
    expect(daysBetween('2027-08-04', '2027-08-14')).toBe(10);
    expect(tripDayCount('2027-08-04', '2027-08-14')).toBe(11);
    expect(nightsBetween('2027-08-04', '2027-08-14')).toBe(10);
    expect(tripDayCount('2027-08-04', '2027-08-04')).toBe(1);
  });

  it('gera todos os dias do intervalo, inclusive as pontas', () => {
    const dias = eachDayInRange('2027-08-04', '2027-08-07');
    expect(dias).toEqual(['2027-08-04', '2027-08-05', '2027-08-06', '2027-08-07']);
  });

  it('soma dias atravessando a virada de mês e de ano', () => {
    expect(addDaysToDateOnly('2027-01-31', 1)).toBe('2027-02-01');
    expect(addDaysToDateOnly('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDaysToDateOnly('2028-02-28', 1)).toBe('2028-02-29'); // ano bissexto
  });

  it('devolve intervalo vazio quando o fim é antes do início', () => {
    expect(eachDayInRange('2027-08-10', '2027-08-04')).toEqual([]);
  });
});

describe('contagem regressiva e fase da viagem', () => {
  it('descreve a distância até a data em português', () => {
    expect(formatCountdown('2027-08-04', '2027-05-23')).toBe('Faltam 73 dias');
    expect(formatCountdown('2027-08-04', '2027-08-04')).toBe('Hoje');
    expect(formatCountdown('2027-08-04', '2027-08-03')).toBe('Amanhã');
    expect(formatCountdown('2027-08-04', '2027-08-05')).toBe('Ontem');
    expect(formatCountdown('2027-08-04', '2027-08-08')).toBe('Há 4 dias');
  });

  it('classifica a viagem como futura, em andamento ou passada', () => {
    expect(tripPhase('2027-08-04', '2027-08-14', '2027-07-01')).toBe('upcoming');
    expect(tripPhase('2027-08-04', '2027-08-14', '2027-08-04')).toBe('ongoing');
    expect(tripPhase('2027-08-04', '2027-08-14', '2027-08-14')).toBe('ongoing');
    expect(tripPhase('2027-08-04', '2027-08-14', '2027-08-15')).toBe('past');
  });

  it('reconhece datas dentro do período', () => {
    expect(isWithinRange('2027-08-07', '2027-08-04', '2027-08-14')).toBe(true);
    expect(isWithinRange('2027-08-03', '2027-08-04', '2027-08-14')).toBe(false);
  });
});

describe('formatação de intervalos e durações', () => {
  it('encurta o intervalo quando o mês é o mesmo', () => {
    expect(formatDateRange('2027-08-04', '2027-08-14')).toBe('04 a 14 de agosto');
  });

  it('mostra os dois meses quando o período atravessa a virada', () => {
    expect(formatDateRange('2027-07-28', '2027-08-03')).toBe('28 de julho a 03 de agosto');
  });

  it('inclui o ano quando o período atravessa o réveillon', () => {
    expect(formatDateRange('2027-12-28', '2028-01-05')).toContain('2027');
  });

  it('formata durações em horas e minutos', () => {
    expect(formatDuration(0)).toBe('0 min');
    expect(formatDuration(600)).toBe('10 min');
    expect(formatDuration(3600)).toBe('1 h');
    expect(formatDuration(5100)).toBe('1 h 25 min');
  });

  it('calcula a duração de um voo entre fusos diferentes', () => {
    const partida = zonedToUtc('2027-08-04', '06:40', 'America/Cuiaba').toISOString();
    const chegada = zonedToUtc('2027-08-04', '09:20', 'America/Sao_Paulo').toISOString();
    // 06:40 em Cuiabá = 07:40 em São Paulo; até 09:20 são 1 h 40 min.
    expect(formatSpan(partida, chegada)).toBe('1 h 40 min');
  });

  it('detecta voos que chegam no dia seguinte', () => {
    const partida = zonedToUtc('2027-08-04', '23:30', 'America/Sao_Paulo').toISOString();
    const chegada = zonedToUtc('2027-08-05', '13:00', 'Europe/Lisbon').toISOString();
    expect(dayShift(partida, 'America/Sao_Paulo', chegada, 'Europe/Lisbon')).toBe(1);
  });
});
