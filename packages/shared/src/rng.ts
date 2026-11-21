/**
 * Deterministic random numbers. No Math.random() anywhere in game logic, so
 * both players can reproduce the exact same pieces and garbage from a seed.
 */

/** Mixes a seed and an index into a new 32-bit seed using integer math only. */
export function hashSeed(seed: number, index: number): number {
  let h = (seed ^ Math.imul(index + 1, 0x9e3779b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) >>> 0;
}

export interface Rng {
  next(): number;
  int(maxExclusive: number): number;
  range(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  weighted<T>(items: readonly T[], weights: readonly number[]): T;
  fork(index: number): Rng;
}

/** mulberry32: small, fast and fully reproducible across JS engines. */
export function createRng(seed: number): Rng {
  const initial = seed >>> 0;
  let state = initial;

  function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(maxExclusive: number): number {
    return Math.floor(next() * maxExclusive);
  }

  return {
    next,
    int,
    range: (minInclusive, maxExclusive) => minInclusive + int(maxExclusive - minInclusive),
    pick: <T>(items: readonly T[]): T => {
      if (items.length === 0) throw new Error('Cannot pick from an empty list');
      return items[int(items.length)]!;
    },
    weighted: <T>(items: readonly T[], weights: readonly number[]): T => {
      if (items.length === 0 || items.length !== weights.length) {
        throw new Error('weighted() needs matching non-empty lists');
      }
      const total = weights.reduce((sum, value) => sum + value, 0);
      let roll = next() * total;
      for (let i = 0; i < items.length; i += 1) {
        roll -= weights[i]!;
        if (roll < 0) return items[i]!;
      }
      return items[items.length - 1]!;
    },
    fork: (index) => createRng(hashSeed(initial, index)),
  };
}
