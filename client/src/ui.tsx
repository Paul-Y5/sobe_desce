import { useEffect, useRef } from 'react';
import { Animated, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import type { Card, Suit } from '../../shared/index';
import { nativeDriver, useReducedMotion } from './motion';

export const colors = { ink: '#172c27', muted: '#60716a', paper: '#f5f2e9', green: '#125641', dark: '#0b382c', gold: '#e9bd68', line: '#d9dfd5', red: '#b33b3b', white: '#fffdf7' };
export const suitNames: Record<Suit, string> = { clubs: 'Paus', diamonds: 'Ouros', hearts: 'Copas', spades: 'Espadas' };
export const suitSymbols: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const rankNames: Record<string, string> = { A: 'Ás', K: 'Rei', J: 'Valete', Q: 'Dama' };
export function cardName(card: Card) { return `${rankNames[card.rank] ?? card.rank} de ${suitNames[card.suit]}`; }
export function Button({ title, onPress, disabled, secondary, testID }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; testID?: string }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled }} testID={testID} disabled={disabled} onPress={onPress} style={({ pressed }) => [s.button, secondary && s.secondary, disabled && s.disabled, pressed && { opacity: 0.8 }]}>
    <Text style={[s.buttonText, secondary && { color: colors.green }]}>{title}</Text>
  </Pressable>;
}
export function PlayingCard({ card, onPress, selected, legal, disabled, small, compact }: { card: Card; onPress?: () => void; selected?: boolean; legal?: boolean; disabled?: boolean; small?: boolean; compact?: boolean }) {
  const reduced = useReducedMotion();
  const lift = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const target = selected ? -8 : 0;
    if (reduced) { lift.stopAnimation(); lift.setValue(target); return; }
    const animation = Animated.spring(lift, { toValue: target, speed: 28, bounciness: 3, useNativeDriver: nativeDriver, isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [lift, selected, reduced]);
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const color = red ? colors.red : colors.ink;
  const style: ViewStyle[] = [s.card, ...(compact ? [s.compactCard] : []), ...(small ? [s.smallCard] : []), ...(selected ? [s.selected] : []), ...(legal ? [s.legal] : [])];
  const content = <><Text style={[s.cardRank, { color }, small && { fontSize: 16 }]}>{card.rank}</Text><Text style={[s.cardSuit, { color }, small && { fontSize: 24 }]}>{suitSymbols[card.suit]}</Text></>;
  if (!onPress) return <View accessibilityLabel={cardName(card)} style={style}>{content}</View>;
  return <Animated.View style={{ transform: [{ translateY: lift }] }}><Pressable accessibilityRole="button" accessibilityLabel={cardName(card)} accessibilityState={{ selected: !!selected, disabled: !!disabled }} testID={`card-${card.id}`} disabled={disabled} onPress={onPress} style={[...style, disabled && { opacity: 0.55 }]}>{content}</Pressable></Animated.View>;
}
export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  page: { width: '100%', maxWidth: 1120, alignSelf: 'center', padding: 20, gap: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  brand: { color: colors.ink, fontSize: 25, fontWeight: '800', letterSpacing: -0.7 },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  heading: { color: colors.ink, fontSize: 28, fontWeight: '800', letterSpacing: -0.7 },
  body: { color: colors.muted, fontSize: 15, lineHeight: 23 },
  panel: { backgroundColor: colors.white, borderRadius: 18, padding: 22, gap: 16, borderWidth: 1, borderColor: colors.line },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  label: { color: colors.ink, fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#a7b7ac', borderRadius: 10, padding: 14, fontSize: 17, color: colors.ink, backgroundColor: '#fff', minHeight: 50 },
  button: { minHeight: 48, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.green },
  secondary: { backgroundColor: '#e6eee6', borderWidth: 1, borderColor: '#c9d7c9' },
  buttonText: { fontSize: 15, color: colors.white, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  card: { width: 64, height: 94, backgroundColor: colors.white, borderWidth: 2, borderColor: '#d8ddcf', borderRadius: 9, padding: 7, justifyContent: 'space-between' },
  smallCard: { width: 46, height: 64, padding: 5 },
  compactCard: { width: 52, height: 82, padding: 6 },
  cardRank: { fontSize: 23, fontWeight: '800' },
  cardSuit: { fontSize: 33, alignSelf: 'flex-end' },
  selected: { borderColor: colors.gold, backgroundColor: '#fff4cf' },
  legal: { borderColor: '#6dcc8c', borderWidth: 3 },
  notice: { backgroundColor: '#fff0d5', padding: 14, borderRadius: 10, gap: 10 },
});
