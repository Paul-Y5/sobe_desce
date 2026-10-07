import { describe, expect, it } from 'vitest';
import { applyAction, beats, createDeck, createGame, legalCards, scoreHand } from './engine.js';
import { TRADITIONAL_RULES } from './rules.js';
import type { Card, GameState, Suit } from './types.js';

const card = (suit: Suit, rank: Card['rank']): Card => ({ id: `${suit}-${rank}`, suit, rank });
function exchangePhase(suit: Suit = 'spades') {
  let g = applyAction(createGame(), 0, { type: 'start' }, createDeck());
  return applyAction(g, 1, { type: 'chooseTrump', suit });
}
function playing(suit: Suit = 'spades') {
  let g = exchangePhase(suit);
  for (let i = 0; i < 4; i++) g = applyAction(g, g.turn!, { type: 'exchange', cardIds: [] });
  return g;
}
function finish(g: GameState) {
  while (g.phase === 'trickPlay') {
    const seat = g.turn!;
    g = applyAction(g, seat, { type: 'play', cardId: legalCards(g.players[seat].hand, g.trick, g.trump!, g.rules)[0].id });
  }
  return g;
}

describe('traditional-pt-v1 engine', () => {
  it('has forty unique cards and the complete Portuguese ranking', () => {
    expect(createDeck()).toHaveLength(40);
    expect(new Set(createDeck().map(c => c.id)).size).toBe(40);
    const ranks = ['2', '3', '4', '5', '6', 'Q', 'J', 'K', '7', 'A'] as const;
    for (let i = 1; i < ranks.length; i++) expect(beats(card('hearts', ranks[i]), card('hearts', ranks[i - 1]), 'hearts', 'clubs')).toBe(true);
    expect(beats(card('clubs', '2'), card('hearts', 'A'), 'hearts', 'clubs')).toBe(true);
    expect(beats(card('diamonds', 'A'), card('hearts', '2'), 'hearts', 'clubs')).toBe(false);
    expect(beats(card('hearts', 'A'), card('clubs', '2'), 'hearts', 'clubs')).toBe(false);
  });
  it('deals three, asks the next seat for trump, then deals two', () => {
    const lobby = createGame();
    const g = applyAction(lobby, 0, { type: 'start' }, createDeck());
    expect(lobby.phase).toBe('lobby');
    expect(g.phase).toBe('trumpSelection');
    expect(g.turn).toBe(1);
    expect(g.players.map(p => p.hand.length)).toEqual([3, 3, 3, 3]);
    const next = applyAction(g, 1, { type: 'chooseTrump', suit: 'hearts' });
    expect(next.players.map(p => p.hand.length)).toEqual([5, 5, 5, 5]);
    expect(next.players[1].participating).toBe(true);
    expect(next.deck).toHaveLength(20);
    expect(next.rulesetId).toBe('traditional-pt-v1');
    expect(Object.isFrozen(next.rules.scoringMultipliers)).toBe(true);
  });
  it('exchanges sequentially without returning discards or duplicating cards', () => {
    let g = exchangePhase();
    for (let n = 0; n < 4; n++) {
      const old = g.players[g.turn!].hand.map(c => c.id);
      g = applyAction(g, g.turn!, { type: 'exchange', cardIds: old });
      expect(g.discards.map(c => c.id)).toEqual(expect.arrayContaining(old));
      expect(g.deck.some(c => old.includes(c.id))).toBe(false);
    }
    expect(g.deck).toHaveLength(0);
    expect(g.discards).toHaveLength(20);
    const all = [...g.discards, ...g.players.flatMap(p => p.hand)];
    expect(new Set(all.map(c => c.id)).size).toBe(40);
    expect(g.phase).toBe('trickPlay');
    expect(g.turn).toBe(1);
  });
  it('rejects wrong turns, phases, duplicate/foreign exchange cards without mutation', () => {
    const g = exchangePhase();
    const saved = structuredClone(g);
    const id = g.players[1].hand[0].id;
    for (const [seat, action] of [
      [0, { type: 'exchange', cardIds: [] }],
      [1, { type: 'chooseTrump', suit: 'hearts' }],
      [1, { type: 'exchange', cardIds: [id, id] }],
      [1, { type: 'exchange', cardIds: ['fake'] }],
      [1, { type: 'exchange', cardIds: Array(6).fill(id) }],
      [1, { type: 'sitOut' }],
    ] as const) expect(() => applyAction(g, seat, action as any)).toThrow();
    expect(g).toEqual(saved);
    expect(() => applyAction(createGame(), 0, { type: 'start' }, [])).toThrow();
  });
  it('clubs forces participation, other suits permit three players to sit out', () => {
    let clubs = exchangePhase('clubs');
    clubs = applyAction(clubs, 1, { type: 'exchange', cardIds: [] });
    expect(() => applyAction(clubs, 2, { type: 'sitOut' })).toThrow();
    let g = exchangePhase();
    g = applyAction(g, 1, { type: 'exchange', cardIds: [] });
    for (const seat of [2, 3, 0]) g = applyAction(g, seat, { type: 'sitOut' });
    g = finish(g);
    expect(g.completedTricks).toHaveLength(5);
    expect(g.players.map(p => p.score)).toEqual([20, 15, 20, 20]);
    expect(g.players.filter(p => !p.participating).every(p => p.hand.length === 5)).toBe(true);
  });
  it('must follow, trump, overtake when possible, and lead the trump Ace', () => {
    const h2 = card('hearts', '2'), h7 = card('hearts', '7'), hA = card('hearts', 'A');
    const s2 = card('spades', '2'), sA = card('spades', 'A'), cA = card('clubs', 'A');
    const led = [{ seat: 0, card: h7 }];
    expect(legalCards([h2, hA, sA], led, 'spades', TRADITIONAL_RULES)).toEqual([hA]);
    expect(legalCards([h2, sA], led, 'spades', TRADITIONAL_RULES)).toEqual([h2]);
    expect(legalCards([cA, s2, sA], led, 'spades', TRADITIONAL_RULES)).toEqual([s2, sA]);
    expect(legalCards([cA, s2, sA], [...led, { seat: 1, card: s2 }], 'spades', TRADITIONAL_RULES)).toEqual([sA]);
    expect(legalCards([hA, h2, sA], [...led, { seat: 1, card: s2 }], 'spades', TRADITIONAL_RULES)).toEqual([hA, h2]);
    expect(legalCards([cA], led, 'spades', TRADITIONAL_RULES)).toEqual([cA]);
    expect(legalCards([cA, sA], [], 'spades', TRADITIONAL_RULES)).toEqual([sA]);
    expect(legalCards([cA, s2], [], 'spades', TRADITIONAL_RULES)).toEqual([cA, s2]);
    expect(legalCards([h2, hA], led, 'spades', { ...TRADITIONAL_RULES, mustOvertake: false })).toEqual([h2, hA]);
    expect(legalCards([cA, sA], [], 'spades', { ...TRADITIONAL_RULES, mustLeadTrumpAce: false })).toEqual([cA, sA]);
  });
  it.each([
    [20, 3, true, 'spades', 17], [20, 3, true, 'hearts', 14],
    [20, 0, true, 'hearts', 30], [20, 0, false, 'spades', 20],
    [1, 2, true, 'hearts', 0], [20, 0, true, 'clubs', 25],
  ] as const)('scores %s with %s tricks, participating %s, trump %s → %s', (score, tricks, participating, trump, result) => {
    expect(scoreHand([{ score, tricks, participating }], trump, TRADITIONAL_RULES).scores).toEqual([result]);
  });
  it('applies every score before declaring shared victory', () => {
    expect(scoreHand([
      { score: 1, tricks: 2, participating: true }, { score: 2, tricks: 3, participating: true },
      { score: 20, tricks: 0, participating: true }, { score: 20, tricks: 0, participating: false },
    ], 'hearts', TRADITIONAL_RULES)).toEqual({ scores: [0, 0, 30, 20], winners: [0, 1] });
  });
  it('transitions to matchComplete with shared winners and rejects a held but illegal card', () => {
    const g = playing();
    const expected = finish(g).players.flatMap((p, i) => p.tricks > 0 ? [i] : []);
    g.players.forEach(p => { p.score = 1; });
    const complete = finish(g);
    expect(complete.phase).toBe('matchComplete');
    expect(complete.winners).toEqual(expected);
    expect(complete.winners.length).toBeGreaterThan(1);
    const illegal = playing();
    illegal.players[illegal.turn!].hand = [card('spades', 'A'), card('hearts', '2')];
    const saved = structuredClone(illegal);
    expect(() => applyAction(illegal, illegal.turn!, { type: 'play', cardId: 'hearts-2' })).toThrow('ILLEGAL_CARD');
    expect(illegal).toEqual(saved);
  });
  it('scores exactly five tricks, rotates dealer, keeps scores and resets hand state', () => {
    const g = finish(playing());
    expect(g.phase).toBe('handComplete');
    expect(g.completedTricks).toHaveLength(5);
    expect(g.players.reduce((n, p) => n + p.tricks, 0)).toBe(5);
    expect(g.players.every(p => p.hand.length === 0)).toBe(true);
    expect(g.completedTricks[1].plays[0].seat).toBe(g.completedTricks[0].winner);
    const next = applyAction(g, 0, { type: 'nextHand' }, createDeck());
    expect(next.dealer).toBe(1);
    expect(next.turn).toBe(2);
    expect(next.handNumber).toBe(2);
    expect(next.players.map(p => p.score)).toEqual(g.players.map(p => p.score));
    expect(next.completedTricks).toHaveLength(0);
  });
  it('rejects illegal plays and finishes a complete match', () => {
    let g = playing();
    expect(() => applyAction(g, g.turn!, { type: 'play', cardId: 'fake' })).toThrow();
    let hands = 0;
    while (g.phase !== 'matchComplete' && hands < 100) {
      g = finish(g);
      hands++;
      if (g.phase === 'handComplete') {
        g = applyAction(g, 0, { type: 'nextHand' }, createDeck());
        g = applyAction(g, g.turn!, { type: 'chooseTrump', suit: 'hearts' });
        g = applyAction(g, g.turn!, { type: 'exchange', cardIds: [] });
        for (let i = 0; i < 3; i++) g = applyAction(g, g.turn!, { type: 'sitOut' });
      }
    }
    expect(g.phase).toBe('matchComplete');
    expect(g.winners.length).toBeGreaterThan(0);
    expect(g.winners.every(seat => g.players[seat].score === 0)).toBe(true);
    expect(() => applyAction(g, 0, { type: 'nextHand' }, createDeck())).toThrow();
  });
});
