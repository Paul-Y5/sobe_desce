import { randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createAccounts } from './accounts.js';

export async function configuredAccounts(origins: string[]) {
  const databasePath = resolve(process.env.ACCOUNT_DATABASE ?? 'data/accounts.sqlite');
  let secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') throw new Error('BETTER_AUTH_SECRET is required in production');
    const path = resolve(dirname(databasePath), 'auth-secret');
    mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
    try { secret = readFileSync(path, 'utf8'); }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      secret = randomBytes(48).toString('base64url'); writeFileSync(path, secret, { mode: 0o600, flag: 'wx' });
    }
  }
  return createAccounts({ databasePath, secret, baseURL: process.env.AUTH_BASE_URL ?? `http://localhost:${process.env.PORT ?? 3001}`, origins });
}
