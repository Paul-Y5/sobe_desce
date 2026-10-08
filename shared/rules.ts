import type { MatchFormat, Rules } from './types.js';

export const BASE_FORMAT: MatchFormat = Object.freeze({ mode: 'base', linesToWin: 1 });

export function freezeRules(rules: Rules): Rules {
  return Object.freeze({
    ...rules,
    compulsoryParticipationSuits: Object.freeze([...rules.compulsoryParticipationSuits]),
    scoringMultipliers: Object.freeze({ ...rules.scoringMultipliers }),
  });
}
export const TRADITIONAL_RULES = freezeRules({
  id: 'traditional-pt-v1', initialScore: 20, exchangeLimit: 5,
  compulsoryParticipationSuits: ['clubs'],
  scoringMultipliers: { clubs: 1, diamonds: 1, hearts: 2, spades: 1 },
  mustOvertake: true, mustLeadTrumpAce: true,
  zeroReachingPolicy: 'at-or-below-zero-shared',
});
export const INFINITE_RULES = freezeRules({ ...TRADITIONAL_RULES, id: 'traditional-pt-v1-infinite', zeroReachingPolicy: 'unbounded' });
