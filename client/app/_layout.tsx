import { DMSerifDisplay_400Regular } from '@expo-google-fonts/dm-serif-display';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from '../src/GameContext';
import { color } from '../src/tokens';
import { AccountProvider } from '../src/AccountContext';
import { MotionProvider } from '../src/motion';

export default function Layout() {
  // The display face never blocks rendering: until it loads (or if it fails) the system fallback is used.
  useFonts({ DMSerifDisplay_400Regular });
  return <MotionProvider><AccountProvider><GameProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: color.paper }, headerTintColor: color.ink, contentStyle: { backgroundColor: color.paper }, headerBackTitle: 'Voltar' }}>
    <Stack.Screen name="index" options={{ headerShown: false, title: 'Sobe e Desce' }} />
    <Stack.Screen name="account" options={{ title: 'Conta' }} />
    <Stack.Screen name="admin" options={{ title: 'Administração' }} />
    <Stack.Screen name="rules" options={{ title: 'Como jogar' }} />
    <Stack.Screen name="tutorial" options={{ title: 'Aprender a jogar' }} />
    <Stack.Screen name="+not-found" options={{ title: 'Página não encontrada' }} />
  </Stack></GameProvider></AccountProvider></MotionProvider>;
}
