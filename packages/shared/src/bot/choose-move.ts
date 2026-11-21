import { cloneBoard, getLegalMoves } from '../board.js';
import { CONFIG } from '../config.js';
import type { Rng } from '../rng.js';
import type { Board, Difficulty, Piece, Placement } from '../types.js';
import { evaluatePlacement, isCrowded, type PlacementEvaluation } from './heuristics.js';

type Scored = { move: Placement; evaluation: PlacementEvaluation };

function permutations(items: number[]): number[][] {
  if (items.length <= 1) return [items];
  const result: number[][] = [];
  items.forEach((item, index) => {
    const rest = items.filter((_, i) => i !== index);
    for (const tail of permutations(rest)) result.push([item, ...tail]);
  });
  return result;
}

/** Pick the move for one bot turn. Returns null only when nothing fits. */
export function chooseMove(
  board: Board,
  tray: readonly (Piece | null)[],
  difficulty: Difficulty,
  rng: Rng,
): Placement | null {
  const moves = getLegalMoves(board, tray);
  if (moves.length === 0) return null;

  const crowded = isCrowded(board);
  const scored: Scored[] = moves.map((move) => ({
    move,
    evaluation: evaluatePlacement(board, tray[move.pieceIndex]!, move)!,
  }));

  const valueOf = (item: Scored): number => {
    const defensive = crowded && item.evaluation.lines > 0 ? CONFIG.bot.defensiveClearBonus : 0;
    return item.evaluation.value + defensive;
  };

  if (difficulty === 'easy') {
    const weights = scored.map((item) => 1 + item.evaluation.lines * 3);
    return rng.weighted(scored, weights).move;
  }

  if (difficulty === 'medium') {
    return scored.reduce((best, item) => (valueOf(item) > valueOf(best) ? item : best)).move;
  }

  const indices = tray.map((piece, index) => (piece === null ? -1 : index)).filter((i) => i >= 0);
  let best: { first: Placement; total: number } | null = null;

  for (const order of permutations(indices)) {
    let simulated = cloneBoard(board);
    let first: Placement | null = null;
    let total = 0;
    let valid = true;

    for (const pieceIndex of order) {
      const piece = tray[pieceIndex]!;
      const options = getLegalMoves(simulated, [piece]);
      if (options.length === 0) {
        valid = false;
        break;
      }
      const ranked = options.map((move) => ({
        move,
        evaluation: evaluatePlacement(simulated, piece, move, 1)!,
      }));
      const chosen = ranked.reduce((bestOption, option) =>
        valueOf(option) > valueOf(bestOption) ? option : bestOption,
      );
      if (first === null) first = { pieceIndex, x: chosen.move.x, y: chosen.move.y };
      simulated = chosen.evaluation.board;
      total += valueOf(chosen);
    }

    if (valid && first !== null && (best === null || total > best.total)) {
      best = { first, total };
    }
  }

  if (best !== null) return best.first;
  return scored.reduce((a, b) => (valueOf(a) > valueOf(b) ? a : b)).move;
}

/** Human-like thinking time, in milliseconds. Kept here so tests can use it. */
export function botDelayMs(rng: Rng): number {
  return rng.range(CONFIG.bot.minDelayMs, CONFIG.bot.maxDelayMs + 1);
}
