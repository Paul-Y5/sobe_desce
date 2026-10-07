import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { io, type Socket } from 'socket.io-client';
import type { ClientEvents, Reply, RoomAction, ServerEvents, Session, Snapshot } from '../../shared/index';
import { useAccount } from './AccountContext';
import { readAccountToken } from './accountStorage';
import { loadSession, saveSession } from './session';

type Connection = 'connecting' | 'ready' | 'reconnecting' | 'replaced' | 'inactive';
type Context = {
  snapshot: Snapshot | null; connection: Connection; busy: boolean; error: string;
  clock: { serverTime: number; receivedAt: number };
  returnToGame: () => void;
  enter: (nickname: string, roomCode?: string) => Promise<void>;
  act: (action: RoomAction) => Promise<void>; dismissError: () => void; reset: () => void;
};
const GameContext = createContext<Context | null>(null);
type GameSocket = Socket<ServerEvents, ClientEvents>;
const inactivityMessage = 'Já passaram cinco minutos. Tem mais um minuto para decidir antes de ser desligado por inatividade.';
export function GameProvider({ children }: { children: ReactNode }) {
  const account = useAccount();
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [clock, setClock] = useState({ serverTime: 0, receivedAt: 0 });
  const [connection, setConnection] = useState<Connection>('connecting');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const socket = useRef<GameSocket | null>(null), session = useRef<Session | null>(null);
  const pending = useRef(false), counter = useRef(0);
  const explicitReturn = useRef(false);
  const deadline = useRef<number | null>(null);
  const requestPrefix = useRef(`${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
  useEffect(() => {
    if (!account.ready) return;
    let disposed = false;
    const s: GameSocket = io(process.env.EXPO_PUBLIC_SERVER_URL || 'http://localhost:3001', { autoConnect: false, withCredentials: true, auth: callback => { void readAccountToken().then(accountToken => callback({ accountToken })).catch(() => callback({})); } });
    socket.current = s;
    s.on('snapshot', next => {
      if (deadline.current !== next.turnDeadline) setError(current => current === inactivityMessage ? '' : current);
      deadline.current = next.turnDeadline;
      setClock({ serverTime: next.serverTime, receivedAt: performance.now() });
      setSnapshot(next);
    });
    s.on('accountRevoked', () => { setConnection('replaced'); setError('A sessão da conta terminou. Entre novamente na conta.'); });
    s.on('replaced', () => {
      setConnection('replaced');
      setError('Esta sessão foi aberta noutra ligação. Pode voltar ao início para criar uma nova sessão.');
    });
    s.on('inactivityWarning', () => setError(inactivityMessage));
    s.on('inactive', () => { setConnection('inactive'); setError('Foi desligado por inatividade. O seu lugar e as suas cartas continuam reservados.'); });
    s.on('disconnect', reason => { if (reason !== 'io server disconnect') setConnection('reconnecting'); });
    s.on('connect_error', () => setConnection('reconnecting'));
    s.on('connect', () => {
      if (!session.current) { setConnection('ready'); return; }
      s.timeout(8000).emit('resume', { ...session.current, returnFromInactivity: explicitReturn.current }, (timeout: Error | null, reply: Reply) => {
        if (disposed) return;
        if (timeout) { s.disconnect(); s.connect(); return; }
        explicitReturn.current = false;
        if (!reply.ok) {
          if (reply.code === 'INACTIVE_SESSION') { setConnection('inactive'); setError(reply.message); return; }
          session.current = null; setSnapshot(null); setError(reply.message);
          void saveSession(null).catch(() => {});
        }
        setConnection('ready');
      });
    });
    void loadSession().then(saved => { session.current = saved; }).catch(() => {
      setError('Não foi possível recuperar a sessão guardada. Pode entrar novamente.');
    }).finally(() => { if (!disposed) s.connect(); });
    return () => { disposed = true; s.removeAllListeners(); s.disconnect(); };
  }, [account.ready, account.generation]);
  async function enter(nickname: string, roomCode?: string) {
    const s = socket.current;
    if (!s?.connected || pending.current || session.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const reply = await new Promise<Reply<Session>>((resolve, reject) => {
        s.timeout(8000).emit(roomCode ? 'join' : 'create', { nickname: nickname.trim(), ...(roomCode ? { roomCode: roomCode.trim().toUpperCase() } : {}) }, (err: Error | null, reply: Reply<Session>) => err ? reject(err) : resolve(reply));
      });
      if (!reply.ok) { setError(reply.message); return; }
      session.current = reply.data;
      try { await saveSession(reply.data); }
      catch { setError('A sessão funciona, mas não ficou guardada. Não feche esta aplicação durante a partida.'); }
    } catch {
      setError('Sem resposta do servidor. A ligação vai ser restabelecida.');
      s.disconnect(); s.connect();
    } finally { pending.current = false; setBusy(false); }
  }
  async function act(action: RoomAction) {
    const s = socket.current;
    if (!s?.connected || !snapshot || connection !== 'ready' || pending.current) return;
    pending.current = true; setBusy(true); setError('');
    try {
      const reply = await new Promise<Reply>((resolve, reject) => s.timeout(8000).emit('command', {
        requestId: `${requestPrefix.current}-${++counter.current}`, expectedRevision: snapshot.revision, action,
      }, (err: Error | null, reply: Reply) => err ? reject(err) : resolve(reply)));
      if (!reply.ok) setError(reply.message);
    } catch {
      setError('Não recebemos confirmação. A recuperar o estado da mesa…');
      s.disconnect(); s.connect();
    } finally { pending.current = false; setBusy(false); }
  }
  function reset() {
    session.current = null; setSnapshot(null); setError(''); setConnection('connecting');
    void saveSession(null).catch(() => {});
    socket.current?.disconnect(); socket.current?.connect();
  }
  function returnToGame() {
    explicitReturn.current = true; setError(''); setConnection('reconnecting');
    socket.current?.disconnect(); socket.current?.connect();
  }
  return <GameContext.Provider value={{ snapshot, clock, connection, busy, error, enter, act, dismissError: () => setError(''), reset, returnToGame }}>{children}</GameContext.Provider>;
}
export function useGame() {
  const value = useContext(GameContext);
  if (!value) throw new Error('GameProvider missing');
  return value;
}
