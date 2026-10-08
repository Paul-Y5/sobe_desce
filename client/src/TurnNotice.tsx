import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../../shared/index';
import { useGame } from './GameContext';
import { colors } from './ui';

export function TurnNotice({ state }: { state: Snapshot }) {
  const { clock, connection } = useGame();
  const [, refresh] = useState(0);
  useEffect(() => {
    const timer = setInterval(() => refresh(n => n + 1), 250);
    return () => clearInterval(timer);
  }, []);
  if (state.turnDeadline === null || state.turn === null || (connection === 'inactive' && state.turn === state.you)) return <View style={styles.compact}><Text style={styles.light}>{connection === 'inactive' ? 'Lugar reservado · volte à partida' : state.turn !== null ? `${state.players[state.turn]?.nickname} está a decidir…` : 'Mão terminada · consulte as pontuações'}</Text></View>;
  const elapsed = Math.max(0, performance.now() - clock.receivedAt);
  const remaining = Math.min(300, Math.max(0, Math.ceil((state.turnDeadline - clock.serverTime - elapsed) / 1000)));
  const expired = remaining === 0;
  const grace = Math.max(0, Math.ceil(((state.turnDisconnectAt ?? 0) - clock.serverTime - elapsed) / 1000));
  const mine = state.turn === state.you;
  const player = state.players[state.turn]?.nickname;
  const title = state.phase === 'trumpSelection' ? mine ? 'Escolha o trunfo' : `${player} escolhe o trunfo`
    : state.phase === 'participationExchange' ? mine ? 'É o momento de trocar' : `${player} decide se participa`
      : mine ? 'A mesa espera pela sua carta' : `É a vez de ${player}`;
  const clockLabel = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`;
  return <View style={styles.compact} testID="turn-notice">
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flex: 1, gap: 3 }}><Text style={[styles.compactEyebrow, mine && { color: colors.gold }]}>{mine ? 'A SUA VEZ' : 'A AGUARDAR'} · {state.phase === 'trumpSelection' ? 'TRUNFO' : state.phase === 'participationExchange' ? 'TROCAS' : 'VAZAS'}</Text><Text accessibilityLiveRegion="polite" numberOfLines={2} style={styles.light}>{title}</Text></View>
      <View style={{ alignItems: 'flex-end' }}><Text testID="turn-timer" accessibilityLabel={`Tempo restante: ${Math.floor(remaining / 60)} minutos e ${remaining % 60} segundos`} style={[styles.compactDigits, remaining <= 60 && { color: '#ffc8b6' }]}>{clockLabel}</Text><Text style={styles.compactEyebrow}>{expired ? `${grace}s para desligar` : 'TEMPO RESTANTE'}</Text></View>
    </View>
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[styles.track, { backgroundColor: '#416653' }]}><View style={[styles.fill, { width: `${remaining / 3}%`, backgroundColor: remaining <= 60 ? '#ffbd97' : colors.gold }]} /></View>
    {expired && <Text accessibilityLiveRegion="polite" style={styles.light}>{grace > 0 ? 'Prazo extra: jogue antes de ser desligado.' : 'A mesa aguarda o regresso do jogador.'}</Text>}
    {connection !== 'ready' && <Text style={styles.compactEyebrow}>Sem ligação · tempo estimado</Text>}
  </View>;
}

const styles = StyleSheet.create({
  compact: { gap: 8, paddingTop: 10 },
  compactEyebrow: { color: '#c3d8cd', fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  compactDigits: { color: '#fffaf0', fontSize: 26, fontWeight: '800', fontVariant: ['tabular-nums'] },
  light: { color: '#fffaf0', fontSize: 14, fontWeight: '700' },
  track: { height: 4, backgroundColor: '#d4ddcf', borderRadius: 2, overflow: 'hidden' },
  fill: { height: 4 },
});
