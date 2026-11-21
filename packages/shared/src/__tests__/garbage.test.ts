import { describe, expect, it } from 'vitest';
import { createBoard, getLegalMoves } from '../board.js';
import { CONFIG } from '../config.js';
import { addGarbage, garbageForClear } from '../garbage.js';
import type { Piece, PieceColor, PieceShape } from '../types.js';

function singlePiece(id: number, color: PieceColor = 'blue'): Piece {
  const shape: PieceShape = { id: 'single', weight: 1, cells: [[0, 0]], width: 1, height: 1 };
  return { id, shape, color };
}

describe('garbage', () => {
  it('only attacks on multi-line clears or high combos', () => {
    expect(garbageForClear(1, 1)).toBe(0);
    expect(garbageForClear(2, 1)).toBe(CONFIG.attack.garbagePerExtraLine);
    expect(garbageForClear(1, CONFIG.attack.comboThreshold)).toBeGreaterThan(0);
    expect(garbageForClear(4, 10)).toBe(CONFIG.attack.maxGarbagePerAttack);
  });

  it('places deterministic cells from the seed and event index', () => {
    const board = createBoard();
    const tray = [singlePiece(1)];
    const a = addGarbage(board, 4, 777, 3, tray);
    const b = addGarbage(board, 4, 777, 3, tray);
    expect(a.placed).toEqual(b.placed);
    expect(a.actual).toBe(4);
    expect(addGarbage(board, 4, 778, 3, tray).placed).not.toEqual(a.placed);
    expect(a.placed.every(({ x, y }) => a.board[y]![x]!.garbage)).toBe(true);
  });

  it('takes cells back instead of leaving the victim instantly dead', () => {
    const board = createBoard();
    // Leave exactly one free cell, so even one garbage cell would kill the tray.
    for (let y = 0; y < CONFIG.board.height; y += 1) {
      for (let x = 0; x < CONFIG.board.width; x += 1) {
        if (x === 0 && y === 0) continue;
        board[y]![x] = { pieceId: x + y + 5, color: 'blue', garbage: false };
      }
    }
    const tray = [singlePiece(1)];
    expect(getLegalMoves(board, tray)).toHaveLength(1);
    const result = addGarbage(board, 6, 123, 1, tray);
    expect(result.actual).toBe(0);
    expect(getLegalMoves(result.board, tray)).toHaveLength(1);
  });
});
