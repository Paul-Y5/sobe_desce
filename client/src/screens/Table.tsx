import { useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { SUITS, type Snapshot } from '../../../shared/index';
import { useGame } from '../GameContext';
import { competitionLine, countLabel, handResultTitle, winnersLine } from '../gameText';
import { FinishInfinite } from '../MatchModes';
import { MotionEntry } from '../motion';
import { ScoreChart } from '../ScoreChart';
import { TableArena } from '../TableArena';
import { breakpoint, color, space } from '../tokens';
import { Button, Heading, PlayingCard, s, suitNames, suitSymbols } from '../ui';
import { Restart } from './Restart';

type Act = ReturnType<typeof useGame>['act'];

function DisconnectedNotice({ state }: { state: Snapshot }) {
  if (!state.players.some(p => p && !p.connected)) return null;
  return <View style={s.notice}><Text style={s.body}>Há jogadores sem ligação. Os lugares estão reservados e nenhuma jogada é feita por eles. O anfitrião pode recomeçar a partida se não conseguirem voltar.</Text></View>;
}

function TrumpPicker({ mine, turnName, enabled, act }: { mine: boolean; turnName: string; enabled: boolean; act: Act }) {
  if (!mine) return <Text style={s.body}>{turnName} está a escolher o trunfo.</Text>;
  return <>
    <Text style={s.body}>Escolha o trunfo com as suas três primeiras cartas. Receberá mais duas e terá de participar.</Text>
    <View style={s.row}>{SUITS.map(suit => <Button key={suit} secondary title={`${suitSymbols[suit]} ${suitNames[suit]}`} disabled={!enabled} onPress={() => void act({ type: 'chooseTrump', suit })} />)}</View>
  </>;
}

function ExchangePanel({ state, mine, turnName, selected, enabled, act }: { state: Snapshot; mine: boolean; turnName: string; selected: string[]; enabled: boolean; act: Act }) {
  if (!mine) return <Text style={s.body}>A aguardar a decisão de {turnName}.</Text>;
  return <>
    <Text style={s.body}>Toque nas cartas que quer trocar (até {state.rules.exchangeLimit}). Pode participar sem trocar cartas.</Text>
    <View style={s.row}>
      <Button title={selected.length ? `Participar e trocar ${selected.length}` : 'Participar sem trocar'} disabled={!enabled} onPress={() => void act({ type: 'exchange', cardIds: selected })} />
      {state.canSitOut && <Button secondary title="Ficar de fora" disabled={!enabled} onPress={() => void act({ type: 'sitOut' })} />}
    </View>
    {!state.canSitOut && <Text style={s.body}>{state.trump === 'clubs' ? 'Com paus, todos têm de participar.' : 'Quem escolhe o trunfo tem de participar.'}</Text>}
  </>;
}

function TrickHint({ state, mine, turnName }: { state: Snapshot; mine: boolean; turnName: string }) {
  const text = mine ? 'Toque numa carta com contorno verde e marca • para jogar. Deve assistir, cortar e subir quando possível.'
    : state.players[state.you]?.participating === false ? 'Acompanhe a mão. A sua pontuação mantém-se.' : `É a vez de ${turnName}.`;
  return <Text style={s.body}>{text}</Text>;
}

function HandPanel({ state, selected, onToggle, enabled, mine, exchanging, children }: { state: Snapshot; selected: string[]; onToggle: (id: string) => void; enabled: boolean; mine: boolean; exchanging: boolean; children: ReactNode }) {
  const { act } = useGame();
  const { width } = useWindowDimensions();
  const narrow = width < breakpoint.narrow;
  return <View style={[s.panel, narrow && { padding: 10 }, { gap: space.md }]}>
    <View style={s.header}><Text style={s.label}>A sua mão</Text><Text style={s.body}>{state.players[state.you]?.participating === false ? 'Ficou de fora desta mão' : 'Só visível para si'}</Text></View>
    <View style={[s.row, { justifyContent: 'center', gap: narrow ? space.sm : 10, paddingTop: 6 }]}>{state.hand.map((card, index) => {
      const key = `${state.gameNumber}-${state.handNumber}-${card.id}`;
      return <MotionEntry key={key} eventKey={key} delay={index * 60} kind="deal"><PlayingCard card={card} compact={narrow} selected={selected.includes(card.id)} legal={state.legalCardIds.includes(card.id)} disabled={!enabled || !mine || (!exchanging && !state.legalCardIds.includes(card.id))} onPress={() => exchanging ? onToggle(card.id) : void act({ type: 'play', cardId: card.id })} /></MotionEntry>;
    })}</View>
    {children}
  </View>;
}

function HandResult({ state, enabled, act }: { state: Snapshot; enabled: boolean; act: Act }) {
  const competitive = state.format.mode === 'competitive';
  const competitionComplete = state.competitionWinners.length > 0;
  const names = (seats: number[]) => seats.map(i => state.players[i]?.nickname ?? '');
  return <MotionEntry eventKey={`${state.handNumber}-${state.phase}`}><View style={s.panel}><Heading>{handResultTitle(state)}</Heading>
    {state.phase === 'matchComplete' && <Text style={s.body}>{winnersLine(names(state.winners), state.format.mode)}</Text>}
    {competitionComplete && <Text style={s.label}>{competitionLine(names(state.competitionWinners))}</Text>}
    {competitive && state.phase === 'matchComplete' && !competitionComplete && (state.you === state.creator ? <Button title="Jogo seguinte" disabled={!enabled} onPress={() => void act({ type: 'nextGame' })} /> : <Text style={s.body}>A aguardar que o anfitrião inicie o jogo seguinte.</Text>)}
    {state.players.map((p, i) => <View key={i} style={[s.header, styles.scoreRow]}><Text style={s.label}>{p!.nickname}{state.winners.includes(i) ? ' ★' : ''}</Text><Text style={s.body}>{p!.participating ? countLabel(p!.tricks, 'vaza', 'vazas') : 'Ficou de fora'} · {state.scoreChanges[i] > 0 ? '+' : ''}{state.scoreChanges[i]} → <Text style={s.label}>{p!.score} pontos</Text></Text></View>)}
    {state.phase === 'handComplete' && (state.you === state.creator ? <Button title="Próxima mão" disabled={!enabled} onPress={() => void act({ type: 'nextHand' })} /> : <Text style={s.body}>A aguardar que o anfitrião dê início à próxima mão.</Text>)}
  </View></MotionEntry>;
}

function LastTrick({ state }: { state: Snapshot }) {
  const last = state.completedTricks.at(-1);
  if (!last) return null;
  return <View style={[s.panel, { padding: space.lg }]}><Text style={s.label}>Última vaza · ganhou {state.players[last.winner]?.nickname}</Text><View style={s.row}>{last.plays.map(play => <View key={play.seat} style={{ alignItems: 'center', gap: 5 }}><PlayingCard card={play.card} small /><Text style={s.small}>{state.players[play.seat]?.nickname}</Text></View>)}</View></View>;
}

export function Table({ state }: { state: Snapshot }) {
  const { act, busy, connection } = useGame();
  const [selected, setSelected] = useState<string[]>([]);
  useEffect(() => setSelected([]), [state.revision]);
  const mine = state.turn === state.you;
  const enabled = !busy && connection === 'ready';
  const exchanging = state.phase === 'participationExchange';
  const finished = state.phase === 'handComplete' || state.phase === 'matchComplete';
  const turnName = (state.turn !== null ? state.players[state.turn]?.nickname : '') ?? '';
  const toggle = (id: string) => setSelected(previous => previous.includes(id) ? previous.filter(x => x !== id) : previous.length < state.rules.exchangeLimit ? [...previous, id] : previous);
  return <>
    <DisconnectedNotice state={state} />
    <TableArena state={state} />
    {!finished && <HandPanel state={state} selected={selected} onToggle={toggle} enabled={enabled} mine={mine} exchanging={exchanging}>
      {state.phase === 'trumpSelection' && <TrumpPicker mine={mine} turnName={turnName} enabled={enabled} act={act} />}
      {exchanging && <ExchangePanel state={state} mine={mine} turnName={turnName} selected={selected} enabled={enabled} act={act} />}
      {state.phase === 'trickPlay' && <TrickHint state={state} mine={mine} turnName={turnName} />}
    </HandPanel>}
    {finished && <View style={s.panel}><ScoreChart state={state} /></View>}
    {finished && <HandResult state={state} enabled={enabled} act={act} />}
    <FinishInfinite state={state} />
    <LastTrick state={state} />
    <Restart state={state} />
  </>;
}

const styles = StyleSheet.create({
  scoreRow: { paddingVertical: 10, borderBottomWidth: 1, borderColor: color.line },
});
