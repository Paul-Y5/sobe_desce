import { expect, test } from 'vitest';
import { io, type Socket } from 'socket.io-client';
import { createServer } from './rooms.js';
import type { Snapshot, RoomAction } from '../shared/index.js';

test('chat is room-private, bounded, moderated, idempotent, and does not advance the game', async () => {
  let now = Date.now();
  const server = createServer({ now: () => now }); const url = await server.listen(0);
  const clients: Socket[] = [];
  async function connect() { const socket = io(url, { forceNew: true }); clients.push(socket); await new Promise<void>(resolve => socket.once('connect', resolve)); return socket; }
  try {
    const host = await connect(), guest = await connect(), outsider = await connect();
    let state: Snapshot; let chat: any;
    host.on('snapshot', next => { state = next; }); host.on('chatState', next => { chat = next; });
    const entry = await host.emitWithAck('create', { nickname: 'Host' });
    const session = await guest.emitWithAck('join', { nickname: 'Guest', roomCode: entry.data.roomCode });
    await expect.poll(() => state?.players.filter(Boolean).length).toBe(2);
    const revision = state!.revision, deadline = state!.turnDeadline;
    expect(await outsider.emitWithAck('chat', { requestId: 'chat-outside', text: 'Outside' })).toMatchObject({ code: 'NOT_MEMBER' });
    const message = { requestId: 'chat-message', text: '<script>plain text</script>' };
    expect(await guest.emitWithAck('chat', message)).toMatchObject({ ok: true });
    expect(await guest.emitWithAck('chat', message)).toMatchObject({ code: 'DUPLICATE' });
    await expect.poll(() => chat?.messages.length).toBe(1);
    expect(chat.messages[0]).toMatchObject({ seat: 1, text: message.text });
    expect(state!.revision).toBe(revision); expect(state!.turnDeadline).toBe(deadline);
    expect(await guest.emitWithAck('chat', { requestId: 'too-long-text', text: 'a'.repeat(501) })).toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(await guest.emitWithAck('moderateChat', { requestId: 'guest-moderation', seat: 0, muted: true })).toMatchObject({ code: 'CREATOR_ONLY' });
    expect(await host.emitWithAck('moderateChat', { requestId: 'host-moderation', seat: 1, muted: true })).toMatchObject({ ok: true });
    expect(await guest.emitWithAck('chat', { requestId: 'muted-message', text: 'No' })).toMatchObject({ code: 'CHAT_MUTED' });
    guest.disconnect();
    const recovered = await connect(); let history: any;
    recovered.on('chatState', value => { history = value; });
    expect(await recovered.emitWithAck('resume', session.data)).toMatchObject({ ok: true });
    expect(history.messages).toHaveLength(1); expect(history.mutedSeats).toContain(1);
    expect(await host.emitWithAck('moderateChat', { requestId: 'host-unmute', seat: 1, muted: false })).toMatchObject({ ok: true });
    for (let i = 0; i < 4; i++) expect(await recovered.emitWithAck('chat', { requestId: `chat-valid-${i}`, text: 'Olá' })).toMatchObject({ ok: true });
    expect(await recovered.emitWithAck('chat', { requestId: 'chat-flooded', text: 'Não' })).toMatchObject({ code: 'RATE_LIMIT' });
    let outsideMessages = 0;
    await outsider.emitWithAck('create', { nickname: 'Outside' });
    outsider.on('chatState', () => outsideMessages++);
    for (let i = 0; i < 55; i++) {
      now += 10000;
      expect(await recovered.emitWithAck('chat', { requestId: `history-check-${i}`, text: `Linha ${i}` })).toMatchObject({ ok: true });
    }
    await expect.poll(() => chat.messages.at(-1).text).toBe('Linha 54');
    expect(chat.messages).toHaveLength(50); expect(chat.messages[0].text).toBe('Linha 5');
    expect(outsideMessages).toBe(0);
  } finally { clients.forEach(c => c.disconnect()); await server.close(); }
});

test('three explicitly added bots play five tricks with a human and preserve fixed seats', async () => {
  const server = createServer({ botDelayMs: 5, rateLimit: 10000 }); const url = await server.listen(0);
  const host = io(url, { forceNew: true }); let state: Snapshot | undefined; let sequence = 0;
  host.on('snapshot', next => { state = next; });
  await new Promise<void>(resolve => host.once('connect', resolve));
  async function act(action: RoomAction) {
    expect(await host.emitWithAck('command', { requestId: `bot-test-${++sequence}`, expectedRevision: state!.revision, action })).toMatchObject({ ok: true });
  }
  try {
    await host.emitWithAck('create', { nickname: 'Human' });
    for (const seat of [1, 2, 3]) await act({ type: 'addBot', seat });
    expect(state!.players.filter(p => p?.bot)).toHaveLength(3);
    await act({ type: 'removeBot', seat: 3 }); await act({ type: 'addBot', seat: 3 });
    await act({ type: 'start' });
    expect(await host.emitWithAck('command', { requestId: 'late-bot-add', expectedRevision: state!.revision, action: { type: 'removeBot', seat: 3 } })).toMatchObject({ code: 'WRONG_PHASE' });
    let moves = 0;
    while (state!.phase !== 'handComplete') {
      await expect.poll(() => state!.turn === 0 || state!.phase === 'handComplete', { timeout: 5000 }).toBe(true);
      if ((state as Snapshot).phase === 'handComplete') break;
      await act(state!.phase === 'participationExchange' ? { type: 'exchange', cardIds: [] } : { type: 'play', cardId: state!.legalCardIds[0] });
      expect(++moves).toBeLessThanOrEqual(6);
    }
    expect(state!.completedTricks).toHaveLength(5);
    expect(state!.players.reduce((sum, p) => sum + p!.tricks, 0)).toBe(5);
    await act({ type: 'nextHand' });
    expect(state!.dealer).toBe(1);
    await act({ type: 'restart', confirmed: true });
    await new Promise(resolve => setTimeout(resolve, 50));
    expect(state!.phase).toBe('lobby'); expect(state!.hand).toEqual([]);
  } finally { host.disconnect(); await server.close(); }
});
