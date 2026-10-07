import * as SecureStore from 'expo-secure-store';
import type { Session } from '../../shared/index';

const key = 'sobe-e-desce.session.v1';
export async function loadSession(): Promise<Session | null> {
  const raw = await SecureStore.getItemAsync(key);
  return raw ? JSON.parse(raw) as Session : null;
}
export async function saveSession(session: Session | null) {
  if (session) await SecureStore.setItemAsync(key, JSON.stringify(session));
  else await SecureStore.deleteItemAsync(key);
}
