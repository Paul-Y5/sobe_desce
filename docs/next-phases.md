# Product and platform evolution

Status: implementation plan, 2026-10-07. Accounts, administration, chat, Grafana Alloy and bots described below are **not implemented**. Keep the current single Node service and shared pure engine. Choose providers and hosting when those phases start; no provider purchase or deployment is implied by this plan.

## Current increment: guided, animated play

Implemented in this increment:

- First-visit question asking whether the player knows the rules; remember the answer on that device/browser. The tutorial is always available from the rules screen.
- Six visual lessons using actual card components: objective, ranking, trump/dealing, exchanges, a legal-play exercise, and hearts scoring. Exercises never submit room commands.
- Short animations for incoming dealt/replacement cards, exchange selection, played cards, phase notices and results. Show the completed trick in the centre until the next card arrives so the winning play remains readable. Respect system reduced-motion preferences.
- A server-owned five-minute decision deadline for trump, participation/exchange, and each played card. Warn once after five minutes; disconnect after another minute. Preserve the seat/cards/scores and require explicit return. No automatic play or point penalty. Normal reconnection retains the deadline; explicit return after inactivity starts five fresh minutes.

The UI estimates time from a server timestamp plus a monotonic local clock. It does not decide when to disconnect. Presence updates and failed commands do not extend a turn. A successful action, even if the same player leads again, starts a new deadline. Inactive players block their turn until return or creator-confirmed restart. Changing this policy requires an explicit game/product decision.

## Recommended order

| Milestone | Deliverable | Depends on | Completion gate |
|---|---|---|---|
| 1. Operational visibility | Metrics, structured logs, Alloy pipeline, first dashboards/alerts | A deployment target and telemetry backend decision | A synthetic disconnect/reconnect and rejected action appear correctly; no private data leaked |
| 2. Accounts and users | Guest upgrade, login/logout, profile, revocable sessions, database migrations | Identity provider choice, database and public HTTPS origin | Web + physical mobile authentication/revocation tests pass; guest play still works |
| 3. Administration | Restricted user/room management with audited actions | Accounts and server-owned authorization | Role escalation, revoked permissions and cross-user access tests pass |
| 4. Match chat | Room-only text, reconnect history, mute/report/moderation | Accounts/admin for persistent moderation; chat protocol stays independent | Room isolation, rate limits, replay/reconnect and moderation tests pass |
| 5. Bots | Training opponents first; optional takeover considered separately | Explicit bot participation/takeover policy | Bots finish seeded matches using only authorized information; human takeover cannot duplicate turns |

Bots can be developed independently of account UI once their policy is decided. Start with explicitly created training rooms. Do not silently turn the new six-minute disconnection into bot control.

## 1. Observability with Grafana Alloy

