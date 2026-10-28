# Table UX research and decisions

Research date: 2026-10-08. This increment follows the explicitly requested `search-first` workflow. These are established design practices adapted to Sobe e Desce, not a universal official standard for card games.

## Research channels

Inspected the existing React Native components, npm package metadata, official documentation and public GitHub repositories. The GitHub CLI token was invalid, so authenticated code search was unavailable. Available MCP tools cover Figma/Canva design work, not React Native package documentation; no external design file or connector was needed. The local skill catalog was available. No new dependency was installed; the lockfile and Expo compatibility set are unchanged.

## References applied

- [Board Game Arena UX guide](https://en.doc.boardgamearena.com/images/5/57/Guidelines_UX_new_compressed.pdf): keep the current action/state clear, place primary actions near the board, and keep secondary information accessible without clutter. Use brief animations to explain changes rather than distracting loops. Applied here as a persistent status area, central trick and nearby hand controls.
- [PokerStars table appearance](https://www.pokerstars.com/help/articles/table-appearance-feature/): card size, deck appearance and animation preferences are useful precedents for readable cards and player control. This is a UI reference, not an adoption of poker mechanics.
- [W3C target size, enhanced](https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html): aim for at least 44 × 44 CSS pixels for actionable targets. Small cards on the shared table are display-only; the player's playable cards and controls retain usable touch targets. This is not a claim of complete WCAG conformance.
- [Xbox accessibility guideline 117](https://learn.microsoft.com/en-us/gaming/accessibility/xbox-accessibility-guidelines/117): avoid distracting movement around important text and provide motion controls. OS reduced-motion settings are respected; a table control can also disable animation for the current application session.
- [Clear interactive elements](https://gameaccessibilityguidelines.com/give-a-clear-indication-that-interactive-elements-are-interactive/): card states combine borders, marks, text instructions and accessibility labels rather than relying only on colour.

## Adopt, extend or build

| Candidate | Fit and decision |
|---|---|
| [React Native Animated](https://reactnative.dev/docs/animations) | **Extend.** Already used, no additional package. Transforms/opacity support deal, play and selection feedback with native driving where supported. |
| [Reanimated](https://docs.swmansion.com/react-native-reanimated/docs/guides/web-support/) | Already installed at 4.5.1, MIT. Useful for more complex gestures; unnecessary migration for these short transitions. No version change. |
| [react-native-animatable](https://github.com/oblador/react-native-animatable) | npm 1.4.0, MIT, `prop-types` dependency, last package release in October 2023. Adds presets that duplicate the existing motion helper; not adopted. |
| [react-native-flip-card](https://www.npmjs.com/package/react-native-flip-card) | npm 3.5.7, MIT, last package release in February 2023; includes deprecated React Native prop types. Narrow scope and unverified current native/web compatibility; not adopted. |

## Implementation

The fixed header is outside the scrolling content and contains trump (symbol and name), the hearts/clubs modifier, current phase/actor, server-derived remaining time and the score modal button. The board retains four relative seat positions, public point totals, connection/participation state and opponent card counts. The current or last trick stays in the centre; the last winner receives a star and border. Only public cards/counts are used.

Cards use mirrored rank/suit corners, a central suit, selection lift and legal-play indicators. Dealing takes 420 ms with 60 ms staggering; played cards enter from their seat direction over 300 ms. Phase/result entrances remain brief. These durations are product choices informed by the references, not prescribed standards. There is no repeating animation, artificial action delay, client-side winner calculation or change to the five-minute warning plus one-minute inactivity policy.

Secondary controls, rules, chat and restart remain below the main action area. The motion override is session-only; device reduced-motion preference takes precedence. Long player names truncate visually in seat panels and remain available in the score view. Screen-reader and physical-device validation are still separate follow-up work.

Later changes to tokens, shared components and copy are recorded in [ui-system.md](ui-system.md).
