import { describe, expect, it } from 'vitest';
import { competitionLine, connectionMessage, countLabel, handResultTitle, spokenDuration, winnersLine } from './gameText';

describe('countLabel', () => {
  it('uses singular only for exactly one', () => {
    expect(countLabel(1, 'vaza', 'vazas')).toBe('1 vaza');
    expect(countLabel(0, 'vaza', 'vazas')).toBe('0 vazas');
    expect(countLabel(3, 'vaza', 'vazas')).toBe('3 vazas');
  });
});

describe('spokenDuration', () => {
  it('pluralises minutes and seconds and drops empty minutes', () => {
    expect(spokenDuration(305)).toBe('5 minutos e 5 segundos');
    expect(spokenDuration(61)).toBe('1 minuto e 1 segundo');
    expect(spokenDuration(5)).toBe('5 segundos');
    expect(spokenDuration(60)).toBe('1 minuto e 0 segundos');
    expect(spokenDuration(0)).toBe('0 segundos');
  });
});

describe('handResultTitle', () => {
  type Input = Parameters<typeof handResultTitle>[0];
  const base: Input = { phase: 'matchComplete', format: { mode: 'base', linesToWin: 1 }, winners: [0], competitionWinners: [] };
  it('names an unfinished hand', () => {
    expect(handResultTitle({ ...base, phase: 'handComplete' })).toBe('Mão concluída');
  });
  it('distinguishes sole and shared wins in the base mode', () => {
    expect(handResultTitle(base)).toBe('Temos vencedor!');
    expect(handResultTitle({ ...base, winners: [0, 2] })).toBe('Vitória partilhada!');
  });
  it('distinguishes a finished game from a finished competition', () => {
    const competitive: Input = { ...base, format: { mode: 'competitive', linesToWin: 1 } };
    expect(handResultTitle(competitive)).toBe('Jogo concluído');
    expect(handResultTitle({ ...competitive, competitionWinners: [1] })).toBe('Competição concluída!');
  });
});

describe('winnersLine', () => {
  it('agrees the verb with the number of winners', () => {
    expect(winnersLine(['Ana'], 'base')).toBe('Ana chegou a zero.');
    expect(winnersLine(['Ana', 'Bruno'], 'base')).toBe('Ana e Bruno chegaram a zero.');
    expect(winnersLine(['Ana'], 'infinite')).toBe('Ana terminou com a menor pontuação.');
    expect(winnersLine(['Ana', 'Bruno'], 'infinite')).toBe('Ana e Bruno terminaram com a menor pontuação.');
  });
});

describe('competitionLine', () => {
  it('agrees the verb with the number of winners', () => {
    expect(competitionLine(['Ana'])).toBe('Ana venceu a competição!');
    expect(competitionLine(['Ana', 'Bruno'])).toBe('Ana e Bruno venceram a competição!');
  });
});

describe('connectionMessage', () => {
  it('explains every non-ready connection state', () => {
    expect(connectionMessage('connecting')).toBe('A ligar ao servidor…');
    expect(connectionMessage('replaced')).toBe('Sessão aberta noutro separador ou dispositivo');
    expect(connectionMessage('inactive')).toBe('Desligado por inatividade · lugar reservado');
    expect(connectionMessage('reconnecting')).toBe('A restabelecer ligação… O seu lugar está reservado.');
  });
});
