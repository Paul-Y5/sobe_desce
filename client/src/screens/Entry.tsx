import { useState } from 'react';
import { StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useGame } from '../GameContext';
import { breakpoint, color, fontFamily, radius, space } from '../tokens';
import { Button, Heading, PlayingCard, s } from '../ui';

const heroCards = { left: { id: 'clubs-A', rank: 'A', suit: 'clubs' }, middle: { id: 'hearts-7', rank: '7', suit: 'hearts' }, right: { id: 'spades-K', rank: 'K', suit: 'spades' } } as const;

function Hero({ narrow, stacked }: { narrow: boolean; stacked: boolean }) {
  return <View style={[styles.hero, stacked && styles.natural, narrow && styles.heroNarrow]}>
    <Text style={[s.eyebrow, { color: color.heroEyebrow }]}>O JOGO CONTINUA. ONDE ESTIVEREM.</Text>
    <Text accessibilityRole="header" aria-level={1} style={[styles.heroTitle, narrow && { fontSize: 34, lineHeight: 40 }]}>A amizade sobe.{'\n'}A pontuação desce.</Text>
    <Text style={styles.heroText}>Junte três amigos, escolha o trunfo e conquiste as vazas. O primeiro a chegar a zero ganha.</Text>
    <View accessibilityElementsHidden aria-hidden style={[s.row, { marginVertical: narrow ? space.sm : space.xl, justifyContent: 'center', gap: narrow ? 10 : space.lg }]}>
      <View style={{ transform: [{ rotate: '-12deg' }], marginTop: space.md }}><PlayingCard decorative small={narrow} card={heroCards.left} /></View>
      <PlayingCard decorative small={narrow} card={heroCards.middle} />
      <View style={{ transform: [{ rotate: '12deg' }], marginTop: space.md }}><PlayingCard decorative small={narrow} card={heroCards.right} /></View>
    </View>
    <View style={styles.heroFooter}><Text style={styles.heroText}>4 jogadores</Text><Text style={styles.heroText}>5 vazas por mão</Text><Text style={styles.heroText}>20 → 0</Text></View>
  </View>;
}

export function Entry() {
  const { enter, busy, connection } = useGame();
  const [nickname, setNickname] = useState(''), [code, setCode] = useState('');
  const { width } = useWindowDimensions();
  const disabled = !nickname.trim() || busy || connection !== 'ready';
  const canJoin = !disabled && code.length === 6;
  const stacked = width < breakpoint.wide;
  return <View style={[styles.home, stacked && { flexDirection: 'column' }]}>
    <Hero narrow={width < breakpoint.narrow} stacked={stacked} />
    <View style={[s.panel, styles.entry, stacked && styles.natural]}>
      <Heading>Puxe uma cadeira.</Heading><Text style={s.body}>Sem conta. Basta um nome e boa companhia.</Text>
      <Text style={s.label}>O seu nome</Text><TextInput accessibilityLabel="O seu nome" testID="nickname" placeholder="Como lhe chamamos?" placeholderTextColor={color.muted} value={nickname} onChangeText={setNickname} maxLength={24} style={s.input} autoComplete="nickname" returnKeyType="go" onSubmitEditing={() => { if (!disabled) void enter(nickname); }} />
      <Button title={busy ? 'A entrar…' : 'Criar sala'} disabled={disabled} onPress={() => void enter(nickname)} />
      <View style={styles.divider} accessibilityElementsHidden aria-hidden><View style={styles.line} /><Text style={s.body}>ou entre na sala dos amigos</Text><View style={styles.line} /></View>
      <Text style={s.label}>Código da sala</Text><TextInput accessibilityLabel="Código da sala" testID="room-code-input" placeholder="ABC234" placeholderTextColor={color.muted} value={code} onChangeText={v => setCode(v.toUpperCase().replace(/[^A-Z2-9]/g, ''))} maxLength={6} autoCapitalize="characters" autoCorrect={false} returnKeyType="go" onSubmitEditing={() => { if (canJoin) void enter(nickname, code); }} style={[s.input, { letterSpacing: 5 }]} />
      <Button title="Entrar na sala" secondary disabled={!canJoin} onPress={() => void enter(nickname, code)} />
      <Text style={s.small}>O seu lugar fica reservado se perder a ligação. No navegador, mantenha este separador para regressar à partida.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  home: { flexDirection: 'row', gap: space.xl, alignItems: 'stretch' },
  hero: { flex: 1.15, borderRadius: radius.xl, padding: 30, backgroundColor: color.dark, gap: 18, justifyContent: 'center', minHeight: 430 },
  /** Proportional flex only makes sense side by side; stacked, each block takes its content height. */
  natural: { flexGrow: 0, flexShrink: 0, flexBasis: 'auto' },
  heroNarrow: { padding: space.xl, gap: space.md, minHeight: 0 },
  heroTitle: { color: color.white, fontSize: 48, lineHeight: 54, fontFamily: fontFamily.display, fontWeight: '400', letterSpacing: -0.5 },
  heroText: { color: color.heroText, fontSize: 16, lineHeight: 25 },
  heroFooter: { borderTopWidth: 1, borderColor: color.heroRule, paddingTop: 18, flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 10 },
  entry: { flex: 1, justifyContent: 'center' },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: space.sm },
  line: { flex: 1, height: 1, backgroundColor: color.line },
});