Alloy collects, processes and forwards telemetry; it is not the database or dashboard UI. Choose either managed Grafana Cloud or a small self-hosted deployment with Prometheus/Mimir for metrics, Loki for logs and Grafana for visualization. Add Tempo only when traces justify the additional service. [Alloy introduction](https://grafana.com/docs/alloy/latest/introduction/)

First implementation:

1. Add a Node Prometheus client and a private `/metrics` endpoint. Collect default process metrics, active rooms/connections, in-progress matches, accepted/rejected actions, action duration, reconnect results, inactivity warnings/disconnections and server errors.
2. Emit structured JSON logs to stdout (or managed log files), using event names and bounded outcome codes. Never serialize raw Socket.IO payloads, snapshots, cookies, seat credentials, account tokens, hands, decks or chat bodies.
3. Configure Alloy `prometheus.scrape → prometheus.remote_write` for metrics and `loki.source.file → loki.process → loki.write` for managed log files. Use the Docker source only if the application is already containerized. Persist collector positions and define backend retention. Do not introduce Docker solely for log collection. [Prometheus collection](https://grafana.com/docs/alloy/latest/collect/prometheus-metrics/), [file log collection](https://grafana.com/docs/alloy/latest/reference/components/loki/loki.source.file/)
4. Create one operational dashboard: rooms/players, action latency, rejection reasons, reconnect success, inactive turns, memory and event-loop delay. Suggested initial alerts: server unavailable, sustained internal-error rate, abnormal reconnect failures and resource exhaustion. Calibrate thresholds with real traffic instead of treating every illegal-card rejection as an incident.

Keep metric labels bounded (`action`, `phase`, `outcome`, `reason`, `ruleset`). Do not label metrics with room codes, user IDs, nicknames, socket IDs or request IDs. If correlation IDs are needed in logs/traces, generate non-secret internal IDs and apply retention/access controls. Restrict `/metrics` to the collector/private network, and keep ingestion credentials server-side.

Later, initialize OpenTelemetry **before** importing instrumented server libraries. Add explicit spans around Socket.IO command processing; HTTP auto-instrumentation alone does not describe card actions. Export OTLP through Alloy with bounded batching/queues. Dropping telemetry is preferable to blocking a turn. [Node OTel setup](https://opentelemetry.io/docs/languages/js/getting-started/nodejs/), [Alloy OTel collection](https://grafana.com/docs/alloy/latest/collect/opentelemetry-data/)

Acceptance: deliberately reject a stale command, reconnect a client, trigger a six-minute timeout and simulate telemetry downtime. Confirm metrics/logs reflect them, gameplay continues, and captured telemetry contains no private cards or credentials.

## 2. Accounts, users and sessions

Keep guest entry. Add optional account creation/sign-in and allow a guest to link the current seat after verified authentication. Separate three concepts: persistent `userId`, device/account session, and temporary room seat credential. A socket ID remains a connection identifier only.

Use a maintained OIDC integration with authorization code + PKCE rather than implementing password storage. Choose a provider only after confirming web/native redirects, cost and deployment needs. A minimal profile contains stable ID, display name, account status and creation date; nicknames need not become unique identifiers. [Expo authentication](https://docs.expo.dev/guides/authentication/)

Add a single PostgreSQL database with migrations for `users`, `auth_identities` (unique issuer/subject pair), revocable `sessions` and, when needed, `admin_audit_events`. Store refresh/session credentials as hashes where the application owns them; rotate and expire them. A database for accounts does **not** make active in-memory matches durable. Continue stating the server-restart limitation until a separate match-persistence change is built and tested.

- **Web:** prefer a same-origin backend and Secure/HttpOnly/SameSite account-session cookies, with origin/CSRF protection for mutations. The current JS-readable guest token must not become the account-authentication design.
- **Native:** use platform authorization flow/deep links, keep short-lived access tokens in memory and rotating refresh credentials in SecureStore. Validate redirects on physical development builds.
- **Server:** derive identity from the verified session, never a submitted `userId` or role. Revalidate expiry/revocation for privileged actions and long-lived sockets. Revoke sessions on logout/suspension and define multiple-device behavior explicitly. [Session management guidance](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)

Acceptance: account linking preserves the guest's cards/seat; session fixation, stale refresh, forged identities, expired sessions and logout/revocation are rejected; restoring an account does not claim somebody else's seat. Public room events contain no email/provider identifiers.

Open choices before implementation: provider; whether sign-in uses email link, social identity or both; display-name editing; account deletion and retention. These do not block the current gameplay increment.

## 3. Administration

Start with explicit `player`, `moderator`, `admin` roles and a small server-owned permission table. The creator of a room is **not** a platform administrator. Hiding an admin screen is not authorization. Check permissions for every operation, including role changes while a socket remains connected; Socket.IO connection middleware runs once per connection. [Authorization guidance](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html), [Socket.IO middleware](https://socket.io/docs/v4/middlewares/)

Initial tools: search public account metadata, suspend/reinstate accounts, revoke sessions, inspect room phase/connection health and terminate a blocked room after confirmation. Default room inspection exposes public state, never hidden hands or credentials. Restrict role assignment to administrators with stronger authentication; bootstrap the first admin through a controlled server-side procedure.

Every privileged mutation records actor, target, action, reason, timestamp and outcome in a durable audit trail. Application telemetry is not a substitute for that trail. Keep authorization/command logic in the server; add a small separate admin route group in the existing client rather than a second frontend stack.

Acceptance: ordinary players and room creators cannot perform admin actions; moderators cannot assign roles; revocation takes effect during an existing socket session; failed privileged requests do not change state; confirmed room termination is visible to connected clients.

## 4. In-match chat

Add dedicated typed events (`chatSend`, `chatHistory`, message delivery) alongside game commands. A chat message uses a request ID and its own ordered message ID/cursor; **chat never increments the game revision**, starts a new turn, or resets the inactivity timer.

Server derives sender/room from membership, validates bounded plain text (proposed first limit: 500 characters), rate-limits by authenticated session/account and connection, and deduplicates resends. No HTML, attachments, embedded previews or unsolicited external delivery in the first chat release. Return an explicit acknowledgement and a bounded history window, initially the latest 50 messages. Socket.IO ordering does not guarantee durable delivery by itself; add cursor-based catch-up for the reconnect promise. [Socket.IO delivery guarantees](https://socket.io/docs/v4/delivery-guarantees/)

Use a collapsible drawer/panel on phones and a side panel on large screens. Show sender, time, pending/failed delivery and unread count. Add mute/report controls and moderator deletion with tombstones. Keep message content out of general telemetry. Decide retention and who can read reported content before implementing database storage; do not promise permanent history by default.

Acceptance: non-members cannot read/send; no cross-room leakage; replay does not duplicate messages; chat bursts cannot starve play; reconnect fills history gaps; moderator actions are authorized/audited. A player chatting without making the required game decision is still inactive for turn purposes.

## 5. Bots

First deliver **training bots** selected explicitly in the lobby, labelled “Bot” in all public player views. Keep practice-room results distinct from any future human-only statistics. Accounts are not required merely to train.

Implement a small bot policy in the server that receives the same authorized information as that seat: its own hand, public played cards, phase and legal actions. It must never inspect opponents' hands or the undealt deck. Start with deterministic heuristics for choosing trump, exchanging and selecting legal cards; introduce difficulty only after the baseline is reliable. Reuse the engine's legal-card calculation and scoring unchanged.

Schedule bot actions with bounded delays through the same serialized room action boundary. Cancel pending bot work on restart, room deletion or controller changes; stale decisions must be rejected/recomputed. Use seeded fixtures to reproduce choices, not a generic AI service or an LLM dependency.

**Optional takeover is a separate product decision.** Before allowing a bot to replace an inactive player, define opt-in at room creation, ownership of score/seat, whether it starts mid-hand or only between hands, how a returning human reclaims control, and whether spectators may see that hand. A human and bot must never control a seat simultaneously. The current six-minute timeout continues to reserve the human seat until this policy is explicitly implemented.

Acceptance: four bots finish complete seeded matches; a mixed table cannot produce illegal/double actions; private-information tests constrain the bot's inputs; pending bot jobs stop after restart; human takeover cannot race a queued play.

## Scope boundaries

Do not add microservices or horizontal room distribution for these features. Account/chat persistence and telemetry can coexist with a single in-memory game server. Do not bundle simulated betting, monetization, public matchmaking or a poker evaluator into these milestones. Each phase ships with its own tests, migration/rollback instructions where applicable, and updated operating limits.
