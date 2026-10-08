# Complete local deployment with Compose

The root `compose.yaml` starts the whole environment: exported Expo web files served by Nginx, the compiled Node multiplayer/account server, Alloy, Prometheus and Grafana. SQLite lives in a named server volume; it does not require a separate database container. This is a single-host deployment, with one game-server instance.

## Start

```sh
node deploy/init-env.mjs
# Review .env: PUBLIC_ORIGIN, APP_BIND, APP_PORT and APP_VERSION.
docker compose up -d --build --wait
docker compose ps
```

The setup script creates a mode-0600 root `.env` with independent random secrets and refuses to overwrite an existing file. It does not print credentials. For environments without local Node, copy `.env.example` to `.env` and fill the three secrets with independently generated random values of at least 32 characters. Never commit this file. `server/.env` and `client/.env` belong to the npm development workflow and are not copied into images.

- Application: `http://localhost:8080` by default.
- Grafana: `http://localhost:3300`, user `admin`, password from root `.env`.
- Prometheus: `http://localhost:9090`; Alloy: `http://localhost:12345`. Operational ports bind only to loopback.
- The game server has no published host port. Nginx proxies `/api/`, `/socket.io/` (polling and WebSocket upgrade), and `/health`. It refuses public `/metrics`; Alloy reaches the protected endpoint over the Compose network.

The web bundle uses the page origin, so it needs no rebuild when changing a hostname or port. Set `PUBLIC_ORIGIN` to the exact URL used by browsers, including scheme and port, and recreate services after changing it. For LAN use, set `APP_BIND=0.0.0.0` and `PUBLIC_ORIGIN=http://YOUR_LAN_IP:8080`. Native builds can use this same public URL as `EXPO_PUBLIC_SERVER_URL`; the mobile app itself is not a Docker workload.

For a public deployment, terminate HTTPS with your existing ingress/reverse proxy and set `PUBLIC_ORIGIN=https://your-host`. The supplied stack does not obtain TLS certificates or register a domain. Forward WebSocket upgrades and keep the application as one instance. `TRUST_PROXY=true` is set only for the private server: Nginx overwrites the client-IP header used for auth rate limits. Do not expose that server directly with proxy trust enabled. If an additional ingress is used, configure its trusted IP handling deliberately; otherwise all requests may share the ingress's rate-limit bucket.

## Administrator

Register a normal account in **Conta**, then promote that existing account locally:

```sh
docker compose exec server node server/dist/server/promote-admin.js registered@example.org
```

Refresh **Conta** to see the administration link. There is no default game-admin account. The Grafana administrator is separate.

## Versioning and updates

The Dockerfile uses multi-stage builds, `npm ci` and the committed lockfile. Node and Nginx base tags and observability images are pinned. Both application images carry an OCI version label and use tags `sobe-desce/server:APP_VERSION` and `sobe-desce/web:APP_VERSION`.

For a release, set `APP_VERSION` in root `.env` to the commit or release identifier (for example `r2026-10-08`), then build and start:

```sh
docker compose build
docker compose up -d --wait --no-build
```

Keep the previous pair of application image tags available. To roll back, restore the previous checkout's Compose/config files, set its `APP_VERSION`, and run `docker compose up -d --no-build --pull never`. Account schema migrations run on server startup; a downgrade may require restoring a compatible database backup. Do not assume arbitrary database downgrade compatibility. For registry deployment, retag/push the images to your own registry and update image references; no remote image or Git push is performed here.

Every server replacement/restart ends active in-memory matches and chat. Drain/announce maintenance before updating; there is no zero-downtime room migration. Account data survives container replacement.

## Data and shutdown

Named volumes retain accounts (`accounts-data`), Alloy state, Prometheus metrics and Grafana configuration. Stop safely with `docker compose down`, which keeps volumes. `docker compose down --volumes` deletes accounts and operational data permanently.

Back up root `.env` securely along with a consistent SQLite backup. Stop the server before copying the account volume, or use SQLite's backup facilities; copying a live main database file without its WAL is not safe. Test restoration before a production upgrade. Configure filesystem access and disk limits for the host; Compose is not a backup system.

## Verification

Build local-tag images first. `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium node deploy/smoke.mjs` starts an isolated Compose project on 18080/13301/19091/12350, tests the production web build through Nginx, runs browser accounts/game/chat/bot journeys, restarts the server to verify account persistence, and checks a metric plus the provisioned dashboard. It removes only its own temporary containers/volumes. It requires the host's npm dependencies and Chromium, and does not modify your running `sobe-desce` project.

Containers run without application root privileges and with dropped capabilities. Images exclude credentials, Git history, local SQLite files and host `node_modules`. The React Native and engine code remain shared; Docker packages only the web/server deployment.
