import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../../shared/index';
import { useGame } from './GameContext';
import { MotionEntry } from './motion';
import { colors, s } from './ui';

export function TurnNotice({ state }: { state: Snapshot }) {
  const { clock, connection } = useGame();
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refresh(n => n + 1), 250);
    return () => clearInterval(timer);
  }, []);
  if (state.turnDeadline === null || state.turn === null || (connection === 'inactive' && state.turn === state.you)) return null;
  const elapsed = Math.max(0, performance.now() - clock.receivedAt);
  const remaining = Math.min(300, Math.max(0, Math.ceil((state.turnDeadline - clock.serverTime - elapsed) / 1000)));
  const expired = remaining === 0;
  const grace = Math.max(0, Math.ceil(((state.turnDisconnectAt ?? 0) - clock.serverTime - elapsed) / 1000));
  const mine = state.turn === state.you;
  const player = state.players[state.turn]?.nickname;
  const title = state.phase === 'trumpSelection' ? mine ? 'Escolha o trunfo' : `${player} escolhe o trunfo`
    : state.phase === 'participationExchange' ? mine ? 'É o momento de trocar' : `${player} decide se participa`
      : mine ? 'A mesa espera pela sua carta' : `É a vez de ${player}`;
  const detail = state.phase === 'trumpSelection' ? 'Veja as três cartas e escolha um naipe. Depois recebe mais duas.'
    : state.phase === 'participationExchange' ? 'Pode trocar até cinco cartas ou manter a mão. Paus obriga todos a jogar.'
      : 'As cartas com contorno verde são as que pode jogar.';
  const clockLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <MotionEntry eventKey={`${state.handNumber}-${state.phase}-${state.turn}-${state.turnDeadline}`}>
    <View style={[styles.notice, mine && styles.mine]} testID="turn-notice">
      <View style={[s.row, { justifyContent: 'space-between', alignItems: 'flex-start' }]}>
        <View style={{ flex: 1, minWidth: 180, gap: 6 }}>
          <Text style={s.eyebrow}>{mine ? 'A SUA VEZ' : 'EM JOGO'} · {state.phase === 'trumpSelection' ? '01 / TRUNFO' : state.phase === 'participationExchange' ? '02 / TROCAS' : '03 / VAZAS'}</Text>
          <Text accessibilityLiveRegion="polite" style={[s.heading, { fontSize: 21 }]}>{title}</Text>
          <Text style={s.body}>{mine ? detail : 'Pode acompanhar a mesa enquanto aguarda.'}</Text>
        </View>
        <View style={[styles.clock, remaining <= 60 && styles.urgent]}>
          <Text style={styles.clockDigits} testID="turn-timer" accessibilityLabel={`Tempo restante: ${Math.floor(remaining / 60)} minutos e ${remaining % 60} segundos`}>{clockLabel}</Text>
          <Text style={[s.body, { fontSize: 11 }]}>{expired ? `${grace}s para desligar` : '5 min por decisão'}</Text>
        </View>
      </View>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.track}><View style={[styles.fill, { width: `${remaining / 3}%`, backgroundColor: remaining <= 60 ? colors.red : colors.green }]} /></View>
      {expired && <Text accessibilityLiveRegion="polite" style={[s.label, { color: colors.red }]}>{grace > 0 ? 'Os cinco minutos terminaram. Resta um minuto para decidir antes da desconexão.' : state.players[state.turn]?.inactive ? 'Jogador desligado por inatividade. A mesa aguarda o seu regresso.' : 'Prazo terminado. A aguardar confirmação do servidor.'}</Text>}
      {connection !== 'ready' && <Text style={s.body}>Sem ligação: o tempo apresentado é uma estimativa até voltarmos ao servidor.</Text>}
    </View>
  </MotionEntry>;
}
const styles = StyleSheet.create({
  notice: { padding: 18, gap: 14, borderRadius: 16, borderWidth: 1, borderColor: colors.line, backgroundColor: '#edf0e7' },
  mine: { backgroundColor: '#fff5d9', borderColor: colors.gold },
  clock: { backgroundColor: '#ffffffaa', padding: 10, borderRadius: 10, alignItems: 'center', minWidth: 104 },
  urgent: { backgroundColor: '#ffe5df' },
  clockDigits: { color: colors.ink, fontSize: 28, fontWeight: '800', fontVariant: ['tabular-nums'] },
  track: { height: 4, backgroundColor: '#d4ddcf', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
});
