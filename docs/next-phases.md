# Remaining product and platform work

The three user-requested phases are now implemented in separate local commits, following the playable baseline. This replaces the earlier planning-only document. The implementation deliberately keeps one Node service, one Expo application and the pure shared game engine.

| Delivered phase | Implementation and limits |
|---|---|
| Accounts and admin | [Better Auth + SQLite, optional login, account-bound seats, suspension, session revocation and durable admin audit](accounts.md) |
| Grafana and metrics | [Protected Prometheus endpoint, Alloy collector, Prometheus storage, provisioned Grafana dashboard and local alerts](observability.md) |
| Chat and bots | [Bounded room text, creator mute controls, reconnect history, explicitly added practice opponents](chat-and-bots.md) |

The earlier plan proposed OIDC and PostgreSQL. This local release instead uses a maintained email/password implementation and SQLite, avoiding a paid identity service or a database server. Web uses HttpOnly cookies; native uses SecureStore. These are deliberate current choices, not promises that every previously suggested subfeature was implemented.

## Account follow-ups

Add verified email, recovery, password/profile screens, MFA for operators, account deletion/retention, and a supported external identity provider if needed. Guest-to-account seat linking requires an explicit ownership-transfer flow; signing in currently does not convert an existing guest seat. Add admin search, a separate moderator role, and public-state room inspection/closure only when operational needs justify them. Operator CLI role promotion remains distinct from normal registration. Validate native authentication on physical devices before release.

## Operations follow-ups

Select hosting and HTTPS origins; configure backups and restoration for accounts. Active match durability and horizontal scaling remain separate work. Add notification destinations for alerts and monitor Alloy itself. Loki log storage, OpenTelemetry traces, long-term metric storage and cloud deployment are not part of this local metrics increment. Keep identifiers, messages, credentials and cards out of metric labels and raw logs.

## Chat and bot follow-ups

Add a report/moderation queue and explicit retention policy before opening chat beyond private rooms. Chat is currently transient, with only 50 messages retained; persistent transcripts require a separate choice. Improve bot strategy and selectable difficulty using authorized information and reproducible tests.

Bot takeover of disconnected humans remains **unimplemented**. Before adding it, define room opt-in, score ownership, takeover timing, and how a returning human regains control without racing a queued bot action. The current five-minute warning plus one-minute disconnect policy still reserves human seats without autoplay.

## Variant scope

Jokers, alternative participation/scoring, a separate poker evaluator and fictional betting remain extension points described in the README. No purchases, monetary prizes or cash redemption are implemented. Any future monetization or prizes require their own assessment; simulated betting alone does not establish compliance.
