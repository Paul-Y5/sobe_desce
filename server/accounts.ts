import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import type { IncomingHttpHeaders, IncomingMessage, ServerResponse } from 'node:http';
import { betterAuth, type BetterAuthOptions } from 'better-auth';
import { getMigrations } from 'better-auth/db/migration';
import { bearer } from 'better-auth/plugins';
import { fromNodeHeaders } from 'better-auth/node';
import { z } from 'zod';

type Options = { trustProxy?: boolean; databasePath: string; secret: string; baseURL: string; origins: string[] };
export type AccountUser = { id: string; name: string; email: string; role: string };
export type Accounts = Awaited<ReturnType<typeof createAccounts>>;

export async function createAccounts(options: Options) {
  if (options.secret.length < 32) throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
  if (options.databasePath !== ':memory:') mkdirSync(dirname(options.databasePath), { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(options.databasePath);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;');
  const config: BetterAuthOptions = {
    database: db, secret: options.secret, baseURL: options.baseURL, trustedOrigins: options.origins,
    emailAndPassword: { enabled: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'user', input: false }, disabled: { type: 'boolean', defaultValue: false, input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 30 },
    advanced: { ipAddress: { ipAddressHeaders: ['x-sobe-client-ip'] } },
    plugins: [bearer({ requireSignature: true })],
    databaseHooks: { session: { create: { before: async session => {
      const row = db.prepare('SELECT disabled FROM user WHERE id = ?').get(session.userId);
      return row?.disabled ? false : undefined;
    } } } },
  };
  await (await getMigrations(config)).runMigrations();
  const auth = betterAuth(config);
  db.exec('CREATE TABLE IF NOT EXISTS admin_audit (id INTEGER PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, reason TEXT NOT NULL, createdAt INTEGER NOT NULL)');
  let onRevoke = (_id: string) => {};
  function allowed(id: string) { return db.prepare('SELECT disabled FROM user WHERE id = ?').get(id)?.disabled === 0; }
  async function authenticate(headers: IncomingHttpHeaders): Promise<AccountUser | null> {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(headers), query: { disableCookieCache: true } });
    if (!session || !allowed(session.user.id)) return null;
    const row = db.prepare('SELECT id, name, email, role FROM user WHERE id = ?').get(session.user.id);
    return row as AccountUser;
  }
  function json(res: ServerResponse, status: number, body: unknown) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const path = new URL(req.url ?? '/', options.baseURL).pathname;
    if (!path.startsWith('/api/')) return false;
    if (req.headers.origin && !options.origins.includes(req.headers.origin)) { json(res, 403, { error: 'Origem não autorizada.' }); return true; }
    if (req.headers.origin) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Expose-Headers', 'set-auth-token');
    }
    if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type, Authorization' }); res.end(); return true; }
    // Expose only the account operations used by this application.
    if (['/api/auth/sign-up/email', '/api/auth/sign-in/email', '/api/auth/sign-out', '/api/auth/change-password'].includes(path) && req.method === 'POST') {
      if (Number(req.headers['content-length'] ?? 0) > 8192) { json(res, 413, { error: 'Pedido demasiado grande.' }); return true; }
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 8192) { json(res, 413, { error: 'Pedido demasiado grande.' }); return true; } chunks.push(chunk); }
      const headers = fromNodeHeaders(req.headers); headers.delete('content-length');
      // Trust only the private deployment proxy when explicitly configured; otherwise use the TCP peer.
      headers.set('x-sobe-client-ip', options.trustProxy && typeof req.headers['x-real-ip'] === 'string' ? req.headers['x-real-ip'] : req.socket.remoteAddress ?? 'unknown');
      const response = await auth.handler(new Request(new URL(path, options.baseURL), { method: 'POST', headers, body: Buffer.concat(chunks).toString() }));
      response.headers.forEach((value, key) => { if (key !== 'set-cookie') res.setHeader(key, value); });
      const cookies = response.headers.getSetCookie(); if (cookies.length) res.setHeader('set-cookie', cookies);
      res.setHeader('Cache-Control', 'no-store');
      res.writeHead(response.status); res.end(await response.text()); return true;
    }
    try {
      const user = await authenticate(req.headers);
      if (!user) { json(res, 401, { error: 'Entre na sua conta para continuar.' }); return true; }
      if (path === '/api/me' && req.method === 'GET') { json(res, 200, { user }); return true; }
      if (!path.startsWith('/api/admin/')) { json(res, 404, { error: 'Não encontrado.' }); return true; }
      // Re-read the role on every request; never trust a client claim or stale cookie data.
      if (user.role !== 'admin') { json(res, 403, { error: 'Não tem permissão de administração.' }); return true; }
      if (path === '/api/admin/users' && req.method === 'GET') {
        const offset = z.coerce.number().int().min(0).max(1000000).parse(new URL(req.url!, options.baseURL).searchParams.get('offset') ?? 0);
        json(res, 200, { users: db.prepare('SELECT id, name, email, role, disabled FROM user ORDER BY createdAt, id LIMIT 50 OFFSET ?').all(offset), offset }); return true;
      }
      if (path === '/api/admin/audit' && req.method === 'GET') { json(res, 200, { events: db.prepare('SELECT * FROM admin_audit ORDER BY id DESC LIMIT 50').all() }); return true; }
      const match = /^\/api\/admin\/users\/([a-zA-Z0-9_-]{1,128})\/(ban|unban|revoke)$/.exec(path);
      if (!match || req.method !== 'POST') { json(res, 404, { error: 'Não encontrado.' }); return true; }
      // Cookie mutations require an Origin; native requests authenticate explicitly.
      if (!req.headers.origin && !req.headers.authorization) { json(res, 403, { error: 'Origem necessária.' }); return true; }
      const chunks: Buffer[] = []; let size = 0;
      for await (const chunk of req) { size += chunk.length; if (size > 2048) { json(res, 413, { error: 'Pedido demasiado grande.' }); return true; } chunks.push(chunk); }
      const { reason } = z.strictObject({ reason: z.string().trim().min(3).max(200) }).parse(JSON.parse(Buffer.concat(chunks).toString()));
      const [, target, action] = match;
      if (target === user.id) { json(res, 400, { error: 'Não pode aplicar esta ação à sua própria conta.' }); return true; }
      if (!db.prepare('SELECT id FROM user WHERE id = ?').get(target)) { json(res, 404, { error: 'Conta não encontrada.' }); return true; }
      db.exec('BEGIN IMMEDIATE');
      try {
        if (action !== 'revoke') db.prepare('UPDATE user SET disabled = ? WHERE id = ?').run(action === 'ban' ? 1 : 0, target);
        if (action !== 'unban') db.prepare('DELETE FROM session WHERE userId = ?').run(target);
        db.prepare('INSERT INTO admin_audit(actor, action, target, reason, createdAt) VALUES(?, ?, ?, ?, ?)').run(user.id, action, target, reason, Date.now());
        db.exec('COMMIT');
      } catch (error) { db.exec('ROLLBACK'); throw error; }
      if (action !== 'unban') onRevoke(target);
      json(res, 200, { ok: true });
    } catch (error) { json(res, error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 500, { error: 'Não foi possível concluir o pedido.' }); }
    return true;
  }
  return { handle, authenticate, allowed, setOnRevoke: (callback: (id: string) => void) => { onRevoke = callback; },
    promote: (email: string) => {
      const result = db.prepare("UPDATE user SET role = 'admin' WHERE email = ? AND disabled = 0").run(email.trim().toLowerCase());
      if (!result.changes) throw new Error('Active account not found');
      db.prepare('INSERT INTO admin_audit(actor, action, target, reason, createdAt) VALUES(?, ?, ?, ?, ?)').run('local-cli', 'promote', email, 'Local operator promotion', Date.now());
    },
    close: () => db.close(),
  };
}
