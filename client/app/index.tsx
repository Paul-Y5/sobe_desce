import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUITS, type PublicPlayer, type Snapshot } from '../../shared/index';
import { useGame } from '../src/GameContext';
import { Button, colors, PlayingCard, s, suitNames, suitSymbols } from '../src/ui';
import { OnboardingPrompt } from '../src/OnboardingPrompt';
import { MotionEntry, useReducedMotion } from '../src/motion';
import { TurnNotice } from '../src/TurnNotice';

export default function Home() {
  const game = useGame();
  const { width } = useWindowDimensions();
  return <SafeAreaView style={s.screen}><ScrollView contentContainerStyle={[s.page, width < 400 && { padding: 12 }]} keyboardShouldPersistTaps="handled">
    <OnboardingPrompt eligible={!game.snapshot && (game.connection === 'ready' || game.connection === 'reconnecting')} />
    <View style={s.header}>
      <View><Text style={s.eyebrow}>À MESA COM AMIGOS</Text><Text style={s.brand}>Sobe e Desce<Text style={{ color: colors.green }}> ♣</Text></Text></View>
      <Link href="/rules" asChild><Pressable accessibilityRole="link" style={styles.rulesLink}><Text style={s.label}>Como jogar ↗</Text></Pressable></Link>
    </View>
    {game.connection !== 'ready' && <View style={s.notice}><Text style={s.label} accessibilityLiveRegion="polite">{game.connection === 'connecting' ? 'A ligar ao servidor…' : game.connection === 'replaced' ? 'Sessão aberta noutra ligação' : game.connection === 'inactive' ? 'Desligado por inatividade · lugar reservado' : 'A restabelecer ligação… O seu lugar está reservado.'}</Text>{game.connection === 'replaced' && <Button title="Voltar ao início" onPress={game.reset} />}{game.connection === 'inactive' && <Button title="Voltar à partida" onPress={game.returnToGame} />}</View>}
    {!!game.error && <View style={s.notice}><Text accessibilityRole="alert" style={s.body}>{game.error}</Text><Button secondary title="Fechar aviso" onPress={game.dismissError} /></View>}
    {game.snapshot ? game.snapshot.phase === 'lobby' ? <Lobby state={game.snapshot} /> : <Table state={game.snapshot} /> : <Entry />}
    <Text style={[s.body, { fontSize: 12, textAlign: 'center' }]}>Quatro pessoas. Quarenta cartas. Um lugar à mesa.</Text>
  </ScrollView></SafeAreaView>;
}
function Entry() {
  const { enter, busy, connection } = useGame();
  const [nickname, setNickname] = useState(''), [code, setCode] = useState('');
  const { width } = useWindowDimensions();
  const disabled = !nickname.trim() || busy || connection !== 'ready';
  return <View style={[styles.home, width < 760 && { flexDirection: 'column' }]}>
    <View style={styles.hero}>
      <Text style={[s.eyebrow, { color: '#acd1ba' }]}>O JOGO CONTINUA. ONDE ESTIVEREM.</Text>
      <Text style={[styles.heroTitle, width < 420 && { fontSize: 32, lineHeight: 38 }]}>A amizade sobe.{ '\n' }A pontuação desce.</Text>
      <Text style={styles.heroText}>Junte três amigos, escolha o trunfo e conquiste as vazas. O primeiro a chegar a zero ganha.</Text>
      <View style={[s.row, { marginVertical: 20, justifyContent: 'center', gap: 16 }]}>
        <View style={{ transform: [{ rotate: '-12deg' }], marginTop: 12 }}><PlayingCard card={{ id: 'clubs-A', rank: 'A', suit: 'clubs' }} /></View>
        <PlayingCard card={{ id: 'hearts-7', rank: '7', suit: 'hearts' }} />
        <View style={{ transform: [{ rotate: '12deg' }], marginTop: 12 }}><PlayingCard card={{ id: 'spades-K', rank: 'K', suit: 'spades' }} /></View>
      </View>
      <View style={styles.heroFooter}><Text style={styles.heroText}>4 jogadores</Text><Text style={styles.heroText}>5 vazas por mão</Text><Text style={styles.heroText}>20 → 0</Text></View>
    </View>
    <View style={[s.panel, styles.entry]}>
      <Text style={s.heading}>Puxe uma cadeira.</Text><Text style={s.body}>Sem conta. Basta um nome e boa companhia.</Text>
      <Text style={s.label}>O seu nome</Text><TextInput accessibilityLabel="O seu nome" testID="nickname" placeholder="Como lhe chamamos?" placeholderTextColor={colors.muted} value={nickname} onChangeText={setNickname} maxLength={24} style={s.input} autoComplete="nickname" />
      <Button title={busy ? 'A entrar…' : 'Criar sala'} disabled={disabled} onPress={() => void enter(nickname)} />
      <View style={styles.divider}><View style={styles.line} /><Text style={s.body}>ou entre na sala dos amigos</Text><View style={styles.line} /></View>
      <Text style={s.label}>Código da sala</Text><TextInput accessibilityLabel="Código da sala" testID="room-code-input" placeholder="ABC234" placeholderTextColor={colors.muted} value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z2-9]/g, ''))} maxLength={6} autoCapitalize="characters" autoCorrect={false} style={[s.input, { letterSpacing: 5 }]} />
      <Button title="Entrar na sala" secondary disabled={disabled || code.length !== 6} onPress={() => void enter(nickname, code)} />
      <Text style={[s.body, { fontSize: 12 }]}>O seu lugar fica reservado se perder a ligação. No navegador, mantenha este separador para regressar à partida.</Text>
    </View>
  </View>;
}
function Lobby({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const count = state.players.filter(Boolean).length;
  const ready = state.players.every(p => p?.connected);
  return <>
    <View style={[s.panel, { alignItems: 'center', paddingVertical: 32 }]}>
      <Text style={s.eyebrow}>A SUA MESA ESTÁ ABERTA</Text><Text style={s.heading}>Só falta a companhia.</Text>
      <Text style={s.body}>Partilhe este código com os seus amigos.</Text><Text selectable testID="room-code" style={styles.roomCode}>{state.roomCode}</Text>
      <Text style={s.body}>{count} de 4 lugares ocupados</Text>
    </View>
    <View style={styles.lobbySeats}>{state.players.map((p, i) => <View key={i} style={[s.panel, { flex: 1, minWidth: 135 }]}>
      <Text style={s.eyebrow}>LUGAR {i + 1}{i === state.creator ? ' · ANFITRIÃO' : ''}</Text>
      <Text style={s.label}>{p ? `${p.nickname}${i === state.you ? ' (eu)' : ''}` : 'À espera de um amigo'}</Text>
      <Text style={s.body}>{p ? p.connected ? '● Pronto para jogar' : '○ Sem ligação · reservado' : '○ Livre'}</Text>
    </View>)}</View>
    {state.you === state.creator ? <Button title="Começar partida" disabled={!ready || busy || connection !== 'ready'} onPress={() => void act({ type: 'start' })} /> : <Text style={[s.body, { textAlign: 'center' }]}>A aguardar que o anfitrião comece a partida.</Text>}
    <Text style={[s.body, { textAlign: 'center' }]}>Cada pessoa começa com 20 pontos. Ganha quem chegar a zero.</Text>
    <Restart state={state} />
  </>;
}
function Seat({ player, active, you, dealer }: { player: PublicPlayer; active: boolean; you: boolean; dealer: boolean }) {
  return <View style={[styles.seat, active && styles.activeSeat]}>
    <View style={s.row}><View style={styles.avatar}><Text style={{ color: colors.dark, fontWeight: '800' }}>{player.nickname.slice(0, 1).toUpperCase()}</Text></View><Text numberOfLines={2} style={[styles.seatName, { flex: 1 }]}>{player.nickname}{you ? ' (eu)' : ''}</Text><Text style={styles.score}>{player.score}</Text></View>
    <Text style={styles.seatDetail}>{player.inactive ? '○ Inatividade · reservado' : !player.connected ? '○ Sem ligação' : active ? '● A jogar' : player.participating === false ? 'Ficou de fora' : `${player.tricks} ${player.tricks === 1 ? 'vaza' : 'vazas'} · ${player.cardCount} cartas`}{dealer ? ' · Dá cartas' : ''}</Text>
  </View>;
}
function Table({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const { width } = useWindowDimensions();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => setSelected([]), [state.revision]);
  const mine = state.turn === state.you;
  const enabled = !busy && connection === 'ready';
  const exchanging = state.phase === 'participationExchange';
  const finished = state.phase === 'handComplete' || state.phase === 'matchComplete';
  const label = state.phase === 'trumpSelection' ? 'Escolha do trunfo' : exchanging ? 'Participação e trocas' : finished ? 'Resultado da mão' : `Vaza ${state.completedTricks.length + 1} de 5`;
  const turnName = state.turn !== null ? state.players[state.turn]?.nickname : '';
  const relativeSeats = [2, 1, 3, 0].map(offset => (state.you + offset) % 4);
  const seat = (index: number) => <Seat player={state.players[index]!} active={state.turn === index} you={state.you === index} dealer={state.dealer === index} />;
  const last = state.completedTricks.at(-1);
  const showingLast = !state.trick.length && !!last;
  const displayedPlays = state.trick.length ? state.trick : last?.plays ?? [];
  return <>
    <View style={s.header}><View><Text style={s.eyebrow}>SALA {state.roomCode} · MÃO {state.handNumber}</Text><Text style={s.heading}>{label}</Text></View><View style={styles.trumpBadge}><Text style={s.label}>{state.trump ? `${suitSymbols[state.trump]} ${suitNames[state.trump]}${state.trump === 'hearts' ? ' · Pontos ×2' : state.trump === 'clubs' ? ' · Todos jogam' : ''}` : 'Trunfo por escolher'}</Text></View></View>
    <TurnNotice state={state} />
    {state.players.some(p => p && !p.connected) && <View style={s.notice}><Text style={s.body}>Há jogadores sem ligação. Os lugares estão reservados e nenhuma jogada é feita por eles. O anfitrião pode recomeçar a partida se não conseguirem voltar.</Text></View>}
    <View testID={`table-${state.revision}`} style={[styles.table, width < 600 && { padding: 12, borderRadius: 24 }]}>
      <View style={{ alignSelf: 'center', width: '65%', maxWidth: 300 }}>{seat(relativeSeats[0])}</View>
      <View style={[styles.middle, width < 600 && { flexDirection: 'column' }]}>
        {width >= 600 && <View style={{ width: 190 }}>{seat(relativeSeats[1])}</View>}
        {width < 600 && <View style={[s.row, { alignSelf: 'stretch', alignItems: 'stretch' }]}><View style={{ flex: 1 }}>{seat(relativeSeats[1])}</View><View style={{ flex: 1 }}>{seat(relativeSeats[2])}</View></View>}
        <View style={styles.trickArea}>
          <Text style={styles.tableLabel}>{finished ? 'Mão terminada' : mine ? 'É a sua vez' : `A aguardar ${turnName}`}</Text>
          {showingLast && <MotionEntry eventKey={`${state.handNumber}-${state.completedTricks.length}`}><Text accessibilityLiveRegion="polite" style={styles.tableLabel}>★ Vaza para {state.players[last!.winner]?.nickname}</Text></MotionEntry>}
          <View style={[s.row, { justifyContent: 'center', minHeight: 104 }]}>{displayedPlays.length ? displayedPlays.map(play => <MotionEntry key={`${state.handNumber}-${play.card.id}`} eventKey={play.card.id} kind="play"><View style={{ alignItems: 'center', gap: 6 }}><PlayingCard card={play.card} small={width < 600} /><Text numberOfLines={1} style={styles.cardCaption}>{state.players[play.seat]?.nickname}</Text></View></MotionEntry>) : <Text style={styles.tableHint}>{state.phase === 'trumpSelection' ? '♣  ♦  ♥  ♠' : exchanging ? 'Prepare a sua mão' : finished ? 'Cinco vazas. Contas feitas.' : 'A próxima vaza começa aqui'}</Text>}</View>
        </View>
        {width >= 600 && <View style={{ width: 190 }}>{seat(relativeSeats[2])}</View>}
      </View>
      <View style={{ alignSelf: 'center', width: '65%', maxWidth: 300 }}>{seat(relativeSeats[3])}</View>
    </View>
    {!finished && <View style={s.panel}>
      <View style={s.header}><Text style={s.label}>A sua mão</Text><Text style={s.body}>{state.players[state.you]?.participating === false ? 'Ficou de fora desta mão' : 'Só visível para si'}</Text></View>
      <View style={[s.row, { justifyContent: 'center', gap: width < 420 ? 4 : 10, paddingTop: 6 }]}>{state.hand.map((card, index) => <MotionEntry key={`${state.handNumber}-${card.id}`} eventKey={`${state.handNumber}-${card.id}`} delay={index * 60} kind="deal"><PlayingCard card={card} compact={width < 420} selected={selected.includes(card.id)} legal={state.legalCardIds.includes(card.id)} disabled={!enabled || !mine || (!exchanging && !state.legalCardIds.includes(card.id))} onPress={() => {
        if (exchanging) setSelected(previous => previous.includes(card.id) ? previous.filter(id => id !== card.id) : previous.length < state.rules.exchangeLimit ? [...previous, card.id] : previous);
        else void act({ type: 'play', cardId: card.id });
      }} /></MotionEntry>)}</View>
      {state.phase === 'trumpSelection' && (mine ? <><Text style={s.body}>Escolha o trunfo com as suas três primeiras cartas. Receberá mais duas e terá de participar.</Text><View style={s.row}>{SUITS.map(suit => <Button key={suit} secondary title={`${suitSymbols[suit]} ${suitNames[suit]}`} disabled={!enabled} onPress={() => void act({ type: 'chooseTrump', suit })} />)}</View></> : <Text style={s.body}>{turnName} está a escolher o trunfo.</Text>)}
      {exchanging && (mine ? <><Text style={s.body}>Toque nas cartas que quer trocar (até {state.rules.exchangeLimit}). Pode participar sem trocar cartas.</Text><View style={s.row}><Button title={selected.length ? `Participar e trocar ${selected.length}` : 'Participar sem trocar'} disabled={!enabled} onPress={() => void act({ type: 'exchange', cardIds: selected })} />{state.canSitOut && <Button secondary title="Ficar de fora" disabled={!enabled} onPress={() => void act({ type: 'sitOut' })} />}</View>{!state.canSitOut && <Text style={s.body}>{state.trump === 'clubs' ? 'Com paus, todos têm de participar.' : 'Quem escolhe o trunfo tem de participar.'}</Text>}</> : <Text style={s.body}>A aguardar a decisão de {turnName}.</Text>)}
      {state.phase === 'trickPlay' && <Text style={s.body}>{mine ? 'Toque numa carta com contorno verde para jogar. Deve assistir, cortar e subir quando possível.' : state.players[state.you]?.participating === false ? 'Acompanhe a mão. A sua pontuação mantém-se.' : `É a vez de ${turnName}.`}</Text>}
    </View>}
    {finished && <MotionEntry eventKey={`${state.handNumber}-${state.phase}`}><View style={s.panel}><Text style={s.heading}>{state.phase === 'matchComplete' ? state.winners.length > 1 ? 'Vitória partilhada!' : 'Temos vencedor!' : 'Mão concluída'}</Text>
      {state.phase === 'matchComplete' && <Text style={s.body}>{state.winners.map(i => state.players[i]?.nickname).join(' e ')} {state.winners.length > 1 ? 'chegaram' : 'chegou'} a zero. Boa partida!</Text>}
      {state.players.map((p, i) => <View key={i} style={[s.header, styles.scoreRow]}><Text style={s.label}>{p!.nickname}{state.winners.includes(i) ? ' ★' : ''}</Text><Text style={s.body}>{p!.participating ? `${p!.tricks} vazas` : 'Ficou de fora'} · {state.scoreChanges[i] > 0 ? '+' : ''}{state.scoreChanges[i]} → <Text style={s.label}>{p!.score} pontos</Text></Text></View>)}
      {state.phase === 'handComplete' && (state.you === state.creator ? <Button title="Próxima mão" disabled={!enabled} onPress={() => void act({ type: 'nextHand' })} /> : <Text style={s.body}>A aguardar que o anfitrião dê início à próxima mão.</Text>)}
    </View></MotionEntry>}
    {last && <View style={[s.panel, { padding: 16 }]}><Text style={s.label}>Última vaza · ganhou {state.players[last.winner]?.nickname}</Text><View style={s.row}>{last.plays.map(play => <View key={play.seat} style={{ alignItems: 'center', gap: 5 }}><PlayingCard card={play.card} small /><Text style={[s.body, { fontSize: 11 }]}>{state.players[play.seat]?.nickname}</Text></View>)}</View></View>}
    <Restart state={state} />
  </>;
}
function Restart({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const [confirm, setConfirm] = useState(false);
  const reduced = useReducedMotion();
  if (state.you !== state.creator) return null;
  if (state.phase === 'lobby' && !state.players.some(p => p && !p.connected)) return null;
  return <><Button secondary title={state.phase === 'matchComplete' ? 'Nova partida' : 'Recomeçar partida'} disabled={busy || connection !== 'ready'} onPress={() => setConfirm(true)} />
    <Modal visible={confirm} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setConfirm(false)}>
      <View style={styles.backdrop}><View style={[s.panel, { width: '100%', maxWidth: 440 }]}><Text style={s.heading}>Recomeçar a partida?</Text><Text style={s.body}>A pontuação e as cartas serão apagadas. Todos voltam à sala de espera. Os lugares de quem está sem ligação ficam livres.</Text><Button title="Sim, recomeçar" onPress={() => { setConfirm(false); void act({ type: 'restart', confirmed: true }); }} /><Button secondary title="Continuar nesta partida" onPress={() => setConfirm(false)} /></View></View>
    </Modal>
  </>;
}
const styles = StyleSheet.create({
  rulesLink: { padding: 12, minHeight: 48, justifyContent: 'center' },
  home: { flexDirection: 'row', gap: 20, alignItems: 'stretch' },
  hero: { flex: 1.15, borderRadius: 22, padding: 30, backgroundColor: colors.dark, gap: 18, justifyContent: 'center', minHeight: 430 },
  heroTitle: { color: colors.white, fontSize: 44, lineHeight: 50, fontWeight: '800', letterSpacing: -1.5 },
  heroText: { color: '#c9ded0', fontSize: 16, lineHeight: 25 },
  heroFooter: { borderTopWidth: 1, borderColor: '#3c6151', paddingTop: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  entry: { flex: 1, justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 8 },
  line: { flex: 1, height: 1, backgroundColor: colors.line },
  roomCode: { fontSize: 40, fontWeight: '800', letterSpacing: 8, color: colors.green, paddingVertical: 12 },
  lobbySeats: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  trumpBadge: { backgroundColor: '#e7e5d7', borderRadius: 30, paddingHorizontal: 18, paddingVertical: 12 },
  table: { backgroundColor: colors.green, borderRadius: 48, borderWidth: 6, borderColor: '#cfc4a7', padding: 24, gap: 14 },
  middle: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 165 },
  seat: { backgroundColor: '#154634', padding: 12, borderRadius: 14, borderWidth: 2, borderColor: '#38715a', gap: 8 },
  activeSeat: { borderColor: colors.gold, backgroundColor: '#224b34' },
  avatar: { width: 26, height: 26, backgroundColor: '#d7e4cf', borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  seatName: { color: colors.white, fontSize: 14, fontWeight: '700' },
  seatDetail: { color: '#c4d7c8', fontSize: 11, lineHeight: 16 },
  score: { color: colors.gold, fontSize: 23, fontWeight: '800' },
  trickArea: { flex: 1, minHeight: 160, justifyContent: 'center', alignItems: 'center', gap: 12 },
  tableLabel: { color: '#f7e4b5', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tableHint: { color: '#b5d0be', fontSize: 17, textAlign: 'center' },
  cardCaption: { color: '#dbe8dd', fontSize: 10, maxWidth: 65 },
  scoreRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  backdrop: { flex: 1, backgroundColor: '#001b12aa', justifyContent: 'center', alignItems: 'center', padding: 20 },
});
