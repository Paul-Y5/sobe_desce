# Room chat and training bots

Phase 3 uses the existing Socket.IO server and React Native screens. No separate chat service or AI provider is required.

## Chat

Open **Conversa da sala** in the lobby or during play. Messages are plain text (React Native `Text`, never HTML), up to 500 characters. The server derives the sender and room from the seat session. Only current room participants receive chat events. The latest 50 messages and room mute state are restored on reconnection; older messages are intentionally unavailable.

`chat` and `moderateChat` have their own request IDs and acknowledgement flow. They do not change game revision, turn, cards, scores, or decision deadline. Accepted IDs are deduplicated for the seat lifetime, with a 1,000-request cap. A participant may send five messages in ten seconds, including across reconnects. General socket limits still apply. After an uncertain acknowledgement the UI asks players to inspect history before manually repeating a message.

The creator can silence/unsilence other human seats. This is room moderation, distinct from account administration. Mutes survive reconnection. Restarting a match clears room chat and mutes; disconnecting does not. There is no durable transcript, report queue, attachment, private message or content classifier. Suspension/revocation of an account also closes its chat socket. Guest users can create fresh identities, so this is not comprehensive public-service abuse prevention.

## Bots

Only the creator may add/remove a bot in an empty lobby seat. Occupied human seats cannot be replaced. The lobby labels any mixed table **Mesa de treino · inclui bots**, and bots remain visibly identified during play. Removing a bot during an active match is rejected. A restart keeps bots in their fixed seats.

Bots use a small deterministic policy in `server/bot.ts`: choose the strongest suit in their first three cards, participate, exchange weak non-trumps, and play the weakest legal card. Identical authorized inputs yield identical choices. They receive their own hand and public state, never opponents' hands, discarded cards or the draw pile. The server applies their actions through the same validation/revision/transition boundary used for human commands. They are basic practice opponents, not advanced strategy players.

Decisions are scheduled 700 ms apart. Pending jobs are cancelled/recomputed on state changes, stopped on restart/room expiry/server shutdown, and paused while no human is connected. The host continues to start each subsequent hand. Five-minute warning + one-minute grace applies to humans; bots never take over a disconnected or inactive human. Existing reconnection and reservation rules remain unchanged.

Tests exercise a real human socket plus three bots through five tricks and a subsequent hand, restart cancellation, and 80 reproducible shuffled hands using only the limited bot view. Browser tests use two people and two bots, room messages, moderation, reload recovery, and a narrow touch viewport.
