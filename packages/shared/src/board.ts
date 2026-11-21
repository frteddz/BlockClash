import { CONFIG } from './config';
import {
  GARBAGE_PIECE_ID,
  type Board,
  type Cell,
  type ClearedCell,
  type Piece,
  type Placement,
  type PieceColor,
} from './types';

const W = CONFIG.board.width;
const H = CONFIG.board.height;

export function inBounds(x: number, y: number): boolean {
  return x >= 0 && y >= 0 && x < W && y < H;
}

export function createBoard(): Board {
  return Array.from({ length: H }, () => Array.from({ length: W }, () => null));
}

export function cloneBoard(board: Board): Board {
  return board.map((row) => row.slice());
}

export function canPlace(board: Board, piece: Piece, x: number, y: number): boolean {
  for (const [dx, dy] of piece.shape.cells) {
    const cx = x + dx;
    const cy = y + dy;
    if (!inBounds(cx, cy) || board[cy]![cx] !== null) return false;
  }
  return true;
}

/** Returns a new board, or null when the placement would be illegal. */
export function placePiece(board: Board, piece: Piece, x: number, y: number): Board | null {
  if (!canPlace(board, piece, x, y)) return null;
  const next = cloneBoard(board);
  const cell: Cell = { pieceId: piece.id, color: piece.color, garbage: false };
  for (const [dx, dy] of piece.shape.cells) {
    next[y + dy]![x + dx] = cell;
  }
  return next;
}

export interface FullLines {
  rows: number[];
  cols: number[];
}

export function getFullLines(board: Board): FullLines {
  const rows: number[] = [];
  const cols: number[] = [];
  for (let y = 0; y < H; y += 1) {
    if (board[y]!.every((cell) => cell !== null)) rows.push(y);
  }
  for (let x = 0; x < W; x += 1) {
    let full = true;
    for (let y = 0; y < H; y += 1) {
      if (board[y]![x] === null) {
        full = false;
        break;
      }
    }
    if (full) cols.push(x);
  }
  return { rows, cols };
}

export function countFullLines(board: Board): number {
  const full = getFullLines(board);
  return full.rows.length + full.cols.length;
}

/** Full rows and columns are cleared together; overlaps are collected once. */
export function clearLines(
  board: Board,
  lines: FullLines = getFullLines(board),
): { board: Board; cells: ClearedCell[] } {
  const next = cloneBoard(board);
  const seen = new Set<string>();
  const cells: ClearedCell[] = [];

  const collect = (x: number, y: number): void => {
    const key = `${x},${y}`;
    if (seen.has(key)) return;
    seen.add(key);
    const cell = next[y]![x];
    if (cell !== null) cells.push({ x, y, cell });
    next[y]![x] = null;
  };

  for (const y of lines.rows) for (let x = 0; x < W; x += 1) collect(x, y);
  for (const x of lines.cols) for (let y = 0; y < H; y += 1) collect(x, y);

  return { board: next, cells };
}

export function getLegalMoves(board: Board, pieces: readonly (Piece | null)[]): Placement[] {
  const moves: Placement[] = [];
  pieces.forEach((piece, pieceIndex) => {
    if (piece === null) return;
    for (let y = 0; y <= H - piece.shape.height; y += 1) {
      for (let x = 0; x <= W - piece.shape.width; x += 1) {
        if (canPlace(board, piece, x, y)) moves.push({ pieceIndex, x, y });
      }
    }
  });
  return moves;
}

export function hasAnyLegalMove(board: Board, pieces: readonly (Piece | null)[]): boolean {
  // An empty tray only happens while a new set is being dealt, which never
  // survives a full turn. Treat it as alive so we do not declare a false loss.
  if (pieces.every((piece) => piece === null)) return true;
  return getLegalMoves(board, pieces).length > 0;
}

export function countFilled(board: Board): number {
  let total = 0;
  for (const row of board) for (const cell of row) if (cell !== null) total += 1;
  return total;
}

/** Number of filled cells per column, counted from the bottom up. */
export function columnHeights(board: Board): number[] {
  const heights: number[] = [];
  for (let x = 0; x < W; x += 1) {
    let top: number = H;
    for (let y = 0; y < H; y += 1) {
      if (board[y]![x] !== null) {
        top = y;
        break;
      }
    }
    heights.push(H - top);
  }
  return heights;
}

/** N E S W suffix, matching the filenames in assets/textures/blocks. */
export function blockKey(color: string, n: boolean, e: boolean, s: boolean, w: boolean): string {
  const suffix = (n ? 'N' : '') + (e ? 'E' : '') + (s ? 'S' : '') + (w ? 'W' : '');
  return `block_${color}_${suffix || 'single'}`;
}

/** Which atlas frame to draw for a cell, connecting only to the same piece id. */
export function getBlockKeyAt(board: Board, x: number, y: number): string | null {
  const cell = board[y]?.[x];
  if (cell === undefined || cell === null) return null;
  if (cell.garbage || cell.pieceId === GARBAGE_PIECE_ID) return 'block_garbage';

  const connected = (nx: number, ny: number): boolean =>
    inBounds(nx, ny) && board[ny]![nx]?.pieceId === cell.pieceId;

  return blockKey(
    cell.color as PieceColor,
    connected(x, y - 1),
    connected(x + 1, y),
    connected(x, y + 1),
    connected(x - 1, y),
  );
}
