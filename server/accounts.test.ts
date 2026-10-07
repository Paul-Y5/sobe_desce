import { afterEach, expect, test } from 'vitest';
import { createAccounts } from './accounts.js';
import { createServer } from './rooms.js';
import { io } from 'socket.io-client';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => { for (const cleanup of cleanups.splice(0)) await cleanup(); });

test('persistent account API authenticates, denies forged roles, and audits admin revocation', async () => {
  const accounts = await createAccounts({ databasePath: ':memory:', secret: 'test-only-secret-with-at-least-32-characters', baseURL: 'http://localhost:3001', origins: ['http://localhost:8081'] });
  const server = createServer({ accounts });
  const url = await server.listen(0);
  cleanups.push(async () => { await server.close(); accounts.close(); });
  async function request(path: string, body?: unknown, token?: string) {
    return fetch(url + path, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8081', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  }
  const signup = await request('/api/auth/sign-up/email', { name: 'Ana', email: 'ana@example.test', password: 'safe-test-password', role: 'admin' });
  expect(signup.status).toBe(200);
  const token = signup.headers.get('set-auth-token')!;
  expect(token).toBeTruthy();
  const me = await (await request('/api/me', undefined, token)).json();
  expect(me.user.role).toBe('user');
  expect(await request('/api/admin/users', undefined, token)).toHaveProperty('status', 403);
  expect(await request('/api/admin/users')).toHaveProperty('status', 401);
  accounts.promote('ana@example.test');
  const second = await request('/api/auth/sign-up/email', { name: 'Bruno', email: 'bruno@example.test', password: 'another-safe-password' });
  const otherToken = second.headers.get('set-auth-token')!;
  const other = await (await request('/api/me', undefined, otherToken)).json();
  const socket = io(url, { auth: { accountToken: otherToken }, forceNew: true });
  await new Promise<void>(resolve => socket.once('connect', resolve));
  const entry = await socket.emitWithAck('create', { nickname: 'Bruno' });
  expect(entry.ok).toBe(true);
  const intruder = io(url, { forceNew: true });
  await new Promise<void>(resolve => intruder.once('connect', resolve));
  expect(await intruder.emitWithAck('resume', entry.data)).toMatchObject({ ok: false, code: 'ACCOUNT_REQUIRED' });
  intruder.disconnect();
  const revoked = new Promise<void>(resolve => socket.once('accountRevoked', resolve));
  expect(await request(`/api/admin/users/${other.user.id}/ban`, { reason: 'Teste de moderação' }, token)).toHaveProperty('status', 200);
  await revoked;
  socket.disconnect();
  expect(await request('/api/me', undefined, otherToken)).toHaveProperty('status', 401);
  const users = await (await request('/api/admin/users', undefined, token)).json();
  expect(users.users.find((u: { id: string }) => u.id === other.user.id).disabled).toBe(1);
  expect(JSON.stringify(users)).not.toContain('password');
  const audit = await (await request('/api/admin/audit', undefined, token)).json();
  expect(audit.events[0]).toMatchObject({ action: 'ban', target: other.user.id });
  expect(await request(`/api/admin/users/${me.user.id}/ban`, { reason: 'Self' }, token)).toHaveProperty('status', 400);
  const forbidden = await fetch(url + `/api/admin/users/${other.user.id}/unban`, { method: 'POST', headers: { Origin: 'http://evil.test', 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason: 'forged' }) });
  expect(forbidden.status).toBe(403);
  expect(await request(`/api/admin/users/${other.user.id}/unban`, { reason: 'Reativar teste' }, token)).toHaveProperty('status', 200);
  const login = await request('/api/auth/sign-in/email', { email: 'bruno@example.test', password: 'another-safe-password' });
  expect(login.status).toBe(200);
  const recovered = io(url, { auth: { accountToken: login.headers.get('set-auth-token') }, forceNew: true });
  await new Promise<void>(resolve => recovered.once('connect', resolve));
  expect(await recovered.emitWithAck('resume', entry.data)).toMatchObject({ ok: true });
  recovered.disconnect();
});
