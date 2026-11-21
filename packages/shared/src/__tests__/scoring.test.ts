import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { scorePlacement } from '../scoring';

describe('scoring', () => {
  it('pays for placed cells even with no clear', () => {
    const result = scorePlacement(4, 0, 2);
    expect(result.placementPoints).toBe(4 * CONFIG.scoring.pointsPerCell);
    expect(result.clearPoints).toBe(0);
    expect(result.streak).toBe(0);
  });

  it('pays more for clearing several lines at once', () => {
    const one = scorePlacement(4, 1, 0).clearPoints;
    const two = scorePlacement(4, 2, 0).clearPoints;
    const three = scorePlacement(4, 3, 0).clearPoints;
    expect(two).toBeGreaterThan(one * 2);
    expect(three).toBeGreaterThan(two);
  });

  it('grows the combo multiplier across consecutive clears', () => {
    const first = scorePlacement(1, 1, 0);
    const second = scorePlacement(1, 1, first.streak);
    const third = scorePlacement(1, 1, second.streak);
    expect(first.streak).toBe(1);
    expect(second.streak).toBe(2);
    expect(third.streak).toBe(3);
    expect(third.comboMultiplier).toBeGreaterThan(second.comboMultiplier);
    expect(second.comboMultiplier).toBeGreaterThan(first.comboMultiplier);
    expect(third.clearPoints).toBeGreaterThan(second.clearPoints);
  });

  it('caps the combo multiplier', () => {
    const result = scorePlacement(1, 1, 100);
    expect(result.comboMultiplier).toBe(CONFIG.scoring.maxComboMultiplier);
  });
});
