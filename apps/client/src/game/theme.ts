export const FONT = {
  display: 'TitanOne',
  ui: 'Nunito',
} as const;

export const COLOR = {
  background: 0xf7ead6,
  panel: 0xfff7ea,
  panelBorder: 0x3f3450,
  shadow: 0xd9c8ad,
  ink: 0x4b3a57,
  inkSoft: 0x84748f,
  accent: 0xff8a63,
  accentDark: 0xd96642,
  green: 0x6fbf8c,
  red: 0xe46a72,
  gold: 0xffc857,
  boardSlot: 0xd2be9f,
  gridLine: 0x9d876c,
} as const;

export const CSS = {
  ink: '#4b3a57',
  soft: '#84748f',
  light: '#fff7ea',
  accent: '#d96642',
} as const;

/** Small radius everywhere. No candy pills. */
export const RADIUS = 12;

/** Hard-coded pixel caps need to grow with the game buffer on high-DPI screens. */
export const UI_DPR = Math.min(
  typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1,
  2,
);

export function uiPx(value: number): number {
  return value * UI_DPR;
}
