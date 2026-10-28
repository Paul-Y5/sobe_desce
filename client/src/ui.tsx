import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { Link } from 'expo-router';
import { Animated, Platform, Pressable, StyleSheet, Text, View, type TextStyle, type ViewStyle } from 'react-native';
import type { Card, Suit } from '../../shared/index';
import { nativeDriver, useReducedMotion } from './motion';
import { color, fontFamily, fontSize, layout, radius, space } from './tokens';

export const colors = color;
export const suitNames: Record<Suit, string> = { clubs: 'Paus', diamonds: 'Ouros', hearts: 'Copas', spades: 'Espadas' };
export const suitSymbols: Record<Suit, string> = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
const rankNames: Record<string, string> = { A: 'Ás', K: 'Rei', J: 'Valete', Q: 'Dama' };
export function cardName(card: Card) { return `${rankNames[card.rank] ?? card.rank} de ${suitNames[card.suit]}`; }

/** Web-only keyboard focus ring; native platforms ignore it. */
const focusRing = (focused: boolean): ViewStyle | false => focused && Platform.OS === 'web' && ({ outlineWidth: 3, outlineStyle: 'solid', outlineColor: color.gold, outlineOffset: 2 } as ViewStyle);
function useFocus() {
  const [focused, setFocused] = useState(false);
  return { focused, onFocus: () => setFocused(true), onBlur: () => setFocused(false) };
}

export function Button({ title, onPress, disabled, secondary, selected, expanded, testID }: { title: string; onPress: () => void; disabled?: boolean; secondary?: boolean; selected?: boolean; expanded?: boolean; testID?: string }) {
  const focus = useFocus();
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!disabled, ...(selected === undefined ? {} : { selected }), ...(expanded === undefined ? {} : { expanded }) }} testID={testID} disabled={disabled} onPress={onPress} onFocus={focus.onFocus} onBlur={focus.onBlur} style={({ pressed }) => [s.button, secondary && s.secondary, disabled && s.disabled, pressed && { opacity: 0.8 }, focusRing(focus.focused)]}>
    <Text style={[s.buttonText, secondary && { color: color.green }]}>{title}</Text>
  </Pressable>;
}

/** Heading with a real semantic level so screen-reader users can jump between sections. */
export function Heading({ children, level = 2, style }: { children: ReactNode; level?: 1 | 2 | 3; style?: TextStyle | TextStyle[] }) {
  return <Text accessibilityRole="header" aria-level={level} style={[s.heading, style]}>{children}</Text>;
}

/** Navigation link with the minimum touch target and an explicit link role. */
export function TextLink({ href, children }: { href: ComponentProps<typeof Link>['href']; children: string }) {
  const focus = useFocus();
  return <Link href={href} asChild><Pressable accessibilityRole="link" onFocus={focus.onFocus} onBlur={focus.onBlur} style={StyleSheet.flatten([s.textLink, focusRing(focus.focused)])}><Text style={s.linkLabel}>{children}</Text></Pressable></Link>;
}

