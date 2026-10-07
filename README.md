# Sobe e Desce

A playable, guest-only, four-person implementation of **traditional-pt-v1**, built with Expo, React Native, TypeScript and Socket.IO. The same screens run on web, Android and iOS. All game-facing copy is European Portuguese. These are this product's variant rules, not a claim that Portugal has one official ruleset.

## Run locally

Use **Node 24 LTS** (see `.nvmrc`) and npm. Install from the repository root:

```sh
npm ci
cp server/.env.example server/.env
cp client/.env.example client/.env
```

In separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev:web
```

Open `http://localhost:8081`. Enter a nickname, create a room, and share the six-character room code. Three friends enter the code; the creator starts the match. For a local demonstration, use four separate tabs or browser contexts. Web sessions are per tab. Duplicate nicknames are allowed; seats remain distinct.

On first visit, choose whether to open the six-step visual tutorial. It includes interactive trump, exchange and legal-play examples and is always available from **Como jogar**. The answer is a non-sensitive device preference (web localStorage/native SecureStore), separate from the per-tab guest session. Card/phase/result animations respect reduced-motion preferences and never delay authoritative game actions.

Each trump choice, participation/exchange decision and card play has **five minutes**, followed by a warning and **one minute of grace**. The server then disconnects the inactive player, preserving their seat/cards/scores. Select **Voltar à partida** to return with five fresh minutes; reloading or automatic reconnection does not bypass inactivity. There is no automatic card play, point penalty or bot takeover. Until return, the table waits at that seat or the creator can confirm a restart.

The default server is `http://localhost:3001`; `/health` returns a small health response. `client/.env` sets `EXPO_PUBLIC_SERVER_URL`, which is public and embedded at build time. Never put secrets in an `EXPO_PUBLIC_*` variable. Restart Expo after changing it.

### Phones on the local network

1. Put the development computer and phones on the same Wi-Fi network.
2. Find the computer's LAN IP, for example `192.168.1.50`.
3. Set `EXPO_PUBLIC_SERVER_URL=http://192.168.1.50:3001` in `client/.env`. `localhost` on a phone means the phone itself.
4. Add `http://192.168.1.50:8081` to the comma-separated `CLIENT_ORIGINS` in `server/.env` if using phone browsers. Keep `http://localhost:8081` for the computer.
5. The server binds `0.0.0.0` by default. Allow TCP ports 3001 and 8081 through the local firewall.
6. For browsers, visit `http://192.168.1.50:8081`. For native Expo, run `npm run start -w client -- --lan` and scan with an Expo Go version supporting SDK 57, or use an SDK 57 development build. A Metro tunnel does **not** expose the separate game server.

