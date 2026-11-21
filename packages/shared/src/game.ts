import {
  canPlace,
  cloneBoard,
  createBoard,
  getFullLines,
  hasAnyLegalMove,
  placePiece,
} from './board';
import { clearLines } from './board';
import { garbageForClear, addGarbage } from './garbage';
import { generatePieceSet } from './pieces';
import { scorePlacement, type PlacementScore } from './scoring';
import { type ClearedCell, type Move, type Piece, type PlayerIndex, type Point } from './types';

export interface PlayerState {
  board: ReturnType<typeof createBoard>;
  tray: (Piece | null)[];
  setIndex: number;
  score: number;
  streak: number;
  status: 'playing' | 'lost';
}

export interface MatchState {
  seed: number;
  players: [PlayerState, PlayerState];
  eventIndex: number;
  winner: PlayerIndex | null;
  phase: 'countdown' | 'playing' | 'ended';
}

export type GameEvent =
  | { type: 'placed'; player: PlayerIndex; pieceIndex: number; cells: Point[] }
  | {
      type: 'cleared';
      player: PlayerIndex;
      rows: number[];
      cols: number[];
      cells: ClearedCell[];
      score: PlacementScore;
    }
  | { type: 'attack'; from: PlayerIndex; to: PlayerIndex; amount: number; cells: Point[] }
  | { type: 'newSet'; player: PlayerIndex; pieces: Piece[] }
  | { type: 'gameOver'; winner: PlayerIndex | null };

export interface MoveOutcome {
  ok: boolean;
  reason?: string;
  state: MatchState;
  events: GameEvent[];
}

function makePlayer(seed: number): PlayerState {
  return {
    board: createBoard(),
    tray: generatePieceSet(seed, 0),
    setIndex: 0,
    score: 0,
    streak: 0,
    status: 'playing',
  };
}

/** Both players are dealt set 0 from the same seed. */
export function createMatch(seed: number): MatchState {
  return {
    seed,
    players: [makePlayer(seed), makePlayer(seed)],
    eventIndex: 0,
    winner: null,
    phase: 'countdown',
  };
}

export function startMatch(match: MatchState): MatchState {
  if (match.phase !== 'countdown') return match;
  return { ...match, phase: 'playing' };
}

function cloneMatch(match: MatchState): MatchState {
  return {
    ...match,
    players: match.players.map((player) => ({
      ...player,
      board: cloneBoard(player.board),
      tray: player.tray.slice(),
    })) as [PlayerState, PlayerState],
  };
}

function rejected(match: MatchState, reason: string): MoveOutcome {
  return { ok: false, reason, state: match, events: [] };
}

/** The single source of truth for applying a move. Used by humans and bots. */
export function applyMove(match: MatchState, playerIndex: PlayerIndex, move: Move): MoveOutcome {
  if (match.phase !== 'playing') return rejected(match, 'match is not active');
  const current = match.players[playerIndex];
  if (current.status !== 'playing') return rejected(match, 'player has already lost');
  if (move.setIndex !== current.setIndex) return rejected(match, 'move belongs to an old set');
  if (!Number.isInteger(move.x) || !Number.isInteger(move.y)) {
    return rejected(match, 'placement must use whole cells');
  }
  if (move.pieceIndex < 0 || move.pieceIndex >= current.tray.length) {
    return rejected(match, 'no such tray slot');
  }

  const piece = current.tray[move.pieceIndex];
  if (piece === null) return rejected(match, 'that tray slot is empty');
  if (!canPlace(current.board, piece, move.x, move.y)) {
    return rejected(match, 'piece does not fit there');
  }

  const next = cloneMatch(match);
  const actor = next.players[playerIndex];
  const events: GameEvent[] = [];

  const placedBoard = placePiece(actor.board, piece, move.x, move.y)!;
  const full = getFullLines(placedBoard);
  const lines = full.rows.length + full.cols.length;
  const cleared = clearLines(placedBoard, full);
  const score = scorePlacement(piece.shape.cells.length, lines, actor.streak);

  actor.board = cleared.board;
  actor.score += score.total;
  actor.streak = score.streak;
  actor.tray[move.pieceIndex] = null;
  next.eventIndex += 1;

  events.push({
    type: 'placed',
    player: playerIndex,
    pieceIndex: move.pieceIndex,
    cells: piece.shape.cells.map(([dx, dy]) => ({ x: move.x + dx, y: move.y + dy })),
  });
  if (lines > 0) {
    events.push({
      type: 'cleared',
      player: playerIndex,
      rows: full.rows,
      cols: full.cols,
      cells: cleared.cells,
      score,
    });
  }

  const attack = garbageForClear(lines, score.streak);
  if (attack > 0) {
    const victim = next.players[(1 - playerIndex) as PlayerIndex];
    if (victim.status === 'playing') {
      const garbage = addGarbage(victim.board, attack, next.seed, next.eventIndex, victim.tray);
      victim.board = garbage.board;
      if (garbage.actual > 0) {
        events.push({
          type: 'attack',
          from: playerIndex,
          to: (1 - playerIndex) as PlayerIndex,
          amount: garbage.actual,
          cells: garbage.placed,
        });
      }
    }
  }

  if (actor.tray.every((slot) => slot === null)) {
    actor.setIndex += 1;
    actor.tray = generatePieceSet(next.seed, actor.setIndex);
    events.push({
      type: 'newSet',
      player: playerIndex,
      pieces: actor.tray.filter((piece): piece is Piece => piece !== null),
    });
  }

  const losers: PlayerIndex[] = [];
  for (const index of [0, 1] as const) {
    const player = next.players[index];
    if (player.status === 'playing' && !hasAnyLegalMove(player.board, player.tray)) {
      player.status = 'lost';
      losers.push(index);
    }
  }

  if (losers.length > 0) {
    if (losers.length === 1) {
      next.winner = (1 - losers[0]) as PlayerIndex;
    } else {
      const a = next.players[0].score;
      const b = next.players[1].score;
      next.winner = a > b ? 0 : b > a ? 1 : null;
    }
    next.phase = 'ended';
    events.push({ type: 'gameOver', winner: next.winner });
  }

  return { ok: true, state: next, events };
}