export function PlayingCard({ card, onPress, selected, legal, disabled, small, compact, decorative }: { card: Card; onPress?: () => void; selected?: boolean; legal?: boolean; disabled?: boolean; small?: boolean; compact?: boolean; decorative?: boolean }) {
  const reduced = useReducedMotion();
  const lift = useRef(new Animated.Value(0)).current;
  const [hovered, setHovered] = useState(false);
  const focus = useFocus();
  useEffect(() => {
    const target = selected ? -8 : 0;
    if (reduced) { lift.stopAnimation(); lift.setValue(target); return; }
    const animation = Animated.spring(lift, { toValue: target, speed: 28, bounciness: 3, useNativeDriver: nativeDriver, isInteraction: false });
    animation.start(); return () => animation.stop();
  }, [lift, selected, reduced]);
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const ink = red ? color.red : color.ink;
  const style: ViewStyle[] = [s.card, ...(compact ? [s.compactCard] : []), ...(small ? [s.smallCard] : []), ...(selected ? [s.selected] : []), ...(legal ? [s.legal] : [])];
  const corner = <><Text style={[s.cardRank, { color: ink }, (small || compact) && { fontSize: 17, lineHeight: 19 }]}>{card.rank}</Text><Text style={{ color: ink, fontSize: small ? 11 : 13, lineHeight: 14 }}>{suitSymbols[card.suit]}</Text></>;
  const content = <View pointerEvents="none" accessible={false} style={{ flex: 1 }}>
    <View style={s.cardCorner}>{corner}</View>
    <View style={s.cardFace}><Text style={[s.cardSuit, { color: ink }, (small || compact) && { fontSize: 25 }]}>{suitSymbols[card.suit]}</Text>{!small && !compact && ['K', 'Q', 'J'].includes(card.rank) && <Text style={{ color: ink, fontSize: 10, fontWeight: '700' }}>{rankNames[card.rank]}</Text>}</View>
    <View style={[s.cardCorner, { bottom: 0, right: 0, transform: [{ rotate: '180deg' }] }]}>{corner}</View>
    {(selected || legal) && <View style={[s.cardMark, selected && { backgroundColor: color.gold }]}><Text style={{ color: selected ? color.ink : color.white, fontSize: 12, fontWeight: '900' }}>{selected ? '✓' : '•'}</Text></View>}
  </View>;
  if (!onPress) return <View {...(decorative ? { 'aria-hidden': true, importantForAccessibility: 'no-hide-descendants' as const } : { accessibilityLabel: cardName(card) })} style={style}>{content}</View>;
  return <Animated.View style={{ transform: [{ translateY: lift }] }}><Pressable accessibilityRole="button" accessibilityLabel={cardName(card)} accessibilityHint={selected ? 'Selecionada para troca' : legal ? 'Carta permitida nesta jogada' : undefined} accessibilityState={{ selected: !!selected, disabled: !!disabled }} testID={`card-${card.id}`} disabled={disabled} onHoverIn={() => setHovered(true)} onHoverOut={() => setHovered(false)} onFocus={focus.onFocus} onBlur={focus.onBlur} onPress={onPress} style={({ pressed }) => [...style, disabled && { opacity: 0.8 }, !disabled && (pressed || hovered) && { backgroundColor: color.cardHover, borderColor: color.gold }, focusRing(focus.focused)]}>{content}</Pressable></Animated.View>;
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.paper },
  page: { width: '100%', maxWidth: layout.page, alignSelf: 'center', padding: space.xl, gap: space.xl, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: space.md },
  display: { fontFamily: fontFamily.display, fontWeight: '400' },
  brand: { color: color.ink, fontSize: 28, fontFamily: fontFamily.display, fontWeight: '400', letterSpacing: -0.3 },
  eyebrow: { color: color.muted, fontSize: fontSize.xs, fontWeight: '700', letterSpacing: 2 },
  heading: { color: color.ink, fontSize: 28, lineHeight: 34, fontFamily: fontFamily.display, fontWeight: '400', letterSpacing: -0.2 },
  body: { color: color.muted, fontSize: fontSize.md, lineHeight: 23 },
  small: { color: color.muted, fontSize: fontSize.xs, lineHeight: 18 },
  panel: { backgroundColor: color.white, borderRadius: radius.lg, padding: 22, gap: space.lg, borderWidth: 1, borderColor: color.line },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  label: { color: color.ink, fontSize: 14, fontWeight: '700' },
  textLink: { minHeight: layout.minTarget, minWidth: layout.minTarget, alignSelf: 'flex-start', justifyContent: 'center' },
  linkLabel: { color: color.ink, fontSize: 14, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: color.inputBorder, borderRadius: radius.md, padding: 14, fontSize: 17, color: color.ink, backgroundColor: color.inputBg, minHeight: 50 },
  button: { minHeight: 48, borderRadius: radius.md, paddingHorizontal: space.xl, paddingVertical: 13, justifyContent: 'center', alignItems: 'center', backgroundColor: color.green },
  secondary: { backgroundColor: color.secondaryBg, borderWidth: 1, borderColor: color.secondaryBorder },
  buttonText: { fontSize: fontSize.md, color: color.white, fontWeight: '700', textAlign: 'center' },
  disabled: { opacity: 0.45 },
  card: { width: 72, height: 106, backgroundColor: color.white, borderWidth: 2, borderColor: color.cardBorder, borderRadius: radius.md, padding: 5, shadowColor: color.shadow, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },
  smallCard: { width: 46, height: 68, padding: 3, borderRadius: radius.sm },
  compactCard: { width: 52, height: 86, padding: 4 },
  cardRank: { fontSize: 23, fontWeight: '800' },
  cardSuit: { fontSize: 32 },
  cardCorner: { position: 'absolute', alignItems: 'center' },
  cardFace: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardMark: { position: 'absolute', right: -4, top: -7, width: 18, height: 18, borderRadius: 9, backgroundColor: color.green, alignItems: 'center', justifyContent: 'center' },
  selected: { borderColor: color.gold, backgroundColor: color.cardSelected },
  legal: { borderColor: color.legal, borderWidth: 3 },
  notice: { backgroundColor: color.notice, padding: 14, borderRadius: radius.md, gap: 10 },
});
