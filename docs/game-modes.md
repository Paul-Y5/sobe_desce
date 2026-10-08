# Match modes

The room creator selects a mode in the lobby. Starting freezes the format and rules for the match. Changing modes requires a confirmed restart, which clears scores and competitive wins. Deck, ranking, trump, participation, exchanges and five-trick hands are shared by all modes. Each new game starts at 20 points.

| Mode | End condition | Score handling |
|---|---|---|
| Base | First to reach zero; shared winners when simultaneous | Clamp winning totals to zero |
| Competitive | First to close the configured number of lines | Each game uses Base scoring; a game win adds one competitive victory |
| Infinite | Creator confirms the end between completed hands | Keep positive, zero and negative scores; the lowest total wins |

## Competitive

One line is four game wins. Default: one line, first to four wins. The lobby permits one to ten lines; three lines means first to twelve wins. Everyone competes individually. This is a product scoring convention inspired by line-based scorekeeping, not a claim to implement Sueca rules.

Every winner of a shared game gets one victory. All victories are applied before checking the series target, so the competition can also have shared winners. The creator selects **Jogo seguinte** after a completed game; everyone returns to 20 points while their victory totals remain. The next dealer is the seat following the last game's dealer. Hand numbers restart inside each game; game numbers increase through the competition. No next game is allowed after the competitive target is reached.

The score view shows both current points and persistent victory marks grouped into lines of four. A restart begins a fresh competition; it is not the same operation as starting the next game.

## Infinite

This mode still starts at 20 points. Reaching or crossing zero does not end play. Hearts doubles gains and penalties, sitting out preserves the signed score, and there is no scoring cap or automatic score-based end condition. **Terminar modo Infinito** appears for the creator only after a completed hand and requires confirmation. The minimum current score wins; equal minimum scores share victory. Final negative scores are displayed unchanged.

The chart uses a zero baseline and renders negative values below it. It is available at any time through **Ver pontuações** and automatically after each completed hand. Avatars currently use nickname initials; uploaded profile photos are not implemented.

The original `traditional-pt-v1` rules are used by Base and Competitive. Infinite stores `traditional-pt-v1-infinite` with the explicitly typed `unbounded` zero-reaching policy. Format and victory accounting live in the pure engine; the server authorizes lobby changes, next-game and finish commands, then applies revision/deduplication checks as for other actions.

"Infinite" refers to the absence of a score-based finish. Single-process storage, reserved seats, finite numeric representation, and the documented operational room/session limits still apply. Restarting the server ends matches in every mode; this is not durable competition storage.
