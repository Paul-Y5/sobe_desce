// Isolated local integration check. Deletes only its own ephemeral Compose volumes.
import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { createServer } from '../server/rooms.js';
import { createMetrics } from '../server/metrics.js';
const token = randomBytes(32).toString('hex');
const password = randomBytes(24).toString('hex');
const server = createServer({ metrics: createMetrics(token) });
await server.listen(3199, '0.0.0.0');
const env = { ...process.env, METRICS_TOKEN: token, GRAFANA_ADMIN_PASSWORD: password, GAME_TARGET: 'host.docker.internal:3199', GRAFANA_PORT: '13300', PROMETHEUS_PORT: '19090', ALLOY_PORT: '12349' };
function compose(args: string[]) { return new Promise<void>((resolve, reject) => {
  const child = spawn('docker', ['compose', '--progress', 'quiet', '-p', 'sobe-observability-smoke', '-f', 'observability/compose.yaml', ...args], { env, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Compose exited ${code}`)));
}); }
try {
  await compose(['config', '--quiet']);
  await compose(['up', '-d', '--quiet-pull']);
  let passed = false;
  let diagnostic = 'no response';
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const health = await fetch('http://127.0.0.1:13300/api/health').then(r => r.json()) as { database: string };
      const query = await fetch('http://127.0.0.1:19090/api/v1/query?query=sobe_rooms').then(r => r.json()) as { data: { result: unknown[] } };
      const dashboard = await fetch('http://127.0.0.1:13300/api/dashboards/uid/sobe-overview', { headers: { Authorization: `Basic ${Buffer.from(`admin:${password}`).toString('base64')}` } });
      diagnostic = `database=${health.database}; metrics=${query.data.result.length}; dashboard HTTP=${dashboard.status}`;
      if (health.database === 'ok' && query.data.result.length && dashboard.ok) { passed = true; break; }
    } catch (error) { diagnostic = error instanceof Error ? error.message : 'unknown response'; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!passed) {
    await compose(['logs', '--tail', '30']);
    throw new Error(`Metrics pipeline or Grafana provisioning did not become ready: ${diagnostic}`);
  }
  console.log('PASS: Alloy scraped the server, Prometheus stored sobe_rooms, Grafana loaded the dashboard.');
} finally { await compose(['down', '--volumes']); await server.close(); }
