import { RANKS, SUITS, type GameAction, type Snapshot } from '../shared/index.js';

// Deliberately receives the same authorized view as a human, never the deck or other hands.
// The policy is deterministic: identical views always produce identical decisions.
export type BotView = Pick<Snapshot, 'turn' | 'you' | 'phase' | 'hand' | 'trump' | 'rules' | 'legalCardIds'>;
export function chooseBotAction(view: BotView): GameAction | null {
  if (view.turn !== view.you) return null;
  if (view.phase === 'trumpSelection') {
    const strength = (suit: typeof SUITS[number]) => view.hand.filter(c => c.suit === suit).reduce((sum, c) => sum + 10 + RANKS.indexOf(c.rank), 0);
    const suit = [...SUITS].sort((a, b) => strength(b) - strength(a))[0];
    return { type: 'chooseTrump', suit };
  }
  if (view.phase === 'participationExchange') return { type: 'exchange', cardIds: view.hand.filter(c => c.suit !== view.trump && RANKS.indexOf(c.rank) < RANKS.indexOf('K')).slice(0, view.rules.exchangeLimit).map(c => c.id) };
  if (view.phase === 'trickPlay') {
    const card = view.hand.filter(c => view.legalCardIds.includes(c.id)).sort((a, b) => RANKS.indexOf(a.rank) - RANKS.indexOf(b.rank))[0];
    return card ? { type: 'play', cardId: card.id } : null;
  }
  return null;
}
