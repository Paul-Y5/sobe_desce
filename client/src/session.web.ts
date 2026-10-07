import type { Session } from '../../shared/index';

// Per-tab storage allows four independent guests in separate tabs and survives reloads.
// This guest seat credential is readable by JS: no third-party scripts or HTML injection.
const key = 'sobe-e-desce.session.v1';
export async function loadSession(): Promise<Session | null> {
  if (typeof window === 'undefined') return null;
  const raw = window.sessionStorage.getItem(key);
  return raw ? JSON.parse(raw) as Session : null;
}
export async function saveSession(session: Session | null) {
  if (session) window.sessionStorage.setItem(key, JSON.stringify(session));
  else window.sessionStorage.removeItem(key);
}
