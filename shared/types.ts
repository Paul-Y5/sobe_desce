export const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'] as const;
export type Suit = typeof SUITS[number];
export const RANKS = ['2', '3', '4', '5', '6', 'Q', 'J', 'K', '7', 'A'] as const;
export type Rank = typeof RANKS[number];
export type Card = { id: string; suit: Suit; rank: Rank };
export type Phase = 'lobby' | 'trumpSelection' | 'participationExchange' | 'trickPlay' | 'handComplete' | 'matchComplete';
export type Rules = Readonly<{
  id: 'traditional-pt-v1';
  initialScore: number;
  exchangeLimit: number;
  compulsoryParticipationSuits: readonly Suit[];
  scoringMultipliers: Readonly<Record<Suit, number>>;
  mustOvertake: boolean;
  mustLeadTrumpAce: boolean;
  zeroReachingPolicy: 'at-or-below-zero-shared';
}>;
export type Play = { seat: number; card: Card };
export type Trick = { plays: Play[]; winner: number };
export type GamePlayer = { hand: Card[]; score: number; tricks: number; participating: boolean | null };
export type GameState = {
  rulesetId: Rules['id']; rules: Rules; phase: Phase;
  dealer: number; chooser: number; turn: number | null; handNumber: number;
  trump: Suit | null; players: GamePlayer[]; deck: Card[]; discards: Card[];
  decisionsTaken: number; trick: Play[]; completedTricks: Trick[];
  winners: number[]; scoreChanges: number[];
};
export type GameAction =
  | { type: 'start' }
  | { type: 'chooseTrump'; suit: Suit }
  | { type: 'exchange'; cardIds: string[] }
  | { type: 'sitOut' }
  | { type: 'play'; cardId: string }
  | { type: 'nextHand' };
export type RoomAction = GameAction | { type: 'restart'; confirmed: true };

export type PublicPlayer = {
  seat: number; nickname: string; connected: boolean; inactive: boolean; score: number;
  tricks: number; participating: boolean | null; cardCount: number;
};
export type Snapshot = {
  roomCode: string; revision: number; you: number; creator: number;
  serverTime: number; turnDeadline: number | null; turnDisconnectAt: number | null;
  rulesetId: Rules['id']; rules: Rules; phase: Phase;
  players: (PublicPlayer | null)[]; dealer: number; chooser: number;
  turn: number | null; handNumber: number; trump: Suit | null;
  hand: Card[]; legalCardIds: string[]; canSitOut: boolean;
  trick: Play[]; completedTricks: Trick[]; winners: number[]; scoreChanges: number[];
};
