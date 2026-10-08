import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const root = new URL('../', import.meta.url);
let content = readFileSync(new URL('.env.example', root), 'utf8');
for (const key of ['BETTER_AUTH_SECRET', 'METRICS_TOKEN', 'GRAFANA_ADMIN_PASSWORD']) content = content.replace(`${key}=`, `${key}=${randomBytes(32).toString('hex')}`);
// Never overwrite an existing environment or rotate live credentials accidentally.
writeFileSync(new URL('.env', root), content, { flag: 'wx', mode: 0o600 });
console.log('Created .env with private random secrets. Review PUBLIC_ORIGIN and APP_VERSION before starting Compose.');
