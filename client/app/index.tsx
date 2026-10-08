import { useEffect, useRef, useState } from 'react';
import { Link } from 'expo-router';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SUITS, type Snapshot } from '../../shared/index';
import { useGame } from '../src/GameContext';
import { Button, colors, PlayingCard, s, suitNames, suitSymbols } from '../src/ui';
import { OnboardingPrompt } from '../src/OnboardingPrompt';
import { MotionEntry, useReducedMotion } from '../src/motion';
import { FinishInfinite, ModeOptions } from '../src/MatchModes';
import { ScoreChart, ScoreChartControl } from '../src/ScoreChart';
import { Chat } from '../src/Chat';
import { TableArena, TableHud, TableTools } from '../src/TableArena';

export default function Home() {
  const game = useGame();
  const { width } = useWindowDimensions();
  const inGame = game.snapshot && game.snapshot.phase !== 'lobby';
  const scroll = useRef<ScrollView>(null);
  const dealKey = inGame ? `${game.snapshot!.roomCode}-${game.snapshot!.gameNumber}-${game.snapshot!.handNumber}` : null;
  useEffect(() => {
    if (!dealKey) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [dealKey]);
  return <SafeAreaView style={s.screen}>
    {inGame && <TableHud state={game.snapshot!} />}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[s.page, width < 400 && { padding: 12 }, inGame && { gap: 14, paddingTop: 12 }]} keyboardShouldPersistTaps="handled">
    <OnboardingPrompt eligible={!game.snapshot && (game.connection === 'ready' || game.connection === 'reconnecting')} />
    {!inGame && <View style={s.header}>
      <View><Text style={s.eyebrow}>À MESA COM AMIGOS</Text><Text style={s.brand}>Sobe e Desce<Text style={{ color: colors.green }}> ♣</Text></Text></View>
      <Link href="/account" style={s.label}>Conta</Link>
      <Link href="/rules" asChild><Pressable accessibilityRole="link" style={styles.rulesLink}><Text style={s.label}>Como jogar ↗</Text></Pressable></Link>
    </View>}
    {game.connection !== 'ready' && <View style={s.notice}><Text style={s.label} accessibilityLiveRegion="polite">{game.connection === 'connecting' ? 'A ligar ao servidor…' : game.connection === 'replaced' ? 'Sessão aberta noutra ligação' : game.connection === 'inactive' ? 'Desligado por inatividade · lugar reservado' : 'A restabelecer ligação… O seu lugar está reservado.'}</Text>{game.connection === 'replaced' && <Button title="Voltar ao início" onPress={game.reset} />}{game.connection === 'inactive' && <Button title="Voltar à partida" onPress={game.returnToGame} />}</View>}
    {!!game.error && <View style={s.notice}><Text accessibilityRole="alert" style={s.body}>{game.error}</Text><Button secondary title="Fechar aviso" onPress={game.dismissError} /></View>}
    {game.snapshot?.phase === 'lobby' && <ScoreChartControl state={game.snapshot} />}
    {game.snapshot ? game.snapshot.phase === 'lobby' ? <Lobby state={game.snapshot} /> : <Table state={game.snapshot} /> : <Entry />}
    {inGame && <TableTools state={game.snapshot!} />}
    {game.snapshot && <Chat />}
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
    <ModeOptions state={state} />
    <View style={[s.panel, { alignItems: 'center', paddingVertical: 32 }]}>
      <Text style={s.eyebrow}>A SUA MESA ESTÁ ABERTA</Text><Text style={s.heading}>Só falta a companhia.</Text>
      <Text style={s.body}>Partilhe este código com os seus amigos.</Text><Text selectable testID="room-code" style={styles.roomCode}>{state.roomCode}</Text>
      <Text style={s.body}>{count} de 4 lugares ocupados</Text>
      {state.players.some(p => p?.bot) && <Text style={s.label}>Mesa de treino · inclui bots</Text>}
    </View>
    <View style={styles.lobbySeats}>{state.players.map((p, i) => <View key={i} style={[s.panel, { flex: 1, minWidth: 135 }]}>
      <Text style={s.eyebrow}>LUGAR {i + 1}{i === state.creator ? ' · ANFITRIÃO' : ''}</Text>
      <Text style={s.label}>{p ? `${p.nickname}${i === state.you ? ' (eu)' : ''}` : 'À espera de um amigo'}</Text>
      <Text style={s.body}>{p ? p.bot ? '◇ Bot · treino' : p.connected ? '● Pronto para jogar' : '○ Sem ligação · reservado' : '○ Livre'}</Text>
      {state.you === state.creator && (!p || p.bot) && <Button secondary title={p?.bot ? `Retirar bot do lugar ${i + 1}` : `Adicionar bot ao lugar ${i + 1}`} disabled={busy || connection !== 'ready'} onPress={() => void act({ type: p?.bot ? 'removeBot' : 'addBot', seat: i })} />}
    </View>)}</View>
    {state.you === state.creator ? <Button title="Começar partida" disabled={!ready || busy || connection !== 'ready'} onPress={() => void act({ type: 'start' })} /> : <Text style={[s.body, { textAlign: 'center' }]}>A aguardar que o anfitrião comece a partida.</Text>}
    <Text style={[s.body, { textAlign: 'center' }]}>Cada pessoa começa com 20 pontos. {state.format.mode === 'infinite' ? 'Pode continuar abaixo de zero.' : state.format.mode === 'competitive' ? `A competição termina às ${state.format.linesToWin * 4} vitórias.` : 'Ganha quem chegar a zero.'}</Text>
    <Restart state={state} />
  </>;
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
  const competitive = state.format.mode === 'competitive';
  const competitionComplete = state.competitionWinners.length > 0;
  const turnName = state.turn !== null ? state.players[state.turn]?.nickname : '';
  const last = state.completedTricks.at(-1);
  return <>
    {state.players.some(p => p && !p.connected) && <View style={s.notice}><Text style={s.body}>Há jogadores sem ligação. Os lugares estão reservados e nenhuma jogada é feita por eles. O anfitrião pode recomeçar a partida se não conseguirem voltar.</Text></View>}
    <TableArena state={state} />
    {!finished && <View style={[s.panel, width < 420 && { padding: 10 }, { gap: 12 }]}>
      <View style={s.header}><Text style={s.label}>A sua mão</Text><Text style={s.body}>{state.players[state.you]?.participating === false ? 'Ficou de fora desta mão' : 'Só visível para si'}</Text></View>
      <View style={[s.row, { justifyContent: 'center', gap: width < 420 ? 4 : 10, paddingTop: 6 }]}>{state.hand.map((card, index) => <MotionEntry key={`${state.gameNumber}-${state.handNumber}-${card.id}`} eventKey={`${state.gameNumber}-${state.handNumber}-${card.id}`} delay={index * 60} kind="deal"><PlayingCard card={card} compact={width < 420} selected={selected.includes(card.id)} legal={state.legalCardIds.includes(card.id)} disabled={!enabled || !mine || (!exchanging && !state.legalCardIds.includes(card.id))} onPress={() => {
        if (exchanging) setSelected(previous => previous.includes(card.id) ? previous.filter(id => id !== card.id) : previous.length < state.rules.exchangeLimit ? [...previous, card.id] : previous);
        else void act({ type: 'play', cardId: card.id });
      }} /></MotionEntry>)}</View>
      {state.phase === 'trumpSelection' && (mine ? <><Text style={s.body}>Escolha o trunfo com as suas três primeiras cartas. Receberá mais duas e terá de participar.</Text><View style={s.row}>{SUITS.map(suit => <Button key={suit} secondary title={`${suitSymbols[suit]} ${suitNames[suit]}`} disabled={!enabled} onPress={() => void act({ type: 'chooseTrump', suit })} />)}</View></> : <Text style={s.body}>{turnName} está a escolher o trunfo.</Text>)}
      {exchanging && (mine ? <><Text style={s.body}>Toque nas cartas que quer trocar (até {state.rules.exchangeLimit}). Pode participar sem trocar cartas.</Text><View style={s.row}><Button title={selected.length ? `Participar e trocar ${selected.length}` : 'Participar sem trocar'} disabled={!enabled} onPress={() => void act({ type: 'exchange', cardIds: selected })} />{state.canSitOut && <Button secondary title="Ficar de fora" disabled={!enabled} onPress={() => void act({ type: 'sitOut' })} />}</View>{!state.canSitOut && <Text style={s.body}>{state.trump === 'clubs' ? 'Com paus, todos têm de participar.' : 'Quem escolhe o trunfo tem de participar.'}</Text>}</> : <Text style={s.body}>A aguardar a decisão de {turnName}.</Text>)}
      {state.phase === 'trickPlay' && <Text style={s.body}>{mine ? 'Toque numa carta com contorno verde para jogar. Deve assistir, cortar e subir quando possível.' : state.players[state.you]?.participating === false ? 'Acompanhe a mão. A sua pontuação mantém-se.' : `É a vez de ${turnName}.`}</Text>}
    </View>}
    {finished && <View style={s.panel}><ScoreChart state={state} /></View>}
    {finished && <MotionEntry eventKey={`${state.handNumber}-${state.phase}`}><View style={s.panel}><Text style={s.heading}>{state.phase === 'matchComplete' ? competitive ? competitionComplete ? 'Competição concluída!' : 'Jogo concluído' : state.winners.length > 1 ? 'Vitória partilhada!' : 'Temos vencedor!' : 'Mão concluída'}</Text>
      {state.phase === 'matchComplete' && <Text style={s.body}>{state.winners.map(i => state.players[i]?.nickname).join(' e ')} {state.format.mode === 'infinite' ? state.winners.length > 1 ? 'terminaram com a menor pontuação.' : 'terminou com a menor pontuação.' : state.winners.length > 1 ? 'chegaram a zero.' : 'chegou a zero.'}</Text>}
      {competitionComplete && <Text style={s.label}>{state.competitionWinners.map(i => state.players[i]?.nickname).join(' e ')} {state.competitionWinners.length > 1 ? 'venceram a competição!' : 'venceu a competição!'}</Text>}
      {competitive && state.phase === 'matchComplete' && !competitionComplete && (state.you === state.creator ? <Button title="Jogo seguinte" disabled={!enabled} onPress={() => void act({ type: 'nextGame' })} /> : <Text style={s.body}>A aguardar que o anfitrião inicie o jogo seguinte.</Text>)}
      {state.players.map((p, i) => <View key={i} style={[s.header, styles.scoreRow]}><Text style={s.label}>{p!.nickname}{state.winners.includes(i) ? ' ★' : ''}</Text><Text style={s.body}>{p!.participating ? `${p!.tricks} vazas` : 'Ficou de fora'} · {state.scoreChanges[i] > 0 ? '+' : ''}{state.scoreChanges[i]} → <Text style={s.label}>{p!.score} pontos</Text></Text></View>)}
      {state.phase === 'handComplete' && (state.you === state.creator ? <Button title="Próxima mão" disabled={!enabled} onPress={() => void act({ type: 'nextHand' })} /> : <Text style={s.body}>A aguardar que o anfitrião dê início à próxima mão.</Text>)}
    </View></MotionEntry>}
    <FinishInfinite state={state} />
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
  return <><Button secondary title={state.format.mode === 'competitive' ? state.competitionWinners.length ? 'Nova competição' : 'Recomeçar competição' : state.phase === 'matchComplete' ? 'Nova partida' : 'Recomeçar partida'} disabled={busy || connection !== 'ready'} onPress={() => setConfirm(true)} />
    <Modal visible={confirm} transparent animationType={reduced ? 'none' : 'fade'} onRequestClose={() => setConfirm(false)}>
      <View style={styles.backdrop}><View style={[s.panel, { width: '100%', maxWidth: 440 }]}><Text style={s.heading}>Recomeçar a partida?</Text><Text style={s.body}>As pontuações, vitórias da competição e cartas serão apagadas. Todos voltam à sala de espera. Os lugares de quem está sem ligação ficam livres.</Text><Button title="Sim, recomeçar" onPress={() => { setConfirm(false); void act({ type: 'restart', confirmed: true }); }} /><Button secondary title="Continuar nesta partida" onPress={() => setConfirm(false)} /></View></View>
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
  scoreRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.line },
  backdrop: { flex: 1, backgroundColor: '#001b12aa', justifyContent: 'center', alignItems: 'center', padding: 20 },
});
