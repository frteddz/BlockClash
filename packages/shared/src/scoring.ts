import { CONFIG } from './config.js';

export interface PlacementScore {
  placementPoints: number;
  clearPoints: number;
  total: number;
  streak: number;
  comboMultiplier: number;
}

function multiLineMultiplier(lines: number): number {
  return CONFIG.scoring.multiLineMultiplier[lines] ?? 1;
}

/**
 * A streak is the number of consecutive placements that cleared something.
 * Any placement that clears nothing resets it to zero.
 */
export function scorePlacement(
  cellsPlaced: number,
  linesCleared: number,
  previousStreak: number,
): PlacementScore {
  const placementPoints = cellsPlaced * CONFIG.scoring.pointsPerCell;
  const streak = linesCleared > 0 ? previousStreak + 1 : 0;
  const comboMultiplier = Math.min(
    CONFIG.scoring.maxComboMultiplier,
    1 + Math.max(0, streak - 1) * CONFIG.scoring.comboStep,
  );
  const clearPoints = Math.round(
    CONFIG.scoring.pointsPerLine *
      linesCleared *
      multiLineMultiplier(linesCleared) *
      comboMultiplier,
  );
  return {
    placementPoints,
    clearPoints,
    total: placementPoints + clearPoints,
    streak,
    comboMultiplier,
  };
}
