# MVP verification evidence

## Tutorial, motion and inactivity increment — 2026-10-07

Added a remembered first-visit rules question, a six-step interactive visual tutorial, card/phase/result animation with reduced-motion support, and the user-requested inactivity policy: warn at five minutes, disconnect after one further minute, reserve the seat, require explicit return. The engine remains independent of clocks and transport. Accounts, administration, Alloy, chat and bots are planned only in `docs/next-phases.md`.

Test-first evidence: the new room deadline test initially failed on a missing `turnDeadline`; the enforcement test then failed because the five-minute warning was not emitted. Both pass after server implementation. The tutorial browser test initially failed because the onboarding question was absent, then passed after implementing the flow and exercises. The inactivity browser test exposed a missing clock refresh at the warning boundary; the server now publishes an authorized snapshot without advancing the game revision, and that test passes.

Verification for this increment:

- `npm run typecheck` and `npm run build:server`: pass.
- `npm run build:web` and Android/iOS Hermes exports: pass for the updated client. This does not replace native runtime testing.
- `npm run test:coverage`: **20 tests pass** (16 engine, 4 server). Combined coverage: **93.78% statements, 88.35% branches, 95.89% functions, 96.95% lines**. All 80% thresholds pass.
- `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`: **4 pass** (43.9 seconds): full four-client match with motion; narrow viewport; tutorial with reduced motion and remembered answer; real inactivity disconnect, reload and manual return with unchanged cards.
- Browser inactivity tests use `e2e/server.ts` and a loopback clock-control service, separate from the production entry point. Only server time advances; Socket.IO and the browser continue to run normally. Existing development rooms are not used by these tests.
- Server tests verify one warning only, five-minute/grace boundaries, no score/card changes on expiry, reconnect preserving deadlines, explicit return renewing the deadline, and cancellation of obsolete timers on decisions/restart.
- A final focused browser test also verifies that acting during the one-minute grace removes the obsolete warning and starts a fresh deadline (pass, 15.6 seconds including startup).

Device/simulator runtime testing remains unavailable. Browser tests prove the client interaction, not native runtime behavior. No account, chat, bot or telemetry deployment has been performed.

## Original MVP evidence

Verified on 2026-10-06. The workspace began empty and had no usable Git repository or project conventions. Requirements and user journeys came from the requested MVP specification. No commits or deployment were performed.

## Dependency repair on 2026-10-07

The reported startup failure was reproduced by inspecting the changed installation: Expo 44.0.6, Router 58.0.16 and React Native 0.72.17 were mixed with SDK57 packages. Expo 44's local launcher delegates to global `expo-cli`, causing the legacy-CLI warning and missing `expo/config-plugins` error. Restored the tested exact client versions and regenerated `package-lock.json` with `npm install`; no global packages were changed.

After repair, the local Expo CLI reports 57.0.28, `expo/config-plugins` resolves, strict TypeScript and web/server builds pass, and all 18 Vitest tests pass. Both Playwright tests also pass (35.4 seconds), including a full four-client match and narrow-screen smoke. The README now explains this failure mode and why forcing npm audit's framework downgrades is incompatible with this project.

## Implemented journeys

1. Four guests create/join a room, choose trump, exchange, and play a hand with private cards.
2. Invalid, out-of-turn, stale and duplicate commands leave the match unchanged.
3. A disconnected guest recovers the same seat; a creator confirms a restart when needed.
4. Dealer rotation and subsequent hands lead to individual or shared victory.
5. A browser player uses the same React Native interface at desktop and narrow touch widths.

## Test-first evidence

The engine tests were run before `shared/engine.ts` existed; Vitest failed because the imported implementation was missing. After implementation, 14 of the initial 15 tests passed. The remaining complete-match fixture repeated the same deal with all players participating and did not necessarily converge to zero. It was corrected to use a legal sequence with subsequent sole-participant heart hands, rather than inventing a match-length rule. All 15 then passed.

The server integration tests were also run before `server/rooms.ts` existed and failed on the missing implementation. After implementation, localhost binding was initially blocked by the sandbox (`EPERM`); running with localhost access allowed the tests to execute. The complete-hand/privacy/reconnect test passed. The other test used a non-hex fabricated token, correctly receiving `INVALID_PAYLOAD`; the fixture was corrected to use an unknown, valid-format token and assert `INVALID_SESSION`. Both tests passed.

