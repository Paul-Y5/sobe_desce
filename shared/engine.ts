import { BASE_FORMAT, freezeRules, TRADITIONAL_RULES } from './rules.js';
import { RANKS, SUITS, type Card, type GameAction, type GameState, type MatchFormat, type Play, type Rules, type Suit } from './types.js';

export class GameError extends Error {
  constructor(public code: string) { super(code); }
}
function requireCondition(ok: unknown, code: string): asserts ok {
  if (!ok) throw new GameError(code);
}
export function createDeck(): Card[] {
  return SUITS.flatMap(suit => RANKS.map(rank => ({ id: `${suit}-${rank}`, suit, rank })));
}
export function createGame(rules: Rules = TRADITIONAL_RULES, format: MatchFormat = BASE_FORMAT): GameState {
  requireCondition(['base', 'competitive', 'infinite'].includes(format.mode) && Number.isInteger(format.linesToWin) && format.linesToWin >= 1 && format.linesToWin <= 10 && (format.mode === 'competitive' || format.linesToWin === 1), 'INVALID_FORMAT');
  requireCondition((format.mode === 'infinite') === (rules.zeroReachingPolicy === 'unbounded'), 'INVALID_FORMAT');
  return {
    format: Object.freeze({ ...format }), gameNumber: 1, gameWins: [0, 0, 0, 0], competitionWinners: [],
    rulesetId: rules.id, rules: freezeRules(rules), phase: 'lobby', dealer: 0, chooser: 1,
    turn: null, handNumber: 0, trump: null,
    players: Array.from({ length: 4 }, () => ({ hand: [], score: rules.initialScore, tricks: 0, participating: null })),
    deck: [], discards: [], decisionsTaken: 0, trick: [], completedTricks: [], winners: [], scoreChanges: [],
  };
}
export function beats(candidate: Card, incumbent: Card, led: Suit, trump: Suit): boolean {
  if (candidate.suit === incumbent.suit) return RANKS.indexOf(candidate.rank) > RANKS.indexOf(incumbent.rank);
  if (candidate.suit === trump) return true;
  if (incumbent.suit === trump) return false;
  return candidate.suit === led;
}
function winningPlay(trick: Play[], trump: Suit): Play {
  return trick.reduce((best, play) => beats(play.card, best.card, trick[0].card.suit, trump) ? play : best);
}
export function legalCards(hand: Card[], trick: Play[], trump: Suit, rules: Rules): Card[] {
  if (!trick.length) {
    const ace = hand.find(c => c.suit === trump && c.rank === 'A');
    return rules.mustLeadTrumpAce && ace ? [ace] : hand;
  }
  const led = trick[0].card.suit;
  const following = hand.filter(c => c.suit === led);
  const trumps = hand.filter(c => c.suit === trump);
  const candidates = following.length ? following : trumps.length ? trumps : hand;
  const winner = winningPlay(trick, trump).card;
  const overtaking = candidates.filter(c => beats(c, winner, led, trump));
  return rules.mustOvertake && overtaking.length ? overtaking : candidates;
}
export function scoreHand(players: { score: number; tricks: number; participating: boolean | null }[], trump: Suit, rules: Rules) {
  const multiplier = rules.scoringMultipliers[trump];
  const scores = players.map(p => {
    const result = p.score + (p.participating ? (p.tricks ? -p.tricks : 5) * multiplier : 0);
    return rules.zeroReachingPolicy === 'unbounded' ? result : Math.max(0, result);
  });
  const winners = rules.zeroReachingPolicy === 'unbounded' ? [] : scores.flatMap((score, seat) => score === 0 ? [seat] : []);
  return { scores, winners };
}
function deal(g: GameState, count: number) {
  for (let n = 0; n < count; n++) {
    for (let offset = 1; offset <= 4; offset++) g.players[(g.dealer + offset) % 4].hand.push(g.deck.shift()!);
  }
}
function beginHand(g: GameState, deck: Card[] | undefined) {
  const canonical = createDeck();
  requireCondition(deck?.length === 40 && new Set(deck.map(c => c.id)).size === 40 && deck.every(c => canonical.some(d => d.id === c.id && d.suit === c.suit && d.rank === c.rank)), 'INVALID_DECK');
  g.deck = structuredClone(deck);
  g.discards = []; g.trick = []; g.completedTricks = []; g.scoreChanges = [];
  g.decisionsTaken = 0; g.trump = null; g.handNumber++;
  g.chooser = (g.dealer + 1) % 4; g.turn = g.chooser;
  for (const p of g.players) { p.hand = []; p.tricks = 0; p.participating = null; }
  deal(g, 3);
  g.phase = 'trumpSelection';
}
function finishDecision(g: GameState) {
  g.decisionsTaken++;
  if (g.decisionsTaken === 4) { g.phase = 'trickPlay'; g.turn = g.chooser; }
  else g.turn = (g.turn! + 1) % 4;
}

