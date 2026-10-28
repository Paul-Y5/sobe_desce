import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { Snapshot } from '../../shared/index';
import { Dialog } from './Dialog';
import { CompetitionBoard, modeNames } from './MatchModes';
import { color, fontSize, layout, radius } from './tokens';
import { Button, Heading, s } from './ui';

export function ScoreChart({ state }: { state: Snapshot }) {
  const players = state.players.filter(player => player !== null);
  const maximum = Math.max(0, ...players.map(player => player.score));
  const minimum = Math.min(0, ...players.map(player => player.score));
  const range = Math.max(1, maximum - minimum);
  const baseline = 64 + maximum / range * 132;
  return <View style={styles.chart} testID="score-chart">
    <Heading>Pontuações à vista</Heading>
    <Text style={s.body}>{state.format.mode === 'infinite' ? 'Quanto menos pontos, melhor. As barras abaixo da linha representam pontos negativos.' : 'Quanto menos pontos, melhor. O objetivo deste jogo é chegar a zero.'}</Text>
    <Text style={styles.caption}>{modeNames[state.format.mode]}{state.format.mode === 'competitive' ? ` · Jogo ${state.gameNumber}` : ''}</Text>
    <View style={styles.columns}>
      {players.map(player => <View key={player.seat} style={styles.column} accessible accessibilityLabel={`${player.nickname}${player.bot ? ', bot' : ''}: ${player.score} pontos${state.winners.includes(player.seat) ? ', vencedor' : ''}`}>
        <View style={styles.plot}>
          <View style={{ position: 'absolute', left: 0, right: 0, top: baseline, borderTopWidth: 1, borderTopColor: color.muted }} />
          <View style={{ position: 'absolute', alignItems: 'center', top: baseline - Math.max(0, player.score) / range * 132 - 61, gap: 5 }}>
            <View style={[styles.avatar, player.seat === state.you && styles.myAvatar]}><Text style={styles.initial}>{player.nickname.trim().slice(0, 1).toLocaleUpperCase('pt-PT') || '?'}</Text></View>
            <Text testID={`score-value-${player.seat}`} style={styles.value}>{player.score}</Text>
          </View>
          <View style={[styles.bar, { position: 'absolute', top: baseline - Math.max(0, player.score) / range * 132, height: Math.max(3, Math.abs(player.score) / range * 132), backgroundColor: player.seat === state.you ? color.gold : color.green }]} />
        </View>
        <Text numberOfLines={2} style={styles.name}>{player.nickname}</Text>
        <Text style={styles.caption}>{state.winners.includes(player.seat) ? '★ Venceu' : player.seat === state.you ? 'Eu' : player.bot ? 'Bot' : 'Jogador'}</Text>
      </View>)}
    </View>
    <Text style={styles.caption}>Pontos atuais · linha de zero · escala ajustada às pontuações</Text>
    <CompetitionBoard state={state} />
  </View>;
}

export function ScoreChartControl({ state, onTable = false }: { state: Snapshot; onTable?: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    {onTable ? <Pressable accessibilityRole="button" accessibilityLabel="Ver pontuações" style={styles.tableButton} onPress={() => setOpen(true)}><Text style={{ color: color.gold, fontSize: 18 }}>▥</Text><Text style={{ color: color.onFelt, fontSize: fontSize.xs, fontWeight: '700' }}>Pontuações</Text></Pressable> : <Button secondary title="Ver pontuações" onPress={() => setOpen(true)} />}
    <Dialog visible={open} onClose={() => setOpen(false)} label="Pontuações" maxWidth={layout.dialogWide} animated={false}>
      <View style={styles.dialog}>
        <ScrollView contentContainerStyle={{ padding: 18, gap: 18 }}><ScoreChart state={state} /><Button title="Voltar à mesa" onPress={() => setOpen(false)} /></ScrollView>
      </View>
    </Dialog>
  </>;
}

const styles = StyleSheet.create({
  tableButton: { minHeight: 48, paddingHorizontal: 12, borderRadius: radius.md + 2, borderWidth: 1, borderColor: color.tableButtonEdge, backgroundColor: color.tableButton, flexDirection: 'row', alignItems: 'center', gap: 6 },
  chart: { gap: 12, width: '100%' },
  columns: { flexDirection: 'row', gap: 8, alignItems: 'flex-end', paddingTop: 8 },
  column: { flex: 1, minWidth: 0, alignItems: 'center', gap: 6 },
  plot: { height: 202, width: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 5, borderBottomWidth: 1, borderBottomColor: color.line },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: color.avatar, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: color.green },
  myAvatar: { backgroundColor: color.goldTint, borderColor: color.gold },
  initial: { color: color.ink, fontWeight: '800', fontSize: 14 },
  value: { color: color.ink, fontWeight: '800', fontSize: 19, fontVariant: ['tabular-nums'] },
  bar: { width: '65%', maxWidth: 72, borderTopLeftRadius: 6, borderTopRightRadius: 6 },
  name: { color: color.ink, fontSize: 12, fontWeight: '700', textAlign: 'center', minHeight: 32 },
  caption: { color: color.muted, fontSize: fontSize.xs, textAlign: 'center' },
  dialog: { width: '100%', maxHeight: '100%', backgroundColor: color.paper, borderRadius: 20, overflow: 'hidden' },
});
