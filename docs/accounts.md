# Accounts and administration

Phase 1 adds optional email/password accounts using Better Auth 1.7.7 and Node's SQLite adapter. Guest play remains available. The engine still has no account dependencies.

- Run `npm run dev:server` as before. Development generates a private secret beside `server/data/accounts.sqlite`; keep both across restarts. Back up SQLite with its WAL using SQLite backup tooling, or stop the server before copying the data directory.
- Configure `AUTH_BASE_URL` to the server's externally reachable URL, `CLIENT_ORIGINS` to explicit browser origins, and a random `BETTER_AUTH_SECRET` (at least 32 characters) in production. Serve HTTPS. Never expose the secret through an `EXPO_PUBLIC_` variable.
- Register through **Conta**, then grant the initial administrator role locally: `npm run admin:promote -w server -- registered@example.org`. This is an operator command, not a public registration option. No default administrator/password exists.
- Administrators can page through accounts, suspend/reactivate users, revoke their sessions, and review the last 50 audit entries. Mutations require a reason and confirmation. Self-suspension is refused. Role changes happen only through the local operator command.
- Browsers use HttpOnly SameSite cookies. Native clients keep a signed bearer credential in SecureStore. Room tokens remain separate, per-tab on web. Account-created seats require that same account on reconnection; guest seats keep the existing guest credential model. Logging into a different account does not transfer ownership of an existing account seat.
- Suspension/revocation disconnects active account sockets. Every authenticated packet checks the current account session before entering the synchronous game transition. No account email, role, credential, or private hand is published to a room.
- Auth credentials and account records persist, but rooms, cards, deadlines, and matches remain in process memory. A server restart still ends matches.

Limitations: no email delivery, address verification, password recovery, MFA, or external identity providers yet. Email is an unverified login identifier. Password changes are exposed by the protected auth endpoint; recovery requires a future verified channel. This local account release needs operational hardening before a public service (HTTPS, backups, verified email and recovery). Public guest access means account suspension cannot prevent someone returning as a new guest.

References: [Better Auth SQLite](https://better-auth.com/docs/adapters/sqlite), [Bearer plugin](https://better-auth.com/docs/plugins/bearer). The Node SQLite driver is built in and still carries a stability caveat on older supported Node releases; Node 24 LTS is the recommended runtime.
