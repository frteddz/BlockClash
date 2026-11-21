import { describe, expect, it } from 'vitest';
import { createBoard, getLegalMoves } from '../board.js';
import { botDelayMs, chooseMove } from '../bot/index.js';
import { CONFIG } from '../config.js';
import { createRng } from '../rng.js';
import { generatePieceSet } from '../pieces.js';
import type { Difficulty } from '../types.js';

describe('bot', () => {
  it('always chooses a legal move for every difficulty', () => {
    for (const difficulty of ['easy', 'medium', 'hard'] as Difficulty[]) {
      for (let seed = 0; seed < 12; seed += 1) {
        const board = createBoard();
        const tray = generatePieceSet(seed, 0);
        const move = chooseMove(board, tray, difficulty, createRng(seed + 1));
        expect(move).not.toBeNull();
        expect(getLegalMoves(board, tray)).toContainEqual(move);
      }
    }
  });

  it('returns null when the tray cannot fit', () => {
    const board = createBoard();
    for (let y = 0; y < CONFIG.board.height; y += 1) {
      for (let x = 0; x < CONFIG.board.width; x += 1) {
        board[y]![x] = { pieceId: x + y + 1, color: 'blue', garbage: false };
      }
    }
    expect(chooseMove(board, generatePieceSet(1, 0), 'hard', createRng(1))).toBeNull();
  });

  it('prefers clearing a line over a random legal spot', () => {
    const board = createBoard();
    for (let x = 1; x < CONFIG.board.width; x += 1) {
      board[7]![x] = { pieceId: x, color: 'red', garbage: false };
    }
    const single = generatePieceSet(1, 0)[0]!;
    single.shape = { id: 'single', weight: 1, cells: [[0, 0]], width: 1, height: 1 };
    for (const difficulty of ['medium', 'hard'] as Difficulty[]) {
      const move = chooseMove(board, [single, null, null], difficulty, createRng(1));
      expect(move).toMatchObject({ x: 0, y: 7 });
    }
  });

  it('uses a human-like delay inside the configured range', () => {
    const rng = createRng(4);
    for (let i = 0; i < 100; i += 1) {
      const delay = botDelayMs(rng);
      expect(delay).toBeGreaterThanOrEqual(CONFIG.bot.minDelayMs);
      expect(delay).toBeLessThanOrEqual(CONFIG.bot.maxDelayMs);
    }
  });
});
