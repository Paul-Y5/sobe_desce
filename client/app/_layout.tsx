import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GameProvider } from '../src/GameContext';
import { colors } from '../src/ui';
import { AccountProvider } from '../src/AccountContext';
import { MotionProvider } from '../src/motion';

export default function Layout() {
  return <MotionProvider><AccountProvider><GameProvider><StatusBar style="dark" /><Stack screenOptions={{ headerStyle: { backgroundColor: colors.paper }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.paper }, headerBackTitle: 'Voltar' }}>
    <Stack.Screen name="index" options={{ headerShown: false, title: 'Sobe e Desce' }} />
    <Stack.Screen name="account" options={{ title: 'Conta' }} />
    <Stack.Screen name="admin" options={{ title: 'Administração' }} />
    <Stack.Screen name="rules" options={{ title: 'Como jogar' }} />
    <Stack.Screen name="tutorial" options={{ title: 'Aprender a jogar' }} />
    <Stack.Screen name="+not-found" options={{ title: 'Página não encontrada' }} />
  </Stack></GameProvider></AccountProvider></MotionProvider>;
}