Native credentials use Expo SecureStore; web credentials use sessionStorage. Android/iOS native packaging and store submission are outside this MVP. A physical-device runtime test is still required before native release.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev:server` | Watch the TypeScript server |
| `npm run dev:web` | Start Expo web development |
| `npm run start -w client` | Start Expo for native development |
| `npm test` | Vitest engine and real Socket.IO integration tests |
| `npm run test:coverage` | Coverage; 80% engine/server thresholds |
| `npm run typecheck` | Strict TypeScript across server/shared and client |
| `npm run build:web` | Export web files into `client/dist` |
| `npm run build:server` | Compile server/shared into root `dist` |
| `npm run start -w server` | Run the compiled server |
| `npm run test:browser` | Playwright: four browser sessions through a full match; narrow-screen smoke |

For Playwright, first run `npx playwright install chromium`, or set `PLAYWRIGHT_CHROMIUM_PATH` to an installed Chromium executable. Tests start isolated servers on ports **3101** (game), **8181** (Expo) and **3102** (test clock control); they never reuse an ongoing development match. The client test URL is set explicitly, overriding the local `.env` server URL. `e2e/server.ts` provides the loopback-only clock control so six-minute inactivity behavior is tested without a six-minute wait. It is not part of the production server build or entry point. Tests need permission to bind localhost and launch a browser.

Native JS bundle checks (not device tests):

```sh
cd client
npx expo export --platform android --platform ios --output-dir dist-native
npx expo install --check
```

Serve the exported web app with SPA fallback to `index.html` for `/rules` and other routes. Host the Socket.IO server separately, keep it on one instance, and configure `CLIENT_ORIGINS` to the actual web origin. Use HTTPS/WSS together outside local development, and proxy both Socket.IO HTTP polling and WebSocket upgrade traffic. Static hosting alone cannot run the game server. No deployment is performed by this repository.

## Rules: traditional-pt-v1

The in-app **Como jogar** screen explains these rules in European Portuguese.

- Four fixed seats; individual competition. Everyone starts at 20. Seat 1 deals first; the dealer advances one seat each hand. Seat order wraps 1 → 2 → 3 → 4 → 1.
- Forty cards, no jokers or ranks 8–10. Ranking: **Ace > 7 > King > Jack > Queen > 6 > 5 > 4 > 3 > 2**. Only tricks count, not card point values.
- Deal three cards to everyone. The next seat after the dealer chooses trump, then everyone receives two more. The chooser must participate and leads the first trick.
- Resolve each player's participation and exchange together, sequentially starting with the chooser. A participant exchanges zero to five cards once. Replacements come from the remaining 20 cards; discards never return. All four players can exchange five without exhausting replacements prematurely.
- **Clubs forces everyone to participate.** Otherwise, anyone except the chooser may sit out. Sitting out means no exchange, no play, no score change. A sole participant plays five one-card tricks.
- Follow the led suit if possible, otherwise play trump if possible, otherwise any card. Among those cards, beat the currently winning card when possible. A player leading with the trump Ace in hand must play it.
- Highest trump wins; otherwise highest led-suit card wins. Winner leads the next trick. Exactly five tricks per hand.
- Participants subtract one point per won trick; zero tricks adds five. **Hearts doubles both:** subtract two per trick or add ten for none.
- Apply every score before deciding victory. Zero or below wins; display zero. Multiple players reaching zero in the same hand share victory. The creator starts subsequent hands and confirms new matches.

Examples: 20 with three spade tricks → 17; three heart tricks → 14; no heart tricks while participating → 30; sitting out → 20; 1 with two heart tricks → 0 and victory.

## Architecture

```text
client/   Expo Router routes, React Context/socket lifecycle, React Native UI,
          platform-specific session storage
