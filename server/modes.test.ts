import { expect, test } from 'vitest';
import { io } from 'socket.io-client';
import { createServer } from './rooms.js';
import type { RoomAction, Snapshot } from '../shared/index.js';

test('authoritative modes: fixed lobby format, competitive progression and explicit infinite finish', async () => {
  const server = createServer({ rateLimit: 10000 }); const url = await server.listen(0);
  let request = 0;
  const clients = await Promise.all(Array.from({ length: 4 }, async (_, index) => {
    const socket = io(url, { forceNew: true }); let state: Snapshot;
    socket.on('snapshot', next => { state = next; });
    await new Promise<void>(resolve => socket.once('connect', resolve));
    return { socket, index, get state() { return state; } };
  }));
  async function command(seat: number, action: RoomAction) {
    const client = clients[seat];
    const payload = { requestId: `mode-command-${++request}`, expectedRevision: client.state.revision, action };
    expect(await client.socket.emitWithAck('command', payload)).toMatchObject({ ok: true });
    const revision = client.state.revision;
    await expect.poll(() => clients.every(c => c.state.revision === revision)).toBe(true);
    return payload;
  }
  async function soloHand() {
    const chooser = clients[0].state.chooser;
    await command(chooser, { type: 'chooseTrump', suit: 'hearts' });
    await command(chooser, { type: 'exchange', cardIds: [] });
    for (let offset = 1; offset < 4; offset++) await command((chooser + offset) % 4, { type: 'sitOut' });
    for (let i = 0; i < 5; i++) await command(chooser, { type: 'play', cardId: clients[chooser].state.legalCardIds[0] });
  }
  try {
    const room = await clients[0].socket.emitWithAck('create', { nickname: 'Host' });
    for (const client of clients.slice(1)) await client.socket.emitWithAck('join', { nickname: `Pessoa ${client.index}`, roomCode: room.data.roomCode });
    await expect.poll(() => clients.every(c => c.state.players.every(Boolean))).toBe(true);
    const formatAction: RoomAction = { type: 'setFormat', format: { mode: 'competitive', linesToWin: 1 } };
    expect(await clients[1].socket.emitWithAck('command', { requestId: 'mode-denied', expectedRevision: clients[1].state.revision, action: formatAction })).toMatchObject({ code: 'CREATOR_ONLY' });
    const configured = await command(0, formatAction);
    expect(await clients[0].socket.emitWithAck('command', configured)).toMatchObject({ code: 'DUPLICATE' });
    await command(0, { type: 'start' });
    expect(await clients[0].socket.emitWithAck('command', { requestId: 'mode-during-game', expectedRevision: clients[0].state.revision, action: { type: 'setFormat', format: { mode: 'infinite', linesToWin: 1 } } })).toMatchObject({ code: 'WRONG_PHASE' });
    let completedGames = 0;
    while (!clients[0].state.competitionWinners.length) {
      while (clients[0].state.phase !== 'matchComplete') {
        await soloHand();
        if (clients[0].state.phase === 'handComplete') await command(0, { type: 'nextHand' });
      }
      completedGames++;
      const wins = [...clients[0].state.gameWins];
      expect(wins.reduce((sum, n) => sum + n, 0)).toBe(completedGames);
      if (!clients[0].state.competitionWinners.length) {
        await command(0, { type: 'nextGame' });
        expect(clients[0].state.gameWins).toEqual(wins);
        expect(clients[0].state.players.map(p => p!.score)).toEqual([20, 20, 20, 20]);
      }
      expect(completedGames).toBeLessThanOrEqual(13);
    }
    expect(Math.max(...clients[0].state.gameWins)).toBe(4);
    await command(0, { type: 'restart', confirmed: true });
    await command(0, { type: 'setFormat', format: { mode: 'infinite', linesToWin: 1 } });
    await command(0, { type: 'start' });
    expect(await clients[0].socket.emitWithAck('command', { requestId: 'finish-too-early', expectedRevision: clients[0].state.revision, action: { type: 'finishInfinite', confirmed: true } })).toMatchObject({ code: 'WRONG_PHASE' });
    for (let hand = 0; hand < 9; hand++) {
      await soloHand();
      expect(clients[0].state.phase).toBe('handComplete');
      if (hand < 8) await command(0, { type: 'nextHand' });
    }
    expect(clients[0].state.players[1]!.score).toBe(-10);
    expect(await clients[1].socket.emitWithAck('command', { requestId: 'finish-not-host', expectedRevision: clients[1].state.revision, action: { type: 'finishInfinite', confirmed: true } })).toMatchObject({ code: 'CREATOR_ONLY' });
    const final = await command(0, { type: 'finishInfinite', confirmed: true });
    expect(clients[0].state.winners).toEqual([1]); expect(clients[0].state.players[1]!.score).toBe(-10);
    expect(await clients[0].socket.emitWithAck('command', final)).toMatchObject({ code: 'DUPLICATE' });
  } finally { clients.forEach(c => c.socket.disconnect()); await server.close(); }
}, 60000);
