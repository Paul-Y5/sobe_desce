import { expect, test } from 'vitest';
import { io } from 'socket.io-client';
import { createServer } from './rooms.js';
import { createMetrics } from './metrics.js';

test('metrics require their own secret and contain only aggregate game data', async () => {
  const metrics = createMetrics('test-metrics-secret-at-least-32-chars');
  const server = createServer({ metrics });
  const url = await server.listen(0);
  const socket = io(url, { forceNew: true });
  try {
    expect((await fetch(url + '/metrics')).status).toBe(401);
    await new Promise<void>(resolve => socket.once('connect', resolve));
    const entry = await socket.emitWithAck('create', { nickname: 'Private nickname' });
    await socket.emitWithAck('command', { requestId: 'rejected-command', expectedRevision: 1, action: { type: 'start' } });
    const response = await fetch(url + '/metrics', { headers: { Authorization: 'Bearer test-metrics-secret-at-least-32-chars' } });
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain('sobe_rooms');
    expect(text).toContain('sobe_commands_total');
    expect(text).toContain('NEED_FOUR');
    for (const secret of ['Private nickname', entry.data.token, entry.data.roomCode, 'cardId', 'email']) expect(text).not.toContain(secret);
  } finally { socket.disconnect(); await server.close(); }
});
