import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, type StyleProp, type ViewStyle } from 'react-native';

const ReducedMotion = createContext(true);
export function MotionProvider({ children }: { children: ReactNode }) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription?.remove(); };
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}
export const useReducedMotion = () => useContext(ReducedMotion);
export const nativeDriver = Platform.OS !== 'web';

/** Presentation only: never delays, queues or acknowledges a game action. */
export function MotionEntry({ children, eventKey, delay = 0, kind = 'notice', style }: {
  children: ReactNode; eventKey: string | number; delay?: number; kind?: 'deal' | 'play' | 'notice'; style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  const progress = useRef(new Animated.Value(1)).current;
  const entranceDelay = useRef(delay).current;
  useEffect(() => {
    progress.stopAnimation();
    if (reduced) { progress.setValue(1); return; }
    progress.setValue(0);
    const animation = Animated.timing(progress, { toValue: 1, duration: kind === 'deal' ? 380 : 240, delay: entranceDelay, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver, isInteraction: false });
    animation.start();
    return () => animation.stop();
  }, [progress, eventKey, reduced, entranceDelay, kind]);
  return <Animated.View style={[style, {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'deal' ? -35 : kind === 'play' ? 28 : 8, 0] }) },
      { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'deal' ? -24 : 0, 0] }) },
      { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [kind === 'notice' ? 0.98 : 0.85, 1] }) },
    ],
  }]}>{children}</Animated.View>;
}
