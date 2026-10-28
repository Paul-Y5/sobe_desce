import { useEffect, useRef } from 'react';
import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chat } from '../src/Chat';
import { useGame } from '../src/GameContext';
import { connectionMessage } from '../src/gameText';
import { OnboardingPrompt } from '../src/OnboardingPrompt';
import { Entry } from '../src/screens/Entry';
import { Lobby } from '../src/screens/Lobby';
import { Table } from '../src/screens/Table';
import { ScoreChartControl } from '../src/ScoreChart';
import { TableHud, TableTools } from '../src/TableArena';
import { breakpoint, color, space } from '../src/tokens';
import { Button, TextLink, s } from '../src/ui';

function HomeHeader() {
  return <View style={s.header}>
    <View><Text style={s.eyebrow}>À MESA COM AMIGOS</Text><Text accessibilityRole="header" aria-level={1} style={s.brand}>Sobe e Desce<Text style={{ color: color.green }}> ♣</Text></Text></View>
    <View style={[s.row, { gap: space.xl }]}><TextLink href="/account">Conta</TextLink><TextLink href="/rules">Como jogar ↗</TextLink></View>
  </View>;
}

function ConnectionNotice() {
  const { connection, reset, returnToGame } = useGame();
  if (connection === 'ready') return null;
  return <View style={s.notice}><Text style={s.label} accessibilityLiveRegion="polite">{connectionMessage(connection)}</Text>
    {connection === 'replaced' && <Button title="Voltar ao início" onPress={reset} />}
    {connection === 'inactive' && <Button title="Voltar à partida" onPress={returnToGame} />}
  </View>;
}

function ErrorNotice() {
  const { error, dismissError } = useGame();
  if (!error) return null;
  return <View style={s.notice}><Text accessibilityRole="alert" style={s.body}>{error}</Text><Button secondary title="Fechar aviso" onPress={dismissError} /></View>;
}

export default function Home() {
  const game = useGame();
  const { width } = useWindowDimensions();
  const snapshot = game.snapshot;
  const inGame = !!snapshot && snapshot.phase !== 'lobby';
  const scroll = useRef<ScrollView>(null);
  const dealKey = inGame ? `${snapshot.roomCode}-${snapshot.gameNumber}-${snapshot.handNumber}` : null;
  useEffect(() => {
    if (!dealKey) return;
    const frame = requestAnimationFrame(() => scroll.current?.scrollTo({ y: 0, animated: false }));
    return () => cancelAnimationFrame(frame);
  }, [dealKey]);
  return <SafeAreaView style={s.screen}>
    {inGame && <TableHud state={snapshot} />}
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={[s.page, width < breakpoint.narrow && { padding: space.md }, inGame && { gap: 14, paddingTop: space.md }]} keyboardShouldPersistTaps="handled">
      <OnboardingPrompt eligible={!snapshot && (game.connection === 'ready' || game.connection === 'reconnecting')} />
      {!inGame && <HomeHeader />}
      <ConnectionNotice />
      <ErrorNotice />
      {snapshot?.phase === 'lobby' && <ScoreChartControl state={snapshot} />}
      {snapshot ? snapshot.phase === 'lobby' ? <Lobby state={snapshot} /> : <Table state={snapshot} /> : <Entry />}
      {inGame && <TableTools state={snapshot} />}
      {snapshot && <Chat />}
      <Text style={[s.small, { textAlign: 'center' }]}>Quatro pessoas. Quarenta cartas. Um lugar à mesa.</Text>
    </ScrollView>
  </SafeAreaView>;
}
