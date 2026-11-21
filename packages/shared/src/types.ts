export type PieceColor =
  'blue' | 'green' | 'orange' | 'pink' | 'purple' | 'red' | 'teal' | 'yellow';

export const PIECE_COLORS: readonly PieceColor[] = [
  'blue',
  'green',
  'orange',
  'pink',
  'purple',
  'red',
  'teal',
  'yellow',
];

/** Garbage cells all share a negative id, so they never autotile to each other. */
export const GARBAGE_PIECE_ID = -1;

export interface Cell {
  pieceId: number;
  color: PieceColor;
  garbage: boolean;
}

export type CellValue = Cell | null;
export type Board = CellValue[][];

/** Cell offsets are [dx, dy] from the piece anchor. */
export type ShapeCells = readonly (readonly [number, number])[];

export interface PieceShape {
  id: string;
  weight: number;
  cells: ShapeCells;
  width: number;
  height: number;
}

export interface Piece {
  id: number;
  shape: PieceShape;
  color: PieceColor;
}

/** A placement without the set number. Bots and board helpers use this. */
export interface Placement {
  pieceIndex: number;
  x: number;
  y: number;
}

export interface Move extends Placement {
  setIndex: number;
}

export type Difficulty = 'easy' | 'medium' | 'hard';
export type PlayerIndex = 0 | 1;

export interface ClearedCell {
  x: number;
  y: number;
  cell: Cell;
}

export interface Point {
  x: number;
  y: number;
}
