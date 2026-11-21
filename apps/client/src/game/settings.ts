export interface Settings {
  music: boolean;
  musicVolume: number;
  sfxVolume: number;
  reduceMotion: boolean;
}

const KEY = 'blockclash.settings.v1';

const DEFAULTS: Settings = {
  music: true,
  musicVolume: 0.35,
  sfxVolume: 0.75,
  reduceMotion: false,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<Settings>;
    return {
      music: typeof parsed.music === 'boolean' ? parsed.music : DEFAULTS.music,
      musicVolume: clamp01(parsed.musicVolume, DEFAULTS.musicVolume),
      sfxVolume: clamp01(parsed.sfxVolume, DEFAULTS.sfxVolume),
      reduceMotion:
        typeof parsed.reduceMotion === 'boolean' ? parsed.reduceMotion : DEFAULTS.reduceMotion,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(settings: Settings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can refuse storage. The game still works without it.
  }
}

function clamp01(value: number | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(1, value))
    : fallback;
}
