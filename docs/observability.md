# Local observability

The server exposes Prometheus metrics only when `METRICS_TOKEN` is configured (at least 32 random characters). `/metrics` requires `Authorization: Bearer ...`; account sessions and administrator roles do not grant access. `/health` remains a minimal public liveness endpoint.

1. Generate two independent secrets with `openssl rand -hex 32`.
2. Add one as `METRICS_TOKEN` in `server/.env`, then restart the game server.
3. Copy `observability/.env.example` to `observability/.env`. Use the same metrics token there and the second secret as `GRAFANA_ADMIN_PASSWORD`.
4. Run `docker compose --env-file observability/.env -f observability/compose.yaml up -d`.
5. Open Grafana at `http://localhost:3300`, sign in as `admin` with your configured password, and open **Sobe e Desce · Servidor**. This Grafana administrator is separate from game administrators.

Alloy scrapes the server every 10 seconds and remote-writes into Prometheus. Prometheus retains seven days of metrics; Grafana reads Prometheus. Alloy is the collector, not the database. Linux uses Docker's host-gateway mapping; the game server must listen on `0.0.0.0` for the container to reach it. Change `GAME_TARGET` if the server runs elsewhere. Dashboard rates need several samples before displaying data.

Ports bind only to loopback: Grafana 3300, Prometheus 9090, Alloy 12345. The metrics token travels over HTTP on the local bridge in this development setup; use private networking and TLS when separating hosts. Do not expose the unauthenticated Prometheus write/query API publicly. Secrets in container environment variables are visible to the local Docker operator.

The dashboard shows rooms, connections, active matches, command results/rate and latency, reconnections/inactivity, process memory, and event-loop delay. Labels have fixed categories, not player/session/room identifiers. No hand, deck, nickname, email, token, or chat content is emitted to metrics. Authentication password hashing time is not part of the synchronous game-command histogram. Process metrics and application counters reset on restart.

Prometheus evaluates local availability and event-loop alerts. No notification destination is configured; configure Alertmanager separately when needed. An Alloy outage can leave stale samples; monitor the collector itself before production. Logging currently consists of a minimal JSON startup event plus library diagnostics; this release does not install a log backend or distributed tracing.

Stop with `docker compose --env-file observability/.env -f observability/compose.yaml down`; named volumes are retained. `down --volumes` permanently removes the local metrics and Grafana data.

Run `node --import tsx observability/smoke.ts` for an isolated integration check. It starts its own game endpoint and Compose project on ports 3199/13300/19090/12349, validates a stored metric and provisioned dashboard, then removes only its own temporary containers and volumes. Docker and image downloads are required.

Pinned images: [Alloy 1.20.1](https://github.com/grafana/alloy/releases/tag/v1.20.1), [Prometheus 3.15.0](https://github.com/prometheus/prometheus/releases/tag/v3.15.0), [Grafana 13.2.3](https://github.com/grafana/grafana/releases/tag/v13.2.3). Configuration follows the [official Alloy remote-write tutorial](https://grafana.com/docs/alloy/latest/tutorials/send-metrics-to-prometheus/). Tags are pinned; verify image digests and upgrade deliberately for a production deployment.
