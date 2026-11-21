import { describe, expect, it } from 'vitest';
import { CONFIG } from '../config';
import { generatePieceSet, SHAPES } from '../pieces';
import { PIECE_COLORS } from '../types';

describe('pieces', () => {
  it('generates the same set for the same seed and index', () => {
    expect(generatePieceSet(4242, 0)).toEqual(generatePieceSet(4242, 0));
  });

  it('generates different sets for different seeds or indices', () => {
    expect(generatePieceSet(1, 0)).not.toEqual(generatePieceSet(2, 0));
    expect(generatePieceSet(1, 0)).not.toEqual(generatePieceSet(1, 1));
  });

  it('always deals a full tray with valid shapes and colours', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const set = generatePieceSet(seed, seed % 4);
      expect(set).toHaveLength(CONFIG.traySize);
      const ids = new Set(set.map((piece) => piece.id));
      expect(ids.size).toBe(CONFIG.traySize);
      for (const piece of set) {
        expect(SHAPES).toContain(piece.shape);
        expect(PIECE_COLORS).toContain(piece.color);
        expect(piece.shape.cells.length).toBeGreaterThan(0);
      }
    }
  });

  it('gives every piece in a match a globally unique id', () => {
    const ids = new Set<number>();
    for (let setIndex = 0; setIndex < 30; setIndex += 1) {
      for (const piece of generatePieceSet(10, setIndex)) ids.add(piece.id);
    }
    expect(ids.size).toBe(30 * CONFIG.traySize);
  });
});
