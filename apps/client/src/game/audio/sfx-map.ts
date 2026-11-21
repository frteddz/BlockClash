/**
 * Swap a sound here and the whole game follows. Files live in
 * apps/client/public/assets/sfx/ and are copied from assets/ by `pnpm assets`.
 */
export const SFX_FILES = {
  ui_click: 'click_001.ogg',
  ui_back: 'back_001.ogg',
  piece_pickup: 'select_001.ogg',
  piece_place: 'impactSoft_medium_000.ogg',
  piece_invalid: 'error_001.ogg',
  line_clear: 'pepSound1.ogg',
  big_clear: 'powerUp5.ogg',
  combo: 'phaserUp1.ogg',
  attack_send: 'laser1.ogg',
  attack_receive: 'impactPunch_heavy_000.ogg',
  garbage_land: 'impactPlate_heavy_000.ogg',
  countdown_tick: 'tick_001.ogg',
  countdown_go: 'confirmation_003.ogg',
  match_found: 'confirmation_001.ogg',
  time_warning: 'tick_002.ogg',
  defeat: 'lowDown.ogg',
  game_over: 'lowDown.ogg',
  // Placeholders until the user picks the real jingles.
  victory: 'jingles_NES08.ogg',
  perfect_clear: 'jingles_PIZZI16.ogg',
  new_highscore: 'jingles_STEEL16.ogg',
} as const;

export type SfxEvent = keyof typeof SFX_FILES;

const VOLUMES: Partial<Record<SfxEvent, number>> = {
  ui_click: 0.5,
  ui_back: 0.5,
  piece_pickup: 0.6,
  piece_place: 0.7,
  piece_invalid: 0.5,
  line_clear: 0.55,
  big_clear: 0.6,
  combo: 0.5,
  attack_send: 0.6,
  attack_receive: 0.6,
  garbage_land: 0.6,
  countdown_tick: 0.6,
  countdown_go: 0.7,
  match_found: 0.6,
  time_warning: 0.5,
  defeat: 0.7,
  game_over: 0.7,
  victory: 0.55,
  perfect_clear: 0.55,
  new_highscore: 0.55,
};

export function sfxKey(file: string): string {
  return `sfx_${file.replace(/\.ogg$/, '')}`;
}

export function sfxVolume(event: SfxEvent): number {
  return VOLUMES[event] ?? 0.6;
}

export const MUSIC = {
  key: 'music_main',
  file: 'main-theme.mp3',
  volume: 0.35,
} as const;
