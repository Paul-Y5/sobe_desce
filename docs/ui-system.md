# UI system

Date: 2026-10-28. Follow-up to [table-ux.md](table-ux.md); the research there still applies.

## Decisions

- **Tokens only, no dark theme.** `client/src/tokens.ts` is the single source for colour, spacing, radius, type size, breakpoints and layout widths. No hex literal or width threshold lives outside it. A dark theme is now a palette swap rather than a rewrite, but it is not part of this release.
- **One new font, no UI libraries.** DM Serif Display (`@expo-google-fonts/dm-serif-display@0.4.2`, OFL 1.1, one weight) is loaded with `expo-font@57.0.4`, the version bundled with Expo 57. It styles the brand, headings and hero only. `useFonts` never blocks rendering; until it loads, web falls back to Georgia/serif and native to the system font. Room codes, suit symbols and numbers stay in the system font for legibility. Modal/icon/styling libraries were not adopted; the existing components were smaller than any candidate.
- **Minimum text size is 12px** (`fontSize.xs`). Table, score and dialog text that was 9-11px was raised.

## Shared components (`client/src/ui.tsx`, `client/src/Dialog.tsx`)

| Component | Purpose |
|---|---|
| `Heading` | Real heading role and level, so screen-reader users can jump between sections |
| `TextLink` | Link with explicit role, 44px minimum target and a focus ring |
| `Button` | Adds `selected` and `expanded` state; mode, trump and chat toggles no longer rely on colour alone |
| `PlayingCard` | `decorative` hides hero/onboarding cards from assistive technology; keyboard focus ring |
| `Dialog`, `ConfirmDialog` | One backdrop and accessible name for every dialog; replaces four hand-built modals |

On the web, React Native's `Modal` already provides `role="dialog"`, `aria-modal`, Escape, a focus trap and focus return (checked in `react-native-web` 0.21), so `Dialog` adds only the accessible name and the shared look. An earlier audit claim that web dialogs lacked these was wrong.

`<Link asChild>` children must receive a flat style object; arrays throw.

## Structure

`client/app/index.tsx` is now composition only. Screens live in `client/src/screens/` (`Entry`, `Lobby`, `Table`, `Restart`). Copy that depends on state (plurals, verb agreement, result titles, connection messages, spoken durations) is in `client/src/gameText.ts` with unit tests, so wording rules can change without running a browser.

## Copy decisions

- The internal variant id `traditional-pt-v1` no longer appears in the UI: "variante tradicional portuguesa".
- "1 vaza" / "2 vazas" and "1 minuto" / "2 minutos" agree everywhere, including the spoken timer label.
- Clearer wording: "Sessão aberta noutro separador ou dispositivo", "Desliga em Ns", "A mesa aguarda o regresso de {nome}", "Mesa completa." once all four seats are taken.
- The legal-card hint no longer relies on colour alone: it names the green outline and the • mark.
- The dealer marker `Ⓓ` rendered as an overlapping "0" in some fonts; it is now a labelled "Dador" badge.

## Not done

Dark theme, physical-device checks, a real screen-reader pass and consolidation of the native `outline` focus ring (web only) remain follow-ups.
