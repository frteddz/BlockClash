import { describe, expect, it } from 'vitest';
import { createRng, hashSeed } from '../rng';

describe('rng', () => {
  it('reproduces the same sequence from the same seed', () => {
    const a = createRng(12345);
    const b = createRng(12345);
    const sequenceA = Array.from({ length: 20 }, () => a.next());
    const sequenceB = Array.from({ length: 20 }, () => b.next());
    expect(sequenceA).toEqual(sequenceB);
  });

  it('produces different sequences for different seeds', () => {
    const a = createRng(1);
    const b = createRng(2);
    const sequenceA = Array.from({ length: 10 }, () => a.next());
    const sequenceB = Array.from({ length: 10 }, () => b.next());
    expect(sequenceA).not.toEqual(sequenceB);
  });

  it('keeps every value inside [0, 1)', () => {
    const rng = createRng(99);
    for (let i = 0; i < 1000; i += 1) {
      const value = rng.next();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });

  it('returns integers in range and forks deterministically', () => {
    const rng = createRng(7);
    for (let i = 0; i < 100; i += 1) {
      const value = rng.int(8);
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(8);
    }
    expect(rng.fork(3).next()).toBe(createRng(hashSeed(7, 3)).next());
  });

  it('picks by weight without cheating on an empty list', () => {
    const rng = createRng(5);
    const counts: Record<string, number> = { a: 0, b: 0 };
    for (let i = 0; i < 400; i += 1) counts[rng.weighted(['a', 'b'], [1, 9])] += 1;
    expect(counts.b).toBeGreaterThan(counts.a);
    expect(() => rng.pick([])).toThrow();
  });
});
