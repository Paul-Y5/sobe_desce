// Test-only process. Production starts server/index.ts and has no clock-control endpoint.
import { createServer as createHttpServer } from 'node:http';
import { createServer } from '../server/rooms.js';
import { createAccounts } from '../server/accounts.js';

let offset = 0;
const now = () => Date.now() + offset;
const jobs = new Set<{ due: number; run: () => void; timer: ReturnType<typeof setTimeout> }>();
const accounts = await createAccounts({ databasePath: ':memory:', secret: 'browser-test-secret-at-least-32-characters', baseURL: 'http://localhost:3101', origins: ['http://localhost:8181'] });
const game = createServer({ accounts, origins: ['http://localhost:8181'], now, schedule: (run, delay) => {
  const job = { due: now() + delay, run, timer: setTimeout(() => { jobs.delete(job); run(); }, delay) };
  jobs.add(job);
  return () => { clearTimeout(job.timer); jobs.delete(job); };
} });
await game.listen(3101);
const control = createHttpServer(async (req, res) => {
  if (req.method !== 'POST' || req.url !== '/advance') { res.writeHead(404).end(); return; }
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 100) { res.writeHead(413).end(); return; }
  }
  try {
    const { ms } = JSON.parse(body) as { ms: number };
    if (!Number.isSafeInteger(ms) || ms < 0 || ms > 360_000) throw new Error('Invalid test clock advance');
    offset += ms;
    for (const job of [...jobs]) if (job.due <= now()) { clearTimeout(job.timer); jobs.delete(job); job.run(); }
    res.writeHead(200).end('ok');
  } catch { res.writeHead(400).end(); }
});
control.listen(3102, '127.0.0.1');
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => {
  control.close(); void game.close().then(() => { accounts.close(); process.exit(0); });
});
