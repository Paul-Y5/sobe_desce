import { Platform } from 'react-native';

/** Single source for colour, spacing, type and layout. Raw hex values and breakpoints live only here. */
export const color = {
  ink: '#172c27', muted: '#60716a', paper: '#f5f2e9', green: '#125641', dark: '#0b382c', gold: '#e9bd68', line: '#d9dfd5', red: '#b33b3b', white: '#fffdf7',
  inputBg: '#ffffff', inputBorder: '#a7b7ac', secondaryBg: '#e6eee6', secondaryBorder: '#c9d7c9', tile: '#edf1e7', track: '#d5ddd1',
  cardBorder: '#dbddcf', cardHover: '#fff1cf', cardSelected: '#fff4cf', legal: '#6dcc8c', notice: '#fff0d5', goldTint: '#fff0bf', avatar: '#dce8df',
  heroEyebrow: '#acd1ba', heroText: '#c9ded0', heroRule: '#3c6151',
  hud: '#103c2e', hudRule: '#bfa971', felt: '#185c45', feltEdge: '#9c9269', feltLine: '#52806a', seat: '#123f30', seatBorder: '#64977b', seatActive: '#294d35', cardBack: '#386554', cardBackEdge: '#a2b89e', tableSymbol: '#92b6a0',
  onFelt: '#fffaf0', onFeltSoft: '#edf5e7', onFeltMuted: '#d2e0d4', onFeltTurn: '#fff2c6', tableButton: '#294d3e', tableButtonEdge: '#708375',
  warn: '#ffc8b6', warnFill: '#ffbd97', timerTrack: '#416653',
  overlay: '#001b12aa', shadow: '#00190f',
} as const;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 32 } as const;
export const radius = { sm: 7, md: 10, lg: 18, xl: 22, pill: 100 } as const;
/** Smallest readable size is 12: nothing on the table or in a dialog goes below it. */
export const fontSize = { xs: 12, sm: 13, md: 15, lg: 18, xl: 25, display: 44 } as const;
/** Display face is loaded by expo-font; until then the stack falls back to a system serif on web and the system font natively. */
export const fontFamily = { display: Platform.select({ web: 'DMSerifDisplay_400Regular, Georgia, "Times New Roman", serif', default: 'DMSerifDisplay_400Regular' }) } as const;
/** Width thresholds, narrowest first. `compact` is the smallest phones; `wide` is where the entry screen goes two-column. */
export const breakpoint = { compact: 360, narrow: 420, table: 600, wide: 760 } as const;
export const layout = { page: 1120, dialog: 440, dialogWide: 640, reading: 800, minTarget: 44 } as const;
