import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { PublicPlayer, Snapshot } from '../../shared/index';
import { modeNames } from './MatchModes';
import { MotionEntry, useMotionSettings } from './motion';
import { ScoreChartControl } from './ScoreChart';
import { TurnNotice } from './TurnNotice';
import { colors, PlayingCard, suitNames, suitSymbols } from './ui';

/** Outside the scrolling play area: the deadline, trump and scores stay reachable. */
export function TableHud({ state }: { state: Snapshot }) {
  return <View style={styles.hud} testID="game-hud"><View style={styles.hudContent}>
    <View style={styles.hudRow}>
      <View style={{ flex: 1, gap: 3 }}><Text style={styles.eyebrow}>{modeNames[state.format.mode]} · MÃO {state.handNumber}{state.format.mode === 'competitive' ? ` · JOGO ${state.gameNumber}` : ''}</Text>
        <View testID="trump-indicator" style={{ flexDirection: 'row', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}><Text style={styles.trump}>{state.trump ? `${suitSymbols[state.trump]} ${suitNames[state.trump]}` : 'Trunfo por escolher'}</Text>{state.trump && <Text style={styles.trumpRule}>{state.trump === 'hearts' ? '×2 pontos' : state.trump === 'clubs' ? 'Todos jogam' : 'Trunfo'}</Text>}</View>
      </View><ScoreChartControl state={state} onTable />
    </View><TurnNotice state={state} />
  </View></View>;
}

function Seat({ player, active, you, dealer, compact }: { player: PublicPlayer; active: boolean; you: boolean; dealer: boolean; compact: boolean }) {
  return <View testID={`seat-${player.seat}`} style={[styles.seat, compact && styles.compactSeat, active && styles.activeSeat]}>
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      {!compact && <View style={[styles.avatar, you && { backgroundColor: colors.gold }]}><Text style={styles.initial}>{player.nickname.slice(0, 1).toLocaleUpperCase('pt-PT')}</Text></View>}
      <View style={{ flex: 1, minWidth: 0 }}><Text numberOfLines={1} style={styles.name}>{dealer ? 'Ⓓ ' : ''}{player.nickname}{you ? ' (eu)' : ''}</Text><Text style={styles.points}>{player.score} <Text style={styles.pointsUnit}>pontos</Text></Text></View>
    </View>
    <Text numberOfLines={2} style={[styles.detail, active && { color: colors.gold }]}>{player.inactive ? 'Inativo · reservado' : !player.connected ? 'Sem ligação' : active ? '● A jogar' : player.participating === false ? 'Ficou de fora' : `${player.tricks} ${player.tricks === 1 ? 'vaza' : 'vazas'}${player.bot ? ' · Bot' : ''}`}</Text>
    {!you && player.cardCount > 0 && <View style={styles.backs} accessible accessibilityLabel={`${player.cardCount} cartas na mão`}>
      {Array.from({ length: player.cardCount }, (_, index) => <View key={index} style={styles.back}><Text style={{ color: '#bfd2c1', fontSize: 8 }}>◆</Text></View>)}
    </View>}
  </View>;
}

export function TableArena({ state }: { state: Snapshot }) {
  const { width } = useWindowDimensions();
  const compact = width < 600;
  const narrow = width < 360;
  const last = state.completedTricks.at(-1);
  const showingLast = state.trick.length === 0 && !!last;
  const plays = state.trick.length ? state.trick : last?.plays ?? [];
  const finished = state.phase === 'handComplete' || state.phase === 'matchComplete';
  const directions = ['bottom', 'left', 'top', 'right'] as const;
  const positions = [{ left: 52, top: 96 }, { left: 0, top: 48 }, { left: 52, top: 0 }, { left: 104, top: 48 }];
  const mine = state.turn === state.you;
  return <View testID={`table-${state.revision}`} style={[styles.table, !compact && { height: 390 }]}>
    <View pointerEvents="none" style={styles.feltLine} />
    {[2, 1, 3, 0].map(relative => {
      const seat = (state.you + relative) % 4;
      return <View key={seat} style={[styles.seatPosition, relative === 2 ? styles.north : relative === 0 ? styles.south : relative === 1 ? styles.west : styles.east, narrow && (relative === 1 || relative === 3) && { width: 64 }, !compact && (relative === 1 || relative === 3) && { width: 190 }]}>
        <Seat player={state.players[seat]!} active={state.turn === seat} you={seat === state.you} dealer={state.dealer === seat} compact={compact && (relative === 1 || relative === 3)} />
      </View>;
    })}
    <View style={[styles.centre, narrow && { left: 70, right: 70 }]}>
      {plays.length ? <View style={{ width: 150, height: 182 }}>{plays.map(play => {
        const relative = (play.seat - state.you + 4) % 4;
        const winner = showingLast && last?.winner === play.seat;
        return <View key={`${state.gameNumber}-${state.handNumber}-${play.card.id}`} style={[styles.played, positions[relative]]}>
          <MotionEntry eventKey={play.card.id} kind="play" direction={directions[relative]}><View style={[styles.playedFrame, winner && styles.winningCard]}><PlayingCard card={play.card} small /></View></MotionEntry>
          <Text numberOfLines={1} style={styles.cardCaption}>{winner ? '★ ' : ''}{state.players[play.seat]?.nickname}</Text>
        </View>;
      })}</View> : <View style={styles.emptyTrick}><Text style={styles.tableSymbol}>{state.trump ? suitSymbols[state.trump] : '♣'}</Text><Text style={styles.tableHint}>{state.phase === 'trumpSelection' ? 'Escolha do trunfo' : state.phase === 'participationExchange' ? 'Prepare a sua mão' : 'A vaza começa aqui'}</Text></View>}
    </View>
    <View style={styles.trickStatus}><Text style={styles.trickCount}>{finished ? '5 / 5 VAZAS' : `${Math.min(5, state.completedTricks.length + 1)} / 5 VAZAS`}</Text><Text style={styles.turnLabel}>{finished ? 'Mão terminada' : mine ? 'É a sua vez' : `A aguardar ${state.turn === null ? 'a mesa' : state.players[state.turn]?.nickname}`}</Text></View>
    {showingLast && <View style={styles.trickWinner}><MotionEntry eventKey={`${state.gameNumber}-${state.handNumber}-${last!.winner}-${state.completedTricks.length}`}><Text accessibilityLiveRegion="polite" style={styles.winnerText}>★ Vaza para {state.players[last!.winner]?.nickname}</Text></MotionEntry></View>}
  </View>;
}

export function TableTools({ state }: { state: Snapshot }) {
  const motion = useMotionSettings();
  return <View style={styles.tools}><Text style={{ color: colors.muted, fontSize: 12 }}>SALA {state.roomCode}</Text>
    <Link href="/account" asChild><Pressable accessibilityRole="link" style={styles.tool}><Text style={styles.toolLabel}>Conta</Text></Pressable></Link>
    <Link href="/rules" asChild><Pressable accessibilityRole="link" style={styles.tool}><Text style={styles.toolLabel}>Como jogar ↗</Text></Pressable></Link>
    <Pressable accessibilityRole="button" accessibilityLabel={motion.systemReduced ? 'Animações reduzidas pelo dispositivo' : motion.disabled ? 'Ativar animações' : 'Desativar animações'} disabled={motion.systemReduced} accessibilityState={{ disabled: motion.systemReduced }} onPress={() => motion.setDisabled(!motion.disabled)} style={styles.tool}><Text style={styles.toolLabel}>{motion.reduced ? 'Animações: não' : 'Animações: sim'}</Text></Pressable>
  </View>;
}

const styles = StyleSheet.create({
  hud: { backgroundColor: '#103c2e', borderBottomWidth: 2, borderBottomColor: '#bfa971' },
  hudContent: { width: '100%', maxWidth: 1120, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 10 },
  hudRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  eyebrow: { color: '#c3d8cd', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  trump: { color: '#fff8e6', fontSize: 18, fontWeight: '800' },
  trumpRule: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  table: { height: 370, position: 'relative', backgroundColor: '#185c45', borderWidth: 2, borderColor: '#9c9269', borderRadius: 28, overflow: 'hidden' },
  feltLine: { position: 'absolute', left: 14, right: 14, top: 14, bottom: 14, borderWidth: 1, borderColor: '#52806a', borderRadius: 100 },
  seatPosition: { position: 'absolute', zIndex: 2 },
  north: { top: 8, left: '50%', width: 170, marginLeft: -85 },
  south: { bottom: 30, left: '50%', width: 170, marginLeft: -85 },
  west: { left: 6, top: 133, width: 78 },
  east: { right: 6, top: 133, width: 78 },
  seat: { backgroundColor: '#123f30', borderWidth: 1, borderColor: '#64977b', padding: 7, borderRadius: 12, gap: 3 },
  compactSeat: { paddingHorizontal: 5 },
  activeSeat: { borderColor: colors.gold, borderWidth: 2, backgroundColor: '#294d35' },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d0dfc9' },
  initial: { color: colors.dark, fontSize: 13, fontWeight: '800' },
  name: { color: '#fffaf0', fontSize: 12, fontWeight: '700' },
  points: { color: colors.gold, fontSize: 18, fontWeight: '800', fontVariant: ['tabular-nums'] },
  pointsUnit: { color: '#d2e0d4', fontSize: 10, fontWeight: '500' },
  detail: { color: '#d2e0d4', fontSize: 10, lineHeight: 13 },
  backs: { flexDirection: 'row', paddingLeft: 3, height: 14 },
  back: { width: 14, height: 17, borderRadius: 3, borderWidth: 1, borderColor: '#a2b89e', backgroundColor: '#386554', marginLeft: -3, alignItems: 'center', justifyContent: 'center' },
  centre: { position: 'absolute', top: 95, left: 84, right: 84, alignItems: 'center', justifyContent: 'center', height: 180 },
  played: { position: 'absolute', width: 48, alignItems: 'center', gap: 3 },
  playedFrame: { borderRadius: 9, borderWidth: 2, borderColor: 'transparent' },
  winningCard: { borderColor: colors.gold },
  cardCaption: { color: '#edf5e7', fontSize: 9, maxWidth: 60 },
  emptyTrick: { alignItems: 'center', gap: 5 },
  tableSymbol: { color: '#92b6a0', fontSize: 58 },
  tableHint: { color: '#d7e5d8', fontSize: 12, textAlign: 'center' },
  trickStatus: { position: 'absolute', bottom: 6, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  trickCount: { color: '#d4e3d3', fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  turnLabel: { color: '#fff2c6', fontSize: 12, fontWeight: '700', flexShrink: 1 },
  trickWinner: { position: 'absolute', top: 77, left: 8, right: 8, alignItems: 'center' },
  winnerText: { color: colors.gold, fontSize: 11, fontWeight: '700' },
  tools: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between', gap: 4 },
  tool: { minHeight: 44, paddingHorizontal: 10, justifyContent: 'center' },
  toolLabel: { color: colors.green, fontSize: 12, fontWeight: '700' },
});
