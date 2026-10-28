import type { Snapshot } from '../../shared/index';

/** Pure Portuguese copy for table state, kept out of components so agreement and plurals are testable. */
export type ConnectionState = 'connecting' | 'ready' | 'reconnecting' | 'replaced' | 'inactive';

export const countLabel = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function spokenDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60), rest = seconds % 60;
  const secondsLabel = countLabel(rest, 'segundo', 'segundos');
  return minutes === 0 ? secondsLabel : `${countLabel(minutes, 'minuto', 'minutos')} e ${secondsLabel}`;
}

export function handResultTitle(state: Pick<Snapshot, 'phase' | 'format' | 'winners' | 'competitionWinners'>) {
  if (state.phase !== 'matchComplete') return 'Mão concluída';
  if (state.format.mode === 'competitive') return state.competitionWinners.length > 0 ? 'Competição concluída!' : 'Jogo concluído';
  return state.winners.length > 1 ? 'Vitória partilhada!' : 'Temos vencedor!';
}

export function winnersLine(names: string[], mode: Snapshot['format']['mode']) {
  const many = names.length > 1;
  const outcome = mode === 'infinite' ? many ? 'terminaram com a menor pontuação.' : 'terminou com a menor pontuação.' : many ? 'chegaram a zero.' : 'chegou a zero.';
  return `${names.join(' e ')} ${outcome}`;
}

export const competitionLine = (names: string[]) => `${names.join(' e ')} ${names.length > 1 ? 'venceram a competição!' : 'venceu a competição!'}`;

export function connectionMessage(connection: Exclude<ConnectionState, 'ready'>) {
  switch (connection) {
    case 'connecting': return 'A ligar ao servidor…';
    case 'replaced': return 'Sessão aberta noutro separador ou dispositivo';
    case 'inactive': return 'Desligado por inatividade · lugar reservado';
    case 'reconnecting': return 'A restabelecer ligação… O seu lugar está reservado.';
  }
}