/** Pure transition: even a rejected action leaves the input untouched. Shuffling belongs to the server. */
export function applyAction(state: GameState, seat: number, action: GameAction, deck?: Card[]): GameState {
  requireCondition(Number.isInteger(seat) && seat >= 0 && seat < 4, 'NOT_MEMBER');
  const g = structuredClone(state);
  g.rules = freezeRules(state.rules);
  g.format = Object.freeze({ ...state.format });
  if (action.type === 'nextGame') {
    requireCondition(g.format.mode === 'competitive' && g.phase === 'matchComplete' && g.competitionWinners.length === 0, 'WRONG_PHASE');
    const next = createGame(g.rules, g.format);
    next.gameWins = [...g.gameWins]; next.gameNumber = g.gameNumber + 1;
    next.dealer = (g.dealer + 1) % 4;
    beginHand(next, deck);
    return next;
  }
  if (action.type === 'finishInfinite') {
    requireCondition(g.format.mode === 'infinite' && g.phase === 'handComplete' && action.confirmed === true, 'WRONG_PHASE');
    const minimum = Math.min(...g.players.map(p => p.score));
    g.winners = g.players.flatMap((p, index) => p.score === minimum ? [index] : []);
    g.phase = 'matchComplete';
    return g;
  }
  if (action.type === 'start') {
    requireCondition(g.phase === 'lobby', 'WRONG_PHASE');
    beginHand(g, deck);
    return g;
  }
  if (action.type === 'nextHand') {
    requireCondition(g.phase === 'handComplete', 'WRONG_PHASE');
    g.dealer = (g.dealer + 1) % 4;
    beginHand(g, deck);
    return g;
  }
  requireCondition(g.turn === seat, 'NOT_YOUR_TURN');
  const player = g.players[seat];
  switch (action.type) {
    case 'chooseTrump':
      requireCondition(g.phase === 'trumpSelection', 'WRONG_PHASE');
      requireCondition(SUITS.includes(action.suit), 'INVALID_ACTION');
      g.trump = action.suit;
      player.participating = true;
      deal(g, 2);
      g.phase = 'participationExchange';
      break;
    case 'sitOut':
      requireCondition(g.phase === 'participationExchange', 'WRONG_PHASE');
      requireCondition(seat !== g.chooser && !g.rules.compulsoryParticipationSuits.includes(g.trump!), 'MUST_PARTICIPATE');
      player.participating = false;
      finishDecision(g);
      break;
    case 'exchange': {
      requireCondition(g.phase === 'participationExchange', 'WRONG_PHASE');
      const ids = action.cardIds;
      requireCondition(ids.length <= g.rules.exchangeLimit && ids.length <= g.deck.length && new Set(ids).size === ids.length && ids.every(id => player.hand.some(c => c.id === id)), 'INVALID_EXCHANGE');
      g.discards.push(...player.hand.filter(c => ids.includes(c.id)));
      player.hand = [...player.hand.filter(c => !ids.includes(c.id)), ...g.deck.splice(0, ids.length)];
      player.participating = true;
      finishDecision(g);
      break;
    }
    case 'play': {
      requireCondition(g.phase === 'trickPlay', 'WRONG_PHASE');
      const card = legalCards(player.hand, g.trick, g.trump!, g.rules).find(c => c.id === action.cardId);
      requireCondition(card, 'ILLEGAL_CARD');
      player.hand = player.hand.filter(c => c.id !== card.id);
      g.trick.push({ seat, card });
      if (g.trick.length === g.players.filter(p => p.participating).length) {
        const winner = winningPlay(g.trick, g.trump!).seat;
        g.players[winner].tricks++;
        g.completedTricks.push({ plays: g.trick, winner });
        g.trick = []; g.turn = winner;
        if (g.completedTricks.length === 5) {
          const { scores, winners } = scoreHand(g.players, g.trump!, g.rules);
          g.scoreChanges = scores.map((score, i) => score - g.players[i].score);
          g.players.forEach((p, i) => { p.score = scores[i]; });
          g.winners = winners; g.turn = null;
          g.phase = winners.length ? 'matchComplete' : 'handComplete';
          if (winners.length && g.format.mode === 'competitive') {
            for (const winner of winners) g.gameWins[winner]++;
            g.competitionWinners = g.gameWins.flatMap((wins, index) => wins >= g.format.linesToWin * 4 ? [index] : []);
          }
        }
      } else {
        do { g.turn = (g.turn! + 1) % 4; } while (!g.players[g.turn].participating);
      }
      break;
    }
    default: throw new GameError('INVALID_ACTION');
  }
  return g;
}
