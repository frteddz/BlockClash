import { clearLines, columnHeights, countFilled, getFullLines, placePiece } from '../board';
import { CONFIG } from '../config';
import { garbageForClear } from '../garbage';
import { scorePlacement } from '../scoring';
import type { Board, Piece, Placement } from '../types';

export interface BoardMetrics {
  holes: number;
  aggregateHeight: number;
  bumpiness: number;
  filled: number;
}

export function evaluateBoard(board: Board): BoardMetrics {
  const { width, height } = CONFIG.board;
  let holes = 0;
  for (let x = 0; x < width; x += 1) {
    let covered = false;
    for (let y = 0; y < height; y += 1) {
      if (board[y]![x] !== null) covered = true;
      else if (covered) holes += 1;
    }
  }
  const heights = columnHeights(board);
  const aggregateHeight = heights.reduce((sum, value) => sum + value, 0);
  let bumpiness = 0;
  for (let x = 0; x < width - 1; x += 1) {
    bumpiness += Math.abs(heights[x]! - heights[x + 1]!);
  }
  return { holes, aggregateHeight, bumpiness, filled: countFilled(board) };
}

export interface PlacementEvaluation {
  value: number;
  lines: number;
  attack: number;
  board: Board;
  metrics: BoardMetrics;
}

/** What a placement would do to the board, scored with the bot weights. */
export function evaluatePlacement(
  board: Board,
  piece: Piece,
  placement: Placement,
  streak = 0,
): PlacementEvaluation | null {
  const placed = placePiece(board, piece, placement.x, placement.y);
  if (placed === null) return null;

  const full = getFullLines(placed);
  const lines = full.rows.length + full.cols.length;
  const cleared = clearLines(placed, full);
  const metrics = evaluateBoard(cleared.board);
  const score = scorePlacement(piece.shape.cells.length, lines, streak);
  const attack = garbageForClear(lines, score.streak);
  const w = CONFIG.bot;

  const value =
    lines * w.lineWeight +
    attack * w.attackWeight +
    score.streak * w.attackWeight -
    metrics.holes * w.holeWeight -
    metrics.aggregateHeight * w.heightWeight -
    metrics.bumpiness * w.bumpinessWeight;

  return { value, lines, attack, board: cleared.board, metrics };
}

export function isCrowded(board: Board): boolean {
  const { width, height } = CONFIG.board;
  return countFilled(board) / (width * height) >= CONFIG.bot.crowdedFillRatio;
}
