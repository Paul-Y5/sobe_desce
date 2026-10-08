import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../../shared/index';
import { Button, colors, s } from './ui';

export function ScoreChart({ state }: { state: Snapshot }) {
  const players = state.players.filter(player => player !== null);
  const maximum = Math.max(1, ...players.map(player => player.score));
  return <View style={styles.chart} testID="score-chart">
    <Text style={s.heading}>Pontuações à vista</Text>
    <Text style={s.body}>Quanto menos pontos, melhor. O objetivo é chegar a zero.</Text>
    <View style={styles.columns}>
      {players.map(player => <View key={player.seat} style={styles.column} accessible accessibilityLabel={`${player.nickname}${player.bot ? ', bot' : ''}: ${player.score} pontos${state.winners.includes(player.seat) ? ', vencedor' : ''}`}>
        <View style={styles.plot}>
          <View style={[styles.avatar, player.seat === state.you && styles.myAvatar]}><Text style={styles.initial}>{player.nickname.trim().slice(0, 1).toLocaleUpperCase('pt-PT') || '?'}</Text></View>
          <Text testID={`score-value-${player.seat}`} style={styles.value}>{player.score}</Text>
          <View style={[styles.bar, { height: Math.max(3, player.score / maximum * 132), backgroundColor: player.seat === state.you ? colors.gold : colors.green }]} />
        </View>
        <Text numberOfLines={2} style={styles.name}>{player.nickname}</Text>
        <Text style={styles.caption}>{state.winners.includes(player.seat) ? '★ Venceu' : player.seat === state.you ? 'Eu' : player.bot ? 'Bot' : 'Jogador'}</Text>
      </View>)}
    </View>
    <Text style={styles.caption}>Pontos atuais · escala ajustada à maior pontuação</Text>
  </View>;
}

export function ScoreChartControl({ state }: { state: Snapshot }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button secondary title="Ver pontuações" onPress={() => setOpen(true)} />
    <Modal visible={open} transparent animationType="none" onRequestClose={() => setOpen(false)}>
      <View style={styles.overlay}><View style={styles.dialog} accessibilityViewIsModal>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}><ScoreChart state={state} /><Button title="Voltar à mesa" onPress={() => setOpen(false)} /></ScrollView>
      </View></View>
    </Modal>
  </>;
}

const styles = StyleSheet.create({
  chart: { gap: 12, width: '100%' },
  columns: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingTop: 8 },
  column: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  plot: { height: 202, width: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 5, borderBottomWidth: 1, borderBottomColor: colors.line },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#dce8df', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.green },
  myAvatar: { backgroundColor: '#fff0bf', borderColor: colors.gold },
  initial: { color: colors.ink, fontWeight: '800', fontSize: 14 },
  value: { color: colors.ink, fontWeight: '800', fontSize: 19, fontVariant: ['tabular-nums'] },
  bar: { width: '65%', maxWidth: 72, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  name: { color: colors.ink, fontSize: 12, fontWeight: '700', textAlign: 'center', minHeight: 32 },
  caption: { color: colors.muted, fontSize: 11, textAlign: 'center' },
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#071a11aa', padding: 16 },
  dialog: { width: '100%', maxWidth: 640, maxHeight: '90%', backgroundColor: colors.paper, borderRadius: 20, overflow: 'hidden' },
});
