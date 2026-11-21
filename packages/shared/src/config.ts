/**
 * Every tunable number for the game lives here. Game logic never hardcodes a
 * board size, score value or attack amount.
 */
export const CONFIG = {
  board: {
    width: 8,
    height: 8,
  },

  traySize: 3,

  scoring: {
    pointsPerCell: 1,
    pointsPerLine: 10,
    // Index = number of lines cleared at once. 0 and 1 lines are worth the base.
    multiLineMultiplier: [0, 1, 2.5, 4, 6, 8, 10, 11, 12],
    comboStep: 0.25,
    maxComboMultiplier: 3,
  },

  attack: {
    minLinesForAttack: 2,
    garbagePerExtraLine: 2,
    comboThreshold: 3,
    garbagePerComboLevel: 1,
    maxGarbagePerAttack: 6,
  },

  bot: {
    minDelayMs: 800,
    maxDelayMs: 2500,
    lineWeight: 100,
    holeWeight: 35,
    heightWeight: 6,
    bumpinessWeight: 3,
    attackWeight: 12,
    crowdedFillRatio: 0.45,
    defensiveClearBonus: 45,
  },

  match: {
    countdownSeconds: 3,
  },
} as const;
