import { describe, expect, it } from 'vitest';
import {
  blockKey,
  canPlace,
  clearLines,
  createBoard,
  getBlockKeyAt,
  getFullLines,
  getLegalMoves,
  hasAnyLegalMove,
  placePiece,
} from '../board';
import { CONFIG } from '../config';
import type { Board, Cell, Piece, PieceColor, PieceShape } from '../types';

function shape(cells: Array<readonly [number, number]>): PieceShape {
  const width = Math.max(...cells.map(([x]) => x)) + 1;
  const height = Math.max(...cells.map(([, y]) => y)) + 1;
  return { id: 'test', weight: 1, cells, width, height };
}

function piece(
  id: number,
  cells: Array<readonly [number, number]>,
  color: PieceColor = 'blue',
): Piece {
  return { id, shape: shape(cells), color };
}

function filledCell(pieceId: number): Cell {
  return { pieceId, color: 'blue', garbage: false };
}

describe('board', () => {
  it('creates an empty 8x8 board', () => {
    const board = createBoard();
    expect(board).toHaveLength(CONFIG.board.height);
    expect(board[0]).toHaveLength(CONFIG.board.width);
    expect(board.flat().every((cell) => cell === null)).toBe(true);
  });

  it('validates placement against edges and occupied cells', () => {
    const board = createBoard();
    const horizontal3 = piece(1, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    expect(canPlace(board, horizontal3, 0, 0)).toBe(true);
    expect(canPlace(board, horizontal3, 5, 0)).toBe(true);
    expect(canPlace(board, horizontal3, 6, 0)).toBe(false);
    expect(canPlace(board, horizontal3, -1, 0)).toBe(false);
    board[0]![2] = filledCell(99);
    expect(canPlace(board, horizontal3, 0, 0)).toBe(false);
  });

  it('places a piece without mutating the original board', () => {
    const board = createBoard();
    const vertical2 = piece(2, [
      [0, 0],
      [0, 1],
    ]);
    const next = placePiece(board, vertical2, 3, 4)!;
    expect(next[4]![3]!.pieceId).toBe(2);
    expect(next[5]![3]!.pieceId).toBe(2);
    expect(board[4]![3]).toBeNull();
    expect(placePiece(next, vertical2, 3, 4)).toBeNull();
  });

  it('detects and clears full rows and columns without double counting', () => {
    const board = createBoard();
    for (let x = 0; x < CONFIG.board.width; x += 1) board[7]![x] = filledCell(x + 1);
    for (let y = 0; y < CONFIG.board.height; y += 1) board[y]![0] = filledCell(y + 10);
    const full = getFullLines(board);
    expect(full.rows).toEqual([7]);
    expect(full.cols).toEqual([0]);
    const result = clearLines(board, full);
    expect(result.cells).toHaveLength(8 + 8 - 1);
    expect(result.board[7]!.every((cell) => cell === null)).toBe(true);
    expect(result.board[6]![0]).toBeNull();
  });

  it('autotiles by piece id, not by colour', () => {
    const board: Board = createBoard();
    const horizontal3 = piece(1, [
      [0, 0],
      [1, 0],
      [2, 0],
    ]);
    const placed = placePiece(board, horizontal3, 2, 2)!;
    expect(getBlockKeyAt(placed, 2, 2)).toBe('block_blue_E');
    expect(getBlockKeyAt(placed, 3, 2)).toBe('block_blue_EW');
    expect(getBlockKeyAt(placed, 4, 2)).toBe('block_blue_W');
    placed[3]![1] = { pieceId: 2, color: 'blue', garbage: false };
    expect(getBlockKeyAt(placed, 3, 2)).toBe('block_blue_EW');

    placed[2]![5] = { pieceId: 3, color: 'blue', garbage: true };
    expect(getBlockKeyAt(placed, 5, 2)).toBe('block_garbage');
    expect(getBlockKeyAt(placed, 0, 0)).toBeNull();
    expect(blockKey('teal', false, false, false, false)).toBe('block_teal_single');
  });

  it('lists legal moves and reports when nothing fits', () => {
    const board = createBoard();
    const single = piece(1, [[0, 0]]);
    expect(getLegalMoves(board, [single, null])).toHaveLength(64);
    expect(hasAnyLegalMove(board, [single])).toBe(true);
    for (let y = 0; y < CONFIG.board.height; y += 1) {
      for (let x = 0; x < CONFIG.board.width; x += 1) board[y]![x] = filledCell(x + y + 1);
    }
    expect(hasAnyLegalMove(board, [single])).toBe(false);
    expect(hasAnyLegalMove(board, [null, null])).toBe(true);
  });
});
