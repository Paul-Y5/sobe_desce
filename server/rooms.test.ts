import { afterEach, describe, expect, it } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createServer } from './rooms.js';
import type { ClientEvents, Command, Reply, ServerEvents, Session, Snapshot } from '../shared/index.js';

type Client = Socket<ServerEvents, ClientEvents>;
const cleanup: (() => Promise<unknown> | void)[] = [];
afterEach(async () => { for (const close of cleanup.reverse()) await close(); cleanup.length = 0; });
async function setup(options: Parameters<typeof createServer>[0] = {}) {
  const server = createServer({ origins: ['http://localhost:8081'], rateLimit: 10000, ...options });
  cleanup.push(() => server.close());
  const url = await server.listen(0);
  async function connect() {
    const socket: Client = io(url, { transports: ['websocket'], forceNew: true, reconnection: false });
    cleanup.push(() => { socket.disconnect(); });
    const snapshots: Snapshot[] = [];
    socket.on('snapshot', s => snapshots.push(s));
    await new Promise<void>((resolve, reject) => { socket.on('connect', resolve); socket.on('connect_error', reject); });
    return { socket, snapshots, get state() { return snapshots.at(-1)!; } };
  }
  return { server, connect };
}
async function enter(c: Awaited<ReturnType<Awaited<ReturnType<typeof setup>>['connect']>>, code?: string) {
  const result = await new Promise<Reply<Session>>(resolve => c.socket.emit(code ? 'join' : 'create', { nickname: `Pessoa ${code ? Math.random().toString().slice(2, 6) : 'A'}`, ...(code ? { roomCode: code } : {}) }, resolve));
  if (!result.ok) throw new Error(result.message);
  return result.data;
}
let requestNumber = 0;
function send(c: { socket: Client; state: Snapshot }, action: Command['action'], overrides: Partial<Command> = {}) {
  return new Promise<Reply>(resolve => c.socket.emit('command', { requestId: `request-${++requestNumber}`, expectedRevision: c.state.revision, action, ...overrides }, resolve));
}
async function waitFor(predicate: () => boolean) {
  await expect.poll(predicate, { timeout: 3000, interval: 10 }).toBe(true);
}

