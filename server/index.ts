import { createMetrics } from './metrics.js';
import { createServer } from './rooms.js';
import { configuredAccounts } from './account-config.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const origins = (process.env.CLIENT_ORIGINS ?? 'http://localhost:8081').split(',').map(s => s.trim());
const accounts = await configuredAccounts(origins);
const metrics = process.env.METRICS_TOKEN ? createMetrics(process.env.METRICS_TOKEN) : undefined;
const server = createServer({ origins, accounts, metrics });
await server.listen(port, process.env.HOST ?? '0.0.0.0');
console.log(JSON.stringify({ event: 'server_started', port, metrics: !!metrics }));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void server.close().then(() => { accounts.close(); process.exit(0); }); });
