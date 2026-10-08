import { expect, test } from 'vitest';
import { applyAction, createDeck, createGame, legalCards, scoreHand } from './engine.js';
import { INFINITE_RULES, TRADITIONAL_RULES } from './rules.js';
import type { GameState } from './types.js';

function finishSoloHand(state: GameState, chooser: number) {
  let g = applyAction(state, chooser, { type: 'chooseTrump', suit: 'hearts' });
  g = applyAction(g, chooser, { type: 'exchange', cardIds: [] });
  for (let offset = 1; offset < 4; offset++) g = applyAction(g, (chooser + offset) % 4, { type: 'sitOut' });
  for (let i = 0; i < 5; i++) {
    const hand = g.players[chooser].hand;
    const card = hand.find(c => c.suit === 'hearts' && c.rank === 'A') ?? hand[0];
    g = applyAction(g, chooser, { type: 'play', cardId: card.id });
  }
  return g;
}

test('infinite mode keeps negative scores, continues below zero and ends only between hands', () => {
  const original = createGame(INFINITE_RULES, { mode: 'infinite', linesToWin: 1 });
  let game = applyAction(original, 0, { type: 'start' }, createDeck());
  expect(() => applyAction(game, 0, { type: 'finishInfinite', confirmed: true })).toThrow();
  game.players[1].score = -2;
  game = finishSoloHand(game, 1);
  expect(game.players[1].score).toBe(-12); expect(game.phase).toBe('handComplete'); expect(game.winners).toEqual([]);
  game.players[2].score = -12;
  const result = applyAction(game, 0, { type: 'finishInfinite', confirmed: true });
  expect(result.phase).toBe('matchComplete'); expect(result.winners).toEqual([1, 2]);
  expect(result.players[1].score).toBe(-12); expect(game.phase).toBe('handComplete');
  expect(() => applyAction(result, 0, { type: 'nextHand' }, createDeck())).toThrow();
  expect(applyAction(game, 0, { type: 'nextHand' }, createDeck()).phase).toBe('trumpSelection');
});

test('competitive mode awards game wins, resets points and wins at four games by default', () => {
  let game = createGame(TRADITIONAL_RULES, { mode: 'competitive', linesToWin: 1 });
  for (let n = 0; n < 4; n++) {
    game = applyAction(game, 0, { type: n ? 'nextGame' : 'start' }, createDeck());
    expect(game.players.map(p => p.score)).toEqual([20, 20, 20, 20]);
    expect(game.gameNumber).toBe(n + 1);
    // Exercise the boundary with the current chooser one hand from a game/series win.
    const chooser = game.chooser;
    game.players[chooser].score = 1;
    game.gameWins[chooser] = n;
    game = finishSoloHand(game, chooser);
    expect(game.gameWins[chooser]).toBe(n + 1);
    expect(game.competitionWinners).toEqual(n === 3 ? [chooser] : []);
  }
  expect(() => applyAction(game, 0, { type: 'nextGame' }, createDeck())).toThrow();
});

test('three competitive lines require twelve wins and shared game wins are counted together', () => {
  let game = applyAction(createGame(TRADITIONAL_RULES, { mode: 'competitive', linesToWin: 3 }), 0, { type: 'start' }, createDeck());
  game = applyAction(game, game.chooser, { type: 'chooseTrump', suit: 'spades' });
  for (let i = 0; i < 4; i++) game = applyAction(game, game.turn!, { type: 'exchange', cardIds: [] });
  game.players.forEach(player => { player.score = 1; });
  game.gameWins = [11, 11, 11, 11];
  while (game.phase === 'trickPlay') {
    const seat = game.turn!;
    game = applyAction(game, seat, { type: 'play', cardId: legalCards(game.players[seat].hand, game.trick, game.trump!, game.rules)[0].id });
  }
  const winners = game.players.flatMap((player, seat) => player.tricks > 0 ? [seat] : []);
  expect(winners.length).toBeGreaterThan(1);
  expect(game.winners).toEqual(winners); expect(game.competitionWinners).toEqual(winners);
  expect(game.gameWins).toEqual(game.players.map(player => player.tricks > 0 ? 12 : 11));
  expect(game.players.map(player => player.score)).toEqual(game.players.map(player => player.tricks > 0 ? 0 : 6));
});

test('base keeps the original zero clamp and does not allow series or infinite controls', () => {
  const game = createGame();
  expect(game.format.mode).toBe('base');
  expect(() => applyAction(game, 0, { type: 'nextGame' }, createDeck())).toThrow();
  expect(() => applyAction(game, 0, { type: 'finishInfinite', confirmed: true })).toThrow();
  const players = [{ score: 1, tricks: 2, participating: true }, { score: -20, tricks: 0, participating: true }];
  expect(scoreHand(players, 'hearts', TRADITIONAL_RULES).scores[0]).toBe(0);
  expect(scoreHand(players, 'hearts', INFINITE_RULES)).toEqual({ scores: [-3, -10], winners: [] });
});
