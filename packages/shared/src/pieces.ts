import { CONFIG } from './config';
import { createRng, hashSeed } from './rng';
import { PIECE_COLORS, type Piece, type PieceShape, type ShapeCells } from './types';

function shape(id: string, weight: number, rows: string[]): PieceShape {
  const cells: Array<readonly [number, number]> = [];
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') cells.push([x, y]);
    }
  });
  return {
    id,
    weight,
    cells: cells as ShapeCells,
    width: Math.max(...rows.map((row) => row.length)),
    height: rows.length,
  };
}

/** No rotation in the game, so every orientation is its own shape. */
export const SHAPES: readonly PieceShape[] = [
  shape('single', 3, ['#']),
  shape('h2', 7, ['##']),
  shape('h3', 7, ['###']),
  shape('h4', 5, ['####']),
  shape('h5', 3, ['#####']),
  shape('v2', 7, ['#', '#']),
  shape('v3', 7, ['#', '#', '#']),
  shape('v4', 5, ['#', '#', '#', '#']),
  shape('v5', 3, ['#', '#', '#', '#', '#']),
  shape('square2', 6, ['##', '##']),
  shape('square3', 2, ['###', '###', '###']),
  shape('l3a', 4, ['#', '##']),
  shape('l3b', 4, ['##', '#']),
  shape('l3c', 4, ['##', ' #']),
  shape('l3d', 4, [' #', '##']),
  shape('l4a', 3, ['#', '#', '##']),
  shape('l4b', 3, ['##', ' #', ' #']),
  shape('l4c', 3, ['##', '#']),
  shape('l4d', 3, ['#', '###']),
  shape('t4a', 4, ['###', ' # ']),
  shape('t4b', 4, [' # ', '###']),
  shape('s4', 3, [' ##', '## ']),
  shape('z4', 3, ['## ', ' ##']),
];

const shapeWeights = SHAPES.map((item) => item.weight);

/** Set k is identical for both players: set(k) = f(seed, k). */
export function generatePieceSet(seed: number, setIndex: number): Piece[] {
  const rng = createRng(hashSeed(seed, setIndex + 1));
  const pieces: Piece[] = [];
  for (let i = 0; i < CONFIG.traySize; i += 1) {
    pieces.push({
      // Unique across the whole match, so two pieces of the same colour
      // that happen to touch never autotile into one blob.
      id: setIndex * CONFIG.traySize + i + 1,
      shape: rng.weighted(SHAPES, shapeWeights),
      color: rng.pick(PIECE_COLORS),
    });
  }
  return pieces;
}
