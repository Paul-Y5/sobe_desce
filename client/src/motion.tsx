import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const ReducedMotion = createContext({ reduced: true, systemReduced: true, disabled: false, setDisabled: (_: boolean) => {} });
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true);
  const [disabled, setDisabled] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription?.remove(); };
  }, []);
  return <ReducedMotion.Provider value={{ reduced: reduced || disabled, systemReduced: reduced, disabled, setDisabled }}>{children}</ReducedMotion.Provider>;
}
export const useMotionSettings = () => useContext(ReducedMotion);
export const useReducedMotion = () => useMotionSettings().reduced;
export const nativeDriver = Platform.OS !== 'web';

/** Presentation only: never delays, queues or acknowledges a game action. */
export function MotionEntry({ children, eventKey, delay = 0, kind = 'notice', direction = 'bottom', style }: {
  children: ReactNode; eventKey: string | number; delay?: number; kind?: 'deal' | 'play' | 'notice'; direction?: 'top' | 'left' | 'right' | 'bottom'; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const entranceDelay = useRef(delay).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: kind === 'deal' ? 420 : kind === 'play' ? 300 : 240, delay: entranceDelay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [progress, eventKey, reduced, entranceDelay, kind]);
  return <Animated.View style={[style, {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'deal' ? -50 : kind === 'play' ? direction === 'top' ? -50 : direction === 'bottom' ? 50 : 0 : 8, 0] }) },
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'deal' ? -30 : kind === 'play' ? direction === 'left' ? -65 : direction === 'right' ? 65 : 0 : 0, 0] }) },
      { rotate: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'deal' ? '-9deg' : kind === 'play' ? '6deg' : '0deg', '0deg'] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'notice' ? 0.98 : 0.85, 1] }) },
    ],
  }]}>{children}</Animated.View>;
}
