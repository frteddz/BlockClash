import { describe, expect, it } from 'vitest';
import { getLegalMoves } from '../board';
import { CONFIG } from '../config';
import { applyMove, createMatch, startMatch } from '../game';
import { generatePieceSet } from '../pieces';
import type { Piece, PieceShape } from '../types';

function vertical2(id: number): Piece {
  const shape: PieceShape = {
    id: 'v2',
    weight: 1,
    cells: [
      [0, 0],
      [0, 1],
    ],
    width: 1,
    height: 2,
  };
  return { id, shape, color: 'blue' };
}

function readyMatch(seed = 42) {
  return startMatch(createMatch(seed));
}

describe('game', () => {
  it('starts both players with identical piece sets', () => {
    const match = createMatch(42);
    expect(match.phase).toBe('countdown');
    expect(match.players[0].tray).toEqual(match.players[1].tray);
    expect(match.players[0].tray).toEqual(generatePieceSet(42, 0));
    expect(startMatch(match).phase).toBe('playing');
  });

  it('rejects illegal moves without changing the match', () => {
    const match = readyMatch();
    const piece = match.players[0].tray[0]!;
    const good = { setIndex: 0, ...getLegalMoves(match.players[0].board, [piece])[0]! };
    for (const move of [
      { ...good, setIndex: 9 },
      { ...good, pieceIndex: 9 },
      { ...good, x: -1 },
      { ...good, y: 99 },
    ]) {
      const result = applyMove(match, 0, move);
      expect(result.ok).toBe(false);
      expect(result.state).toBe(match);
    }
    expect(applyMove(createMatch(42), 0, good).ok).toBe(false);
  });

  it('applies a placement, scores it and empties the tray slot', () => {
    const match = readyMatch();
    const piece = match.players[0].tray[0]!;
    const target = getLegalMoves(match.players[0].board, [piece])[0]!;
    const result = applyMove(match, 0, { setIndex: 0, ...target });
    expect(result.ok).toBe(true);
    expect(result.state.players[0].tray[target.pieceIndex]).toBeNull();
    expect(result.state.players[0].score).toBeGreaterThan(0);
    expect(result.events.some((event) => event.type === 'placed')).toBe(true);
    expect(match.players[0].score).toBe(0);
  });

  it('deals a new set after all three pieces are played', () => {
    let match = readyMatch(11);
    for (let i = 0; i < CONFIG.traySize; i += 1) {
      const piece = match.players[0].tray[i]!;
      const target = getLegalMoves(match.players[0].board, [piece])[0]!;
      const result = applyMove(match, 0, {
        setIndex: match.players[0].setIndex,
        pieceIndex: i,
        x: target.x,
        y: target.y,
      });
      expect(result.ok).toBe(true);
      match = result.state;
    }
    expect(match.players[0].setIndex).toBe(1);
    expect(match.players[0].tray).toEqual(generatePieceSet(11, 1));
    expect(match.players[1].setIndex).toBe(0);
  });

  it('clears two lines, attacks the opponent and keeps garbage deterministic', () => {
    const match = readyMatch(777);
    const actor = match.players[0];
    for (let y = CONFIG.board.height - 2; y < CONFIG.board.height; y += 1) {
      for (let x = 1; x < CONFIG.board.width; x += 1) {
        actor.board[y]![x] = { pieceId: 100 + x + y, color: 'red', garbage: false };
      }
    }
    actor.tray = [vertical2(999), null, null];

    const result = applyMove(match, 0, { setIndex: 0, pieceIndex: 0, x: 0, y: 6 });
    expect(result.ok).toBe(true);
    const cleared = result.events.find((event) => event.type === 'cleared');
    expect(cleared?.type === 'cleared' && cleared.rows).toEqual([6, 7]);
    const attack = result.events.find((event) => event.type === 'attack');
    expect(attack?.type === 'attack' && attack.amount).toBe(CONFIG.attack.garbagePerExtraLine);
    expect(result.state.players[0].score).toBeGreaterThan(20);

    const sameSeed = readyMatch(777);
    sameSeed.players[0].board = match.players[0].board;
    sameSeed.players[0].tray = [vertical2(999), null, null];
    const replay = applyMove(sameSeed, 0, { setIndex: 0, pieceIndex: 0, x: 0, y: 6 });
    expect(replay.state.players[1].board).toEqual(result.state.players[1].board);
  });

  it('ends the match when a player has no legal move', () => {
    const match = readyMatch();
    for (let y = 0; y < CONFIG.board.height; y += 1) {
      for (let x = 0; x < CONFIG.board.width; x += 1) {
        match.players[1].board[y]![x] = { pieceId: 500 + x + y, color: 'teal', garbage: false };
      }
    }
    const myPiece = match.players[0].tray[0]!;
    const target = getLegalMoves(match.players[0].board, [myPiece])[0]!;
    const result = applyMove(match, 0, { setIndex: 0, ...target });
    expect(result.ok).toBe(true);
    expect(result.state.phase).toBe('ended');
    expect(result.state.players[1].status).toBe('lost');
    expect(result.state.winner).toBe(0);
    expect(result.events.some((event) => event.type === 'gameOver')).toBe(true);
  });
});
