import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Registry, Counter, Gauge, Histogram, collectDefaultMetrics } from '@prometheus-io/client';

export type Metrics = ReturnType<typeof createMetrics>;
type Totals = { rooms: number; connections: number; matches: number };
export function createMetrics(token: string) {
  if (token.length < 32) throw new Error('METRICS_TOKEN must contain at least 32 characters');
  const register = new Registry();
  collectDefaultMetrics({ register, prefix: 'sobe_' });
  let totals = (): Totals => ({ rooms: 0, connections: 0, matches: 0 });
  for (const name of ['rooms', 'connections', 'matches'] as const) new Gauge({ name: `sobe_${name}`, help: `Current ${name}`, registers: [register], collect() { this.set(totals()[name]); } });
  const commands = new Counter({ name: 'sobe_commands_total', help: 'Accepted and rejected commands', labelNames: ['event', 'result'] as const, registers: [register] });
  const duration = new Histogram({ name: 'sobe_command_duration_seconds', help: 'Synchronous command execution time', buckets: [0.001, 0.005, 0.01, 0.025, 0.1, 0.5], registers: [register] });
  const lifecycle = new Counter({ name: 'sobe_events_total', help: 'Game lifecycle events', labelNames: ['event'] as const, registers: [register] });
  const http = new Counter({ name: 'sobe_http_requests_total', help: 'HTTP responses by fixed route group and status class', labelNames: ['route', 'status'] as const, registers: [register] });
  return {
    setTotals: (read: () => Totals) => { totals = read; },
    command: (event: 'create' | 'join' | 'resume' | 'command' | 'chat' | 'moderateChat', result: string, seconds: number) => { commands.inc({ event, result }); duration.observe(seconds); },
    event: (event: 'connect' | 'disconnect' | 'resume' | 'warning' | 'inactivity' | 'hand_complete' | 'match_complete' | 'restart' | 'bot_action') => lifecycle.inc({ event }),
    http: (route: 'health' | 'metrics' | 'auth' | 'admin' | 'other', status: number) => http.inc({ route, status: `${Math.floor(status / 100)}xx` }),
    async handle(req: IncomingMessage, res: ServerResponse) {
      const expected = Buffer.from(`Bearer ${token}`), provided = Buffer.from(req.headers.authorization ?? '');
      res.setHeader('Cache-Control', 'no-store');
      if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) { res.writeHead(401); res.end('Unauthorized'); return; }
      if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
      res.writeHead(200, { 'Content-Type': register.contentType }); res.end(await register.metrics());
    },
  };
}
