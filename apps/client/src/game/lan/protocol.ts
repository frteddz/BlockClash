import type { GameEvent, MatchState, PlayerIndex } from '@blockclash/shared';

export type LanMessage =
  | { t: 'hello'; name: string }
  | { t: 'welcome'; seed: number; youAre: PlayerIndex }
  | { t: 'countdown'; seed: number }
  | { t: 'start' }
  | { t: 'move'; setIndex: number; pieceIndex: number; x: number; y: number }
  | { t: 'state'; match: MatchState; events: GameEvent[] }
  | { t: 'end'; winner: PlayerIndex | null };

export function encode(message: LanMessage): string {
  return JSON.stringify(message);
}

export function decode(text: string): LanMessage | null {
  try {
    const value = JSON.parse(text) as LanMessage;
    if (value !== null && typeof value === 'object' && typeof value.t === 'string') return value;
  } catch {
    // Ignore malformed messages, they are never trusted as game data.
  }
  return null;
}
