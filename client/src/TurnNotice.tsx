import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../../shared/index';
import { useGame } from './GameContext';
import { spokenDuration } from './gameText';
import { color, fontSize } from './tokens';

const TURN_SECONDS = 300, WARNING_SECONDS = 60;

export function TurnNotice({ state }: { state: Snapshot }) {
  const { clock, connection } = useGame();
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refresh(n => n + 1), 250);
    return () => clearInterval(timer);
  }, []);
  if (state.turnDeadline === null || state.turn === null || (connection === 'inactive' && state.turn === state.you)) return <View style={styles.compact}><Text style={styles.light}>{connection === 'inactive' ? 'Lugar reservado · volte à partida' : state.turn !== null ? `${state.players[state.turn]?.nickname} está a decidir…` : 'Mão terminada · consulte as pontuações'}</Text></View>;
  const elapsed = Math.max(0, performance.now() - clock.receivedAt);
  const remaining = Math.min(TURN_SECONDS, Math.max(0, Math.ceil((state.turnDeadline - clock.serverTime - elapsed) / 1000)));
  const expired = remaining === 0;
  const urgent = remaining <= WARNING_SECONDS;
  const grace = Math.max(0, Math.ceil(((state.turnDisconnectAt ?? 0) - clock.serverTime - elapsed) / 1000));
  const mine = state.turn === state.you;
  const player = state.players[state.turn]?.nickname;
  const title = state.phase === 'trumpSelection' ? mine ? 'Escolha o trunfo' : `${player} escolhe o trunfo`
    : state.phase === 'participationExchange' ? mine ? 'É o momento de trocar' : `${player} decide se participa`
      : mine ? 'A mesa espera pela sua carta' : `É a vez de ${player}`;
  const clockLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <View style={styles.compact} testID="turn-notice">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 3 }}><Text style={[styles.compactEyebrow, mine && { color: color.gold }]}>{mine ? 'A SUA VEZ' : 'A AGUARDAR'} · {state.phase === 'trumpSelection' ? 'TRUNFO' : state.phase === 'participationExchange' ? 'TROCAS' : 'VAZAS'}</Text><Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.light}>{title}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text testID="turn-timer" accessibilityLabel={`Tempo restante: ${spokenDuration(remaining)}`} style={[styles.compactDigits, urgent && { color: color.warn }]}>{clockLabel}</Text><Text style={styles.compactEyebrow}>{expired ? `Desliga em ${grace}s` : 'TEMPO RESTANTE'}</Text></View>
    </View>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.track, { backgroundColor: color.timerTrack }]}><View style={[styles.fill, { width: `${remaining / TURN_SECONDS * 100}%`, backgroundColor: urgent ? color.warnFill : color.gold }]} /></View>
    {expired && <Text accessibilityLiveRegion="polite" style={styles.light}>{grace > 0 ? 'Prazo extra: jogue antes de ser desligado.' : `A mesa aguarda o regresso de ${player}.`}</Text>}
    {connection !== 'ready' && <Text style={styles.compactEyebrow}>Sem ligação · tempo aproximado</Text>}
  </View>;
}

const styles = StyleSheet.create({
  compact: { gap: 8, paddingTop: 10 },
  compactEyebrow: { color: color.onFeltMuted, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 0.8 },
  compactDigits: { color: color.onFelt, fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  light: { color: color.onFelt, fontSize: 14, fontWeight: '700' },
  track: { height: 4, borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
});