server/   in-memory rooms, opaque sessions, payload validation, shuffle, transport
shared/   pure rules engine, domain types, immutable rules, typed event contracts
```

No Redux, database, generic game framework, bots, or background autoplayer. The engine imports no React, networking, filesystem or storage code. Its pure transition clones state before validating/mutating; rejection cannot modify its input. Tests supply deterministic decks; the server alone shuffles using cryptographic Fisher–Yates (`randomInt`).

Phases are `lobby → trumpSelection → participationExchange → trickPlay → handComplete → trumpSelection`, ending at `matchComplete` when someone reaches zero. Restart returns to the lobby. Lobby membership is owned by the room; active hand state is owned by the engine.

Every match stores its `rulesetId` and a copied, deeply frozen `Rules` configuration. The configuration holds initial score, exchange limit, compulsory suits, suit multipliers, overtaking, mandatory trump-Ace lead, and the explicitly supported at-or-below-zero/shared victory policy. Changing defaults does not change existing matches. Forty cards/four seats/five tricks stay explicit MVP rules, not speculative configurable machinery.

### Transport and privacy

- `create`/`join` return a 256-bit random credential privately to that socket. `resume` authenticates it. The credential is bound to a room seat, not a socket ID.
- `command` carries a request ID, expected revision and a strict discriminated action. Extra fields, including forged identity/score data, are rejected. Identity always comes from the authenticated connection.
- The single Node event loop processes each room command synchronously: validate membership/duplicate/revision, apply a pure transition, commit, publish. There is no `await` in this boundary. Add a per-room queue if future persistence introduces asynchronous work.
- Accepted request IDs are remembered for the lifetime of the seat. Duplicates are rejected, as are stale revisions. Failed game commands do not advance revision or mutate game state. Presence/membership changes do advance revision. A stale reply triggers a fresh authorized snapshot. The client disables pending actions and resynchronizes after uncertain acknowledgements; it never queues offline plays.
- Every `snapshot` explicitly projects public fields plus **only the recipient's hand and legal card IDs**. No deck, discards, other private hands, credentials or internal state spreads. Played cards and completed tricks are public.
- A reconnect restores the seat and sends a new snapshot. A second connection with the same credential supersedes the old socket. Disconnected seats stay reserved; no timeout takes decisions or plays cards.
- Each room carries a five-minute warning deadline and a further one-minute disconnect deadline. Server timers enforce them; the pure game engine has no time/network dependency. A warning refreshes authorized snapshots without changing the game revision. Presence changes and rejected commands do not reset deadlines. After a timeout the client must explicitly resume with `returnFromInactivity`; ordinary network recovery retains the original deadline. Successful decisions and explicit inactive return start a new five-minute window. When a hand/match ends or a room restarts, pending turn timers are cancelled.
- The creator can confirm a restart: scores/cards reset, connected players keep seats, disconnected seats and their credentials are removed. If the creator cannot reconnect, friends must create another room. There is no host migration.
- Schemas limit nickname/payload sizes; Socket.IO packets are capped at 8 KiB. Browser Origin checks apply to both polling and WebSocket connections. Native clients have no browser Origin. Per-connection rate limiting is 120 acknowledged requests per ten seconds; this is not full internet-scale abuse protection.

### Storage and limits

**All rooms and sessions live in memory on one server. Restarting the server ends every active match.** No durable recovery or horizontal scaling. Entirely disconnected rooms expire after 24 hours; connected rooms do not expire automatically. There is a cap of 100 rooms and 10,000 accepted commands per seat. These bounds are modest operational safeguards, not production capacity claims.

Web sessionStorage survives reloads in the same tab but closing the tab normally loses that seat credential. Opening a new independent tab creates a separate guest; duplicating a tab can copy browser sessionStorage and supersede the first connection. Native SecureStore persists across application launches. If storage is unavailable, an explicit warning explains that reload recovery is unavailable. A stolen credential can impersonate that guest. Web storage is JS-readable; the client renders nickname text through React, injects no user HTML and includes no third-party scripts. These are guest sessions, not an account authentication system.

## Future variants

Keep additions close to the relevant rules, engine, and contracts; do not create a universal card-game framework.

- **Alternative scoring/participation:** add a distinct immutable ruleset ID and supported configuration values, extend engine branches and boundary tests. Never mutate rules attached to active matches. Room selection should choose a supported server-side ruleset, not accept arbitrary client rules.
- **Jokers:** first specify identity/count, total ranking, whether a joker follows suit or counts as trump, overtaking, forced leads and exchange/deck effects. Then extend `Card`, deck creation, legal-play logic and trick evaluation with variant-specific tests. Do not assign implicit trump behavior.
- **Poker variant:** introduce a separate pure poker-hand evaluator with its own fixtures and a separate phase flow if needed. Do not change trick-winning comparison to evaluate poker combinations.
- **Fictional chips:** model a server-authoritative fictional balance/ledger and explicitly defined betting phases/actions in a new variant. No purchases, cash redemption, or prizes with monetary value in the proposed extension. Nothing involving chips is implemented here. Simulated betting does not automatically establish legal compliance; any monetization or prizes require a separate assessment.

Accounts, matchmaking, chat, leaderboards, payments, and store publishing are deliberately excluded.

The next phases for **accounts/users, administration, Grafana Alloy observability, match chat and bots** are planned in [docs/next-phases.md](docs/next-phases.md), with dependencies, privacy/authorization boundaries and acceptance criteria. They are not implemented by the tutorial/animation increment. In particular, bots do not yet fill or replace any seat.

## Verification and limitations

See [verification evidence](docs/verification.md) for actual checks and coverage. Engine tests cover ranking, forced plays, exchanges, phase transitions, scoring, rotation and individual/shared victory. Integration tests use real Socket.IO clients and verify privacy, authentication, duplicate/stale/illegal rejection, reconnect, takeover and confirmed restart. Browser tests play a full match through the real UI, including a narrow touch viewport.

No native simulator or physical device is available in the development environment. Native JavaScript export and TypeScript checks cannot establish native runtime behavior. There is no separate lint configuration; strict TypeScript and focused source review are used for this small MVP.

`npm audit` currently reports upstream Expo/React Native tooling and Expo Router transitive advisories (including `braces`, `node-forge`, `uuid`, and `decode-uri-component`). Some have no published compatible fix; npm's force recommendations include incompatible framework downgrades. We preserve the Expo SDK57 compatibility set and lockfile rather than claiming a clean audit. Reassess upstream fixes before internet-facing release. The authoritative server's direct runtime dependencies are Socket.IO and Zod; inspect its production dependency audit separately.

Dependency baseline: [Expo SDK57 compatibility manifest](https://raw.githubusercontent.com/expo/expo/sdk-57/packages/expo/bundledNativeModules.json), [Expo monorepo support](https://docs.expo.dev/guides/monorepos/), and [Expo Router session storage guidance](https://docs.expo.dev/router/advanced/authentication/).

## Optional accounts and administration

See [account setup and limits](docs/accounts.md). Guest play remains available. Account data persists in SQLite; active matches still end when the server restarts.
