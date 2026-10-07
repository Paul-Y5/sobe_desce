import { expect, test } from 'vitest';
import { chooseBotAction, type BotView } from './bot.js';
import { applyAction, createDeck, createGame, legalCards } from '../shared/engine.js';

test('deterministic bot decisions remain legal across 80 varied hands without hidden information', () => {
  for (let seed = 1; seed <= 80; seed++) {
    let random = seed;
    const deck = createDeck();
    for (let i = deck.length - 1; i > 0; i--) {
      random = (Math.imul(random, 1664525) + 1013904223) >>> 0;
      const j = random % (i + 1); [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    let state = applyAction(createGame(), 0, { type: 'start' }, deck);
    let decisions = 0;
    while (state.turn !== null) {
      const view: BotView = { you: state.turn, turn: state.turn, phase: state.phase, hand: state.players[state.turn].hand, trump: state.trump, rules: state.rules,
        legalCardIds: state.phase === 'trickPlay' ? legalCards(state.players[state.turn].hand, state.trick, state.trump!, state.rules).map(c => c.id) : [] };
      const action = chooseBotAction(view);
      expect(action).toEqual(chooseBotAction(structuredClone(view)));
      expect(action).not.toBeNull();
      state = applyAction(state, state.turn, action!);
      expect(++decisions).toBeLessThanOrEqual(25);
    }
    expect(state.phase).toBe('handComplete'); expect(state.completedTricks).toHaveLength(5);
    expect(state.players.reduce((sum, player) => sum + player.tricks, 0)).toBe(5);
  }
});
