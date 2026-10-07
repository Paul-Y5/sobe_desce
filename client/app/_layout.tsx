import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from '../src/GameContext';
import { colors } from '../src/ui';
import { MotionProvider } from '../src/motion';

export default function Layout() {
  return <MotionProvider><GameProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.paper }, headerBackTitle: 'Voltar' }}>
    <Stack.Screen name="index" options={{ headerShown: false, title: 'Sobe e Desce' }} />
    <Stack.Screen name="rules" options={{ title: 'Como jogar', presentation: 'modal' }} />
    <Stack.Screen name="tutorial" options={{ title: 'Aprender a jogar' }} />
    <Stack.Screen name="+not-found" options={{ title: 'Página não encontrada' }} />
  </Stack></GameProvider></MotionProvider>;
}