A later engine test explicitly verifies shared winners at the `matchComplete` transition and rejection of a held-but-illegal card. Final Vitest total: **18 passing tests**.

## Results

| Check | Result | Evidence |
|---|---|---|
| Engine behavior | PASS | 16 cases in `shared/engine.test.ts`, including parameterized score examples |
| Real multiplayer integration | PASS | 2 tests in `server/rooms.test.ts`, real HTTP server and Socket.IO clients |
| Strict TypeScript | PASS | `npm run typecheck` checks server/shared/tests and Expo client |
| Web export | PASS | `npm run build:web` exports `client/dist` |
| Server compilation | PASS | `npm run build:server` emits Node ESM under root `dist` |
| Browser full match | PASS | `PLAYWRIGHT_CHROMIUM_PATH=/usr/bin/chromium npm run test:browser`; four independent contexts, one at 375×812 with touch, exchanges, five tricks, reload recovery, subsequent hands, victory, restart/cancel |
| Narrow-screen smoke | PASS | Same Playwright suite: home, rules and lobby; no horizontal document overflow |
| Android JS export | PASS | `npx expo export --platform android --platform ios --output-dir dist-native` generated Android Hermes bundle |
| iOS JS export | PASS | Same command generated iOS Hermes bundle |
| Native device/simulator smoke | NOT RUN | No `adb`, Android emulator or `xcrun` available; bundle export is not a runtime test |
| Expo compatibility check | LIMITED | Online `npx expo install --check` timed out; `EXPO_OFFLINE=1 npx expo install --check` reported dependencies up to date and warned offline validation is unreliable |
| Runtime server audit | PASS | `npm audit --workspace server --omit=dev`: 0 vulnerabilities |
| Full dependency audit | OPEN FINDINGS | Online audit: 29 findings, 10 moderate and 19 high, including propagated Expo/Router dependency findings; no claim of a clean full audit |
| Lint | NOT CONFIGURED | No separate linter; strict TypeScript and focused source review |
| Source review | COMPLETED | Reviewed action commit boundary, payload schemas, private projections, storage adapters, error paths and imports; no hardcoded server secrets or user HTML injection |

The first web export found that Metro does not resolve Node-style `.js` specifiers to `.ts` sources in the shared entry point. The entry now uses explicit `.ts` exports, and TypeScript's `rewriteRelativeImportExtensions` emits `.js` in the server build. Both exports and type checks subsequently passed.

Screenshots from the browser tests are generated under `test-results/` (ignored). They were inspected at desktop and phone widths. The phone hand was compacted after inspection so all five cards fit in one row at 375px; controls remain at least 44px wide.

## Coverage

`npm run test:coverage`:

| Scope | Statements | Branches | Functions | Lines |
|---|---:|---:|---:|---:|
| Engine + room server | 94.44% | 88.26% | 95.58% | 96.95% |
| Engine | 99.26% | 98.46% | 100% | 98.92% |
| Room server | 90.13% | 83.78% | 91.17% | 95.19% |

All configured 80% thresholds pass. This coverage targets `shared/engine.ts` and `server/rooms.ts`; it is **not** a claim of 80% UI coverage. Browser tests separately exercise the real UI. Operational expiry timers, all capacity/rate-limit branches and native storage failures are not exhaustively tested.

## Remaining limits

- Rooms/sessions are in-memory and single-instance; a server restart ends all matches.
- No native runtime test, store package, deployment, load test or penetration test was performed.
- Full dependency audit findings remain in the pinned Expo SDK57 tree. No incompatible `audit fix --force` changes were applied. See the README for the decision and production considerations.
- Web recovery requires the same browser tab's sessionStorage. If a creator permanently loses their credential, others must create a new room.
- Browser smoke uses local development servers. Production HTTPS proxy configuration and final hosting still need verification when deployed.
- The final source snapshot is delivered in the workspace with `package-lock.json`; there was no usable Git history to review or checkpoint.
