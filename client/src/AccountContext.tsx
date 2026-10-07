import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { readAccountToken, storeAccountToken } from './accountStorage';

type User = { id: string; name: string; email: string; role: string };
const baseURL = process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001';
type Context = { user: User | null; generation: number; ready: boolean; request: (path: string, body?: unknown) => Promise<any>; refresh: () => Promise<void>; signOut: () => Promise<void> };
const Context = createContext<Context | null>(null);
export function AccountProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null), [generation, setGeneration] = useState(0), [ready, setReady] = useState(false);
  async function request(path: string, body?: unknown) {
    const token = await readAccountToken();
    const response = await fetch(baseURL + path, { method: body ? 'POST' : 'GET', credentials: 'include', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
    const data = await response.json();
    if (!response.ok) {
      if (response.status === 401) setUser(null);
      throw new Error(response.status === 429 ? 'Demasiadas tentativas. Aguarde um minuto.' : path.includes('/api/auth/') ? 'Não foi possível entrar ou criar a conta. Verifique os dados; a palavra-passe deve ter pelo menos 12 caracteres.' : data.error ?? 'Não foi possível concluir o pedido.');
    }
    const nextToken = response.headers.get('set-auth-token');
    if (nextToken) await storeAccountToken(nextToken);
    return data;
  }
  async function refresh() {
    try { const data = await request('/api/me'); setUser(data.user); }
    catch { setUser(null); }
    finally { setReady(true); setGeneration(n => n + 1); }
  }
  async function signOut() { await request('/api/auth/sign-out', {}); await storeAccountToken(null); setUser(null); setGeneration(n => n + 1); }
  useEffect(() => { void refresh(); }, []);
  return <Context.Provider value={{ user, generation, ready, request, refresh, signOut }}>{children}</Context.Provider>;
}
export function useAccount() { const value = useContext(Context); if (!value) throw new Error('AccountProvider missing'); return value; }
