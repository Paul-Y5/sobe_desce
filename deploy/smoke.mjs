import { spawn } from 'node:child_process';
import { randomBytes } from 'node:crypto';
const env = { ...process.env, APP_VERSION: 'local', APP_BIND: '127.0.0.1', APP_PORT: '18080', PUBLIC_ORIGIN: 'http://localhost:18080',
  BETTER_AUTH_SECRET: randomBytes(32).toString('hex'), METRICS_TOKEN: randomBytes(32).toString('hex'), GRAFANA_ADMIN_PASSWORD: randomBytes(24).toString('hex'),
  GRAFANA_PORT: '13301', PROMETHEUS_PORT: '19091', ALLOY_PORT: '12350' };
function run(command, args) { return new Promise((resolve, reject) => {
  const child = spawn(command, args, { env, stdio: 'inherit' });
  child.on('error', reject); child.on('exit', code => code === 0 ? resolve() : reject(new Error(`${command} exited ${code}`)));
}); }
const compose = args => run('docker', ['compose', '--progress', 'quiet', '-p', 'sobe-deploy-smoke', ...args]);
const headers = { Origin: env.PUBLIC_ORIGIN, 'Content-Type': 'application/json' };
async function auth(path, body) { return fetch(`${env.PUBLIC_ORIGIN}/api/auth/${path}`, { method: 'POST', headers, body: JSON.stringify(body) }); }
try {
  await compose(['up', '-d', '--wait', '--wait-timeout', '120', '--no-build']);
  if (!(await fetch(env.PUBLIC_ORIGIN + '/account')).ok) throw new Error('SPA route fallback failed');
  if ((await fetch(env.PUBLIC_ORIGIN + '/metrics')).status !== 404) throw new Error('Metrics exposed through public proxy');
  const credentials = { email: 'compose-persistence@example.test', password: randomBytes(24).toString('hex') };
  const registration = await auth('sign-up/email', { ...credentials, name: 'Persistence check' });
  if (!registration.ok) throw new Error(`Account registration failed: ${registration.status}`);
  await run('npm', ['run', 'test:browser', '--', '--config', 'playwright.compose.config.ts']);
  await compose(['restart', 'server']);
  await compose(['up', '-d', '--wait', '--wait-timeout', '120', '--no-build']);
  // Nginx caches the previous container address briefly when containers are replaced.
  let authenticated = false;
  for (let attempt = 0; attempt < 15; attempt++) {
    try { if ((await auth('sign-in/email', credentials)).ok) { authenticated = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!authenticated) throw new Error('Account did not survive server restart');
  let metricsReady = false;
  let diagnostic = 'no response';
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const query = await fetch('http://127.0.0.1:19091/api/v1/query?query=sobe_rooms').then(r => r.json());
      const dashboard = await fetch('http://127.0.0.1:13301/api/dashboards/uid/sobe-overview', { headers: { Authorization: `Basic ${Buffer.from(`admin:${env.GRAFANA_ADMIN_PASSWORD}`).toString('base64')}` } });
      diagnostic = `stored metrics=${query.data.result.length}; dashboard HTTP=${dashboard.status}`;
      if (query.data.result.length && dashboard.ok) { metricsReady = true; break; }
    } catch (error) { diagnostic = error.message; }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  if (!metricsReady) throw new Error(`Container metrics pipeline or dashboard failed: ${diagnostic}`);
  console.log('PASS: production web, proxy, Socket.IO gameplay, account persistence and Grafana pipeline.');
} catch (error) { await compose(['logs', '--tail', '20']); throw error; }
finally { await compose(['down', '--volumes']); }