describe('authoritative room server', () => {
  it('warns once at five minutes, disconnects at six, reserves cards and requires explicit return', async () => {
    let now = 1_800_000_000_000;
    const jobs = new Set<{ at: number; run: () => void }>();
    const { connect } = await setup({ now: () => now, schedule: (run, delay) => {
      const job = { at: now + delay, run }; jobs.add(job); return () => { jobs.delete(job); };
    } });
    function advance(ms: number) {
      const target = now + ms;
      for (;;) {
        const next = [...jobs].filter(j => j.at <= target).sort((a, b) => a.at - b.at)[0];
        if (!next) break;
        jobs.delete(next); now = next.at; next.run();
      }
      now = target;
    }
    const clients = await Promise.all(Array.from({ length: 4 }, () => connect()));
    const sessions = [await enter(clients[0])];
    for (let i = 1; i < 4; i++) sessions.push(await enter(clients[i], sessions[0].roomCode));
    await waitFor(() => clients.every(c => c.state?.players.every(Boolean)));
    let warnings = 0, expulsions = 0;
    clients[1].socket.on('inactivityWarning', () => warnings++);
    clients[1].socket.on('inactive', () => expulsions++);
    await send(clients[0], { type: 'start' });
    await waitFor(() => clients.every(c => c.state.phase === 'trumpSelection'));
    const hand = clients[1].state.hand, revision = clients[0].state.revision;
    advance(299_999);
    expect(warnings).toBe(0);
    advance(1);
    await waitFor(() => warnings === 1);
    expect(clients[0].state.revision).toBe(revision);
    advance(59_999);
    expect(clients[1].socket.connected).toBe(true);
    advance(1);
    await waitFor(() => expulsions === 1 && !clients[1].socket.connected && clients[0].state.players[1]?.connected === false);
    expect(warnings).toBe(1);
    expect(clients[0].state.phase).toBe('trumpSelection');
    expect(clients[0].state.turn).toBe(1);
    expect(clients[0].state.players[1]?.inactive).toBe(true);
    expect(clients[0].state.players.map(p => p!.score)).toEqual([20, 20, 20, 20]);
    const returning = await connect();
    expect(await new Promise(resolve => returning.socket.emit('resume', sessions[1], resolve))).toMatchObject({ code: 'INACTIVE_SESSION' });
    expect(await new Promise(resolve => returning.socket.emit('resume', { ...sessions[1], returnFromInactivity: true }, resolve))).toMatchObject({ ok: true });
    expect(returning.state.hand).toEqual(hand);
    expect(returning.state.turnDeadline).toBe(now + 300_000);
    expect(returning.state.players[1]?.inactive).toBe(false);
    let freshWarnings = 0;
    returning.socket.on('inactivityWarning', () => freshWarnings++);
    advance(290_000);
    expect(await send(returning, { type: 'chooseTrump', suit: 'hearts' })).toMatchObject({ ok: true });
    advance(20_000); // The old warning timer must have been cancelled.
    expect(freshWarnings).toBe(0);
    await waitFor(() => clients[0].state.phase === 'participationExchange');
    expect(await send(clients[0], { type: 'restart', confirmed: true })).toMatchObject({ ok: true });
    expect(jobs.size).toBe(0);
    advance(360_000);
    expect(returning.socket.connected).toBe(true);
  });
  it('keeps the five-minute deadline through rejected actions, reconnect and expiry; renews it on each decision', async () => {
    let now = 1_800_000_000_000;
    const { connect } = await setup({ now: () => now });
    const clients = await Promise.all(Array.from({ length: 4 }, () => connect()));
    const sessions = [await enter(clients[0])];
    for (let i = 1; i < 4; i++) sessions.push(await enter(clients[i], sessions[0].roomCode));
    await waitFor(() => clients.every(c => c.state?.players.every(Boolean)));
    expect(clients[0].state.turnDeadline).toBeNull();
    expect(await send(clients[0], { type: 'start' })).toMatchObject({ ok: true });
    await waitFor(() => clients.every(c => c.state.phase === 'trumpSelection'));
    const deadline = now + 300_000;
    expect(clients.map(c => c.state.turnDeadline)).toEqual(Array(4).fill(deadline));
    expect(clients[0].state.serverTime).toBe(now);
    now += 240_000;
    expect(await send(clients[0], { type: 'chooseTrump', suit: 'spades' })).toMatchObject({ code: 'NOT_YOUR_TURN' });
    expect(clients[0].state.turnDeadline).toBe(deadline);
    const originalHand = clients[1].state.hand;
    clients[1].socket.disconnect();
    await waitFor(() => clients[0].state.players[1]?.connected === false);
    now += 61_000;
    clients[1] = await connect();
    expect(await new Promise(resolve => clients[1].socket.emit('resume', sessions[1], resolve))).toMatchObject({ ok: true });
    expect(clients[1].state.turnDeadline).toBe(deadline);
    expect(clients[1].state.serverTime).toBeGreaterThan(deadline);
    expect(clients[1].state.phase).toBe('trumpSelection');
    expect(clients[1].state.turn).toBe(1);
    expect(clients[1].state.hand).toEqual(originalHand);
    expect(clients[1].state.players.map(p => p!.score)).toEqual([20, 20, 20, 20]);
    expect(await send(clients[1], { type: 'chooseTrump', suit: 'spades' })).toMatchObject({ ok: true });
    expect(clients[1].state.turnDeadline).toBe(now + 300_000);
    now += 1_000;
    expect(await send(clients[1], { type: 'exchange', cardIds: [] })).toMatchObject({ ok: true });
    for (const seat of [2, 3, 0]) {
      await waitFor(() => clients[seat].state.turn === seat);
      now += 1_000;
      expect(await send(clients[seat], { type: 'sitOut' })).toMatchObject({ ok: true });
    }
    await waitFor(() => clients[1].state.phase === 'trickPlay');
    for (let i = 0; i < 5; i++) {
      now += 1_000;
      expect(await send(clients[1], { type: 'play', cardId: clients[1].state.legalCardIds[0] })).toMatchObject({ ok: true });
      expect(clients[1].state.turnDeadline).toBe(i === 4 ? null : now + 300_000);
    }
    await waitFor(() => clients[0].state.phase === 'handComplete');
    expect(await send(clients[0], { type: 'restart', confirmed: true })).toMatchObject({ ok: true });
    expect(clients[0].state.turnDeadline).toBeNull();
  });
  it('four independent clients finish five tricks with private snapshots, duplicate rejection and reconnection', async () => {
    const { connect } = await setup();
    const clients = await Promise.all(Array.from({ length: 4 }, () => connect()));
    const sessions = [await enter(clients[0])];
    for (let i = 1; i < 4; i++) sessions.push(await enter(clients[i], sessions[0].roomCode));
    await waitFor(() => clients.every(c => c.state?.players.every(Boolean)));
    expect((await send(clients[1], { type: 'start' })).ok).toBe(false);
    expect((await send(clients[0], { type: 'start' })).ok).toBe(true);
    await waitFor(() => clients.every(c => c.state?.phase === 'trumpSelection'));
    for (const [i, c] of clients.entries()) {
      expect(c.state.you).toBe(i);
      expect(c.state.hand).toHaveLength(3);
      expect(JSON.stringify(c.state)).not.toContain('token');
      expect(c.state).not.toHaveProperty('deck');
      expect(c.state.players.every(p => !p || !('hand' in p))).toBe(true);
      for (const s of sessions) expect(JSON.stringify(c.snapshots)).not.toContain(s.token);
    }
    expect(new Set(clients.flatMap(c => c.state.hand.map(card => card.id))).size).toBe(12);
    const chooser = clients[1];
    const rev = chooser.state.revision;
    expect((await send(clients[2], { type: 'chooseTrump', suit: 'hearts' })).ok).toBe(false);
    expect((await send(chooser, { type: 'chooseTrump', suit: 'hearts' }, { expectedRevision: rev - 1 })).ok).toBe(false);
    expect(chooser.state.revision).toBe(rev);
    const id = 'unique-trump-request';
    expect((await send(chooser, { type: 'chooseTrump', suit: 'hearts' }, { requestId: id })).ok).toBe(true);
    expect(await send(chooser, { type: 'chooseTrump', suit: 'hearts' }, { requestId: id, expectedRevision: rev })).toMatchObject({ ok: false, code: 'DUPLICATE' });
    await waitFor(() => clients.every(c => c.state.phase === 'participationExchange'));
    clients[2].socket.disconnect();
    await waitFor(() => clients[0].state.players[2]?.connected === false);
    const replacement = await connect();
    const resumed = await new Promise<Reply>(resolve => replacement.socket.emit('resume', sessions[2], resolve));
    expect(resumed.ok).toBe(true);
    expect(replacement.state.you).toBe(2);
    expect(replacement.state.hand).toEqual(clients[2].state.hand);
    clients[2] = replacement;
    await waitFor(() => clients.every(c => c.state.players[2]?.connected === true));
    for (const seat of [1, 2, 3, 0]) {
      await waitFor(() => clients[seat].state.turn === seat);
      expect((await send(clients[seat], { type: 'exchange', cardIds: clients[seat].state.hand.slice(0, 2).map(c => c.id) })).ok).toBe(true);
    }
    await waitFor(() => clients.every(c => c.state.phase === 'trickPlay'));
    const before = clients[1].state.revision;
    expect(await send(clients[1], { type: 'play', cardId: 'not-owned' })).toMatchObject({ ok: false, code: 'ILLEGAL_CARD' });
    expect(clients[1].state.revision).toBe(before);
    for (let n = 0; n < 20; n++) {
      const reference = clients[0].state;
      const active = clients[reference.turn!];
      await waitFor(() => active.state.revision === reference.revision);
      expect((await send(active, { type: 'play', cardId: active.state.legalCardIds[0] })).ok).toBe(true);
      await waitFor(() => clients.every(c => c.state.revision > reference.revision));
    }
    expect(clients[0].state.phase).toBe('handComplete');
    expect(clients[0].state.completedTricks).toHaveLength(5);
    expect(clients[0].state.players.reduce((n, p) => n + p!.tricks, 0)).toBe(5);
    for (const p of clients[0].state.players) expect(p!.score).toBe(p!.tricks ? 20 - 2 * p!.tricks : 30);
    expect((await send(clients[0], { type: 'nextHand' })).ok).toBe(true);
    expect(clients[0].state.dealer).toBe(1);
  });

  it('validates entry, authorization, takeover and confirmed restart releasing disconnected seats', async () => {
    const { connect } = await setup();
    const a = await connect(), outsider = await connect();
    expect(await new Promise(resolve => outsider.socket.emit('command', { requestId: 'request-no-seat', expectedRevision: 0, action: { type: 'start' } }, resolve))).toMatchObject({ code: 'NOT_MEMBER' });
    expect(await new Promise(resolve => outsider.socket.emit('create', { nickname: '' }, resolve))).toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(await new Promise(resolve => outsider.socket.emit('join', { nickname: 'B', roomCode: 'AAAAAA' }, resolve))).toMatchObject({ code: 'ROOM_NOT_FOUND' });
    const session = await enter(a);
    expect(await send(a, { type: 'start' })).toMatchObject({ code: 'NEED_FOUR' });
    expect(await new Promise(resolve => outsider.socket.emit('resume', { ...session, token: 'a'.repeat(64) }, resolve))).toMatchObject({ code: 'INVALID_SESSION' });
    const b = await connect(), c = await connect(), d = await connect();
    await enter(b, session.roomCode); await enter(c, session.roomCode); const ds = await enter(d, session.roomCode);
    await waitFor(() => a.state.players.every(Boolean));
    expect(await new Promise(resolve => outsider.socket.emit('join', { nickname: 'E', roomCode: session.roomCode }, resolve))).toMatchObject({ code: 'ROOM_FULL' });
    expect(await new Promise(resolve => a.socket.emit('create', { nickname: 'A' }, resolve))).toMatchObject({ code: 'ALREADY_JOINED' });
    expect(await send(a, { type: 'start' })).toMatchObject({ ok: true });
    expect(await new Promise(resolve => outsider.socket.emit('join', { nickname: 'E', roomCode: session.roomCode }, resolve))).toMatchObject({ code: 'MATCH_STARTED' });
    await waitFor(() => b.state.phase === 'trumpSelection');
    expect(await send(b, { type: 'chooseTrump', suit: 'clubs' })).toMatchObject({ ok: true });
    expect(await send(b, { type: 'exchange', cardIds: [] })).toMatchObject({ ok: true });
    await waitFor(() => c.state.turn === 2);
    expect(await send(c, { type: 'sitOut' })).toMatchObject({ code: 'MUST_PARTICIPATE' });
    expect(await send(c, { type: 'restart', confirmed: true })).toMatchObject({ code: 'CREATOR_ONLY' });
    expect(await new Promise(resolve => a.socket.emit('command', { requestId: 'malformed-command', expectedRevision: a.state.revision, action: { type: 'restart', confirmed: false } } as any, resolve))).toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(await new Promise(resolve => a.socket.emit('command', { requestId: 'forged-command', expectedRevision: a.state.revision, action: { type: 'play', cardId: 'clubs-A', seat: 2 } } as any, resolve))).toMatchObject({ code: 'INVALID_PAYLOAD' });
    // A new connection with the same token replaces the old socket, keeping the seat.
    const resumed = await connect();
    expect(await new Promise(resolve => resumed.socket.emit('resume', session, resolve))).toMatchObject({ ok: true });
    await waitFor(() => !a.socket.connected);
    d.socket.disconnect();
    await waitFor(() => resumed.state.players[3]?.connected === false);
    expect(await send(resumed, { type: 'restart', confirmed: true })).toMatchObject({ ok: true });
    expect(resumed.state.phase).toBe('lobby');
    expect(resumed.state.players[3]).toBeNull();
    expect(await new Promise(resolve => outsider.socket.emit('resume', ds, resolve))).toMatchObject({ code: 'INVALID_SESSION' });
    await enter(outsider, session.roomCode);
    expect(outsider.state.you).toBe(3);
  });
});
