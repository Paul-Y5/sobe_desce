import { createServer } from './rooms.js';

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT');
const server = createServer({ origins: (process.env.CLIENT_ORIGINS ?? 'http://localhost:8081').split(',').map(s => s.trim()) });
await server.listen(port, process.env.HOST ?? '0.0.0.0');
console.log(`Sobe e Desce server listening on port ${port}`);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { void server.close().then(() => process.exit(0)); });
