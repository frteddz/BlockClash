import { cloneBoard, hasAnyLegalMove } from './board';
import { CONFIG } from './config';
import { createRng, hashSeed } from './rng';
import { GARBAGE_PIECE_ID, type Board, type Piece, type Point } from './types';

/** How many gray cells an attack drops, from lines cleared and current streak. */
export function garbageForClear(linesCleared: number, streak: number): number {
  let amount = 0;
  if (linesCleared >= CONFIG.attack.minLinesForAttack) {
    amount += (linesCleared - 1) * CONFIG.attack.garbagePerExtraLine;
  }
  if (streak >= CONFIG.attack.comboThreshold) {
    amount += (streak - CONFIG.attack.comboThreshold + 1) * CONFIG.attack.garbagePerComboLevel;
  }
  return Math.min(amount, CONFIG.attack.maxGarbagePerAttack);
}

export interface GarbageResult {
  board: Board;
  placed: Point[];
  actual: number;
}

/**
 * Garbage lands on deterministic empty cells, derived from the match seed and
 * an event index. If it would leave the victim with no legal move, we take
 * cells back until at least one piece fits again.
 */
export function addGarbage(
  board: Board,
  amount: number,
  seed: number,
  eventIndex: number,
  tray: readonly (Piece | null)[],
): GarbageResult {
  if (amount <= 0) return { board: cloneBoard(board), placed: [], actual: 0 };

  const rng = createRng(hashSeed(seed, eventIndex + 0x51ed));
  const empty: Point[] = [];
  for (let y = 0; y < CONFIG.board.height; y += 1) {
    for (let x = 0; x < CONFIG.board.width; x += 1) {
      if (board[y]![x] === null) empty.push({ x, y });
    }
  }
  for (let i = empty.length - 1; i > 0; i -= 1) {
    const j = rng.int(i + 1);
    [empty[i], empty[j]] = [empty[j]!, empty[i]!];
  }

  const next = cloneBoard(board);
  const placed: Point[] = [];
  for (const cell of empty) {
    if (placed.length >= amount) break;
    next[cell.y]![cell.x] = {
      pieceId: GARBAGE_PIECE_ID - placed.length,
      color: 'pink',
      garbage: true,
    };
    placed.push(cell);
  }

  while (placed.length > 0 && !hasAnyLegalMove(next, tray)) {
    const removed = placed.pop()!;
    next[removed.y]![removed.x] = null;
  }

  return { board: next, placed, actual: placed.length };
}
