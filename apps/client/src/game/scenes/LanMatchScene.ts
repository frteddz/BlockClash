import Phaser from 'phaser';
import type { PluginListenerHandle } from '@capacitor/core';
import {
  applyMove,
  canPlace,
  createMatch,
  startMatch,
  CONFIG,
  type GameEvent,
  type MatchState,
  type Move,
  type Piece,
  type PlayerIndex,
} from '@blockclash/shared';
import { audio } from '../audio/audio-manager';
import { BLOCKS_TEXTURE, frameFor } from '../textures/atlas';
import { blockKey } from '../textures/block-key';
import { COLOR, CSS, FONT, uiPx } from '../theme';
import { makePanel } from '../ui/button';
import { BoardView } from '../ui/board-view';
import { inside, onCanvasPointer, type Point2, type Rect } from '../ui/input';
import type { LanTransport } from '../lan/lan-session';
import type { LanMessage } from '../lan/protocol';

const TEXTURE_SIZE = 128;

interface LanData {
  role: 'host' | 'guest';
  code: string;
  seed?: number;
  transport: LanTransport;
}

interface DragState {
  piece: Piece;
  pieceIndex: number;
  sprites: Phaser.GameObjects.Image[];
  target: Point2 | null;
}

export class LanMatchScene extends Phaser.Scene {
  private lanData!: LanData;
  private transport!: LanTransport;
  private role: 'host' | 'guest' = 'guest';
  private me: PlayerIndex = 1;
  private match?: MatchState;
  private ready = false;
  private drag: DragState | null = null;
  private cellSize = 40;
  private trayCell = 24;
  private trayY = 0;
  private trayRects: Rect[] = [];
  private youView!: BoardView;
  private rivalView!: BoardView;
  private visuals: Phaser.GameObjects.GameObject[] = [];
  private trayObjects: Phaser.GameObjects.GameObject[] = [];
  private trayImages: Phaser.GameObjects.Image[][] = [[], [], []];
  private scoreText?: Phaser.GameObjects.Text;
  private rivalScoreText?: Phaser.GameObjects.Text;
  private countdownText?: Phaser.GameObjects.Text;
  private listener?: PluginListenerHandle;

  constructor() {
    super('LanMatch');
  }

  init(data: LanData): void {
    this.lanData = data;
  }

  create(): void {
    this.role = this.lanData.role;
    this.me = this.role === 'host' ? 0 : 1;
    this.transport = this.lanData.transport;
    this.cameras.main.setBackgroundColor(COLOR.background);
    this.buildLayout();

    this.countdownText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(60), Math.min(uiPx(130), this.scale.width * 0.2))}px`,
        color: CSS.accent,
        stroke: CSS.light,
        strokeThickness: uiPx(8),
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);

    onCanvasPointer(this, 'down', (point) => this.onDown(point));
    onCanvasPointer(this, 'move', (point) => this.onMove(point));
    onCanvasPointer(this, 'up', () => this.onUp());
    this.scale.on('resize', this.onResize, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.scale.off('resize', this.onResize, this);
      void this.listener?.remove();
      this.transport.close();
      this.tweens.killAll();
    });

    void this.connect();
  }

  private async connect(): Promise<void> {
    if (this.role === 'host') {
      this.match = createMatch(this.lanData.seed!);
      this.listener = (await this.transport.onMessage((message) => this.onMessage(message))) ?? undefined;
      this.refresh();
    } else {
      this.transport.setHandlers?.(
        () => this.transport.send({ t: 'hello', name: 'Guest' }),
        (message) => this.onMessage(message),
      );
    }
  }

  private onMessage(message: LanMessage): void {
    if (message.t === 'hello' && this.role === 'host' && this.match !== undefined) {
      this.transport.send({ t: 'welcome', seed: this.match.seed, youAre: 1 });
      this.transport.send({ t: 'countdown', seed: this.match.seed });
      this.runCountdown();
      return;
    }
    if (message.t === 'welcome' && this.role === 'guest') {
      this.match = createMatch(message.seed);
      this.me = message.youAre;
      this.refresh();
      return;
    }
    if (message.t === 'countdown' && this.role === 'guest') {
      if (this.match === undefined) this.match = createMatch(message.seed);
      this.refresh();
      this.runCountdown();
      return;
    }
    if (message.t === 'start' && this.role === 'guest') {
      this.ready = true;
      if (this.match !== undefined) this.match = startMatch(this.match);
      return;
    }
    if (message.t === 'move' && this.role === 'host' && this.match !== undefined && this.ready) {
      const move: Move = {
        setIndex: message.setIndex,
        pieceIndex: message.pieceIndex,
        x: message.x,
        y: message.y,
      };
      const outcome = applyMove(this.match, 1, move);
      if (outcome.ok) {
        this.match = outcome.state;
        this.processEvents(outcome.events);
        this.refresh();
        this.broadcastState(outcome.events);
        this.checkEnd();
      }
      return;
    }
    if (message.t === 'state' && this.role === 'guest') {
      this.match = message.match;
      this.processEvents(message.events);
      this.refresh();
      if (this.match.phase === 'ended') this.finish();
      return;
    }
    if (message.t === 'end') this.finish();
  }

  private broadcastState(events: GameEvent[]): void {
    if (this.match === undefined) return;
    this.transport.send({ t: 'state', match: this.match, events });
  }

  private checkEnd(): void {
    if (this.match?.phase === 'ended') this.finish();
  }

  private runCountdown(): void {
    let remaining = CONFIG.match.countdownSeconds;
    const tick = (): void => {
      if (!this.countdownText?.active) return;
      this.countdownText.setText(String(remaining)).setVisible(true).setAlpha(1).setScale(0.5);
      audio.play('countdown_tick');
      this.tweens.add({ targets: this.countdownText, scaleX: 1.1, scaleY: 1.1, duration: 200 });
      remaining -= 1;
      if (remaining > 0) {
        this.time.delayedCall(750, tick);
      } else {
        this.time.delayedCall(750, () => {
          if (!this.countdownText?.active) return;
          this.countdownText.setText('GO!').setAlpha(1).setScale(1);
          audio.play('countdown_go');
          this.tweens.add({
            targets: this.countdownText,
            alpha: 0,
            duration: 400,
            onComplete: () => this.countdownText?.setVisible(false),
          });
          this.ready = true;
          if (this.match !== undefined) this.match = startMatch(this.match);
          if (this.role === 'host') this.transport.send({ t: 'start' });
          this.updateHud();
        });
      }
    };
    tick();
  }

  private buildLayout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const portrait = height > width * 1.05;
    const slot = uiPx(130);

    let youX: number;
    let youY: number;
    let rivalX: number;
    let rivalY: number;
    let rivalCell: number;
    let cell: number;
    let trayCenterY: number;

    if (portrait) {
      rivalCell = Math.max(uiPx(14), Math.min((width - uiPx(56)) / 8, (height * 0.2) / 8));
      rivalX = (width - rivalCell * 8) / 2;
      rivalY = height * 0.17;
      youY = rivalY + rivalCell * 8 + uiPx(42);
      cell = Math.max(uiPx(18), Math.min((width - uiPx(28)) / 8, (height - youY - slot - uiPx(60)) / 8));
      youX = (width - cell * 8) / 2;
      trayCenterY = youY + cell * 8 + uiPx(16) + slot / 2;
    } else {
      cell = Math.max(uiPx(18), Math.min((width / 2 - uiPx(68)) / 8, (height - uiPx(200)) / 8));
      rivalCell = cell;
      const top = Math.max(uiPx(64), height * 0.13);
      rivalX = width / 2 - cell * 8 - uiPx(30);
      youX = width / 2 + uiPx(30);
      youY = top;
      rivalY = top;
      trayCenterY = youY + cell * 8 + uiPx(16) + slot / 2;
    }

    this.cellSize = cell;
    this.youView = new BoardView(this, youX, youY, cell, 8, 8);
    this.rivalView = new BoardView(this, rivalX, rivalY, rivalCell, 8, 8);
    this.visuals.push(makePanel(this, width / 2, uiPx(32), Math.min(uiPx(620), width * 0.9), uiPx(52)));
    this.scoreText = this.add
      .text(width / 2, uiPx(32), this.role === 'host' ? 'HOST' : 'GUEST', {
        fontFamily: FONT.display,
        fontSize: `${uiPx(22)}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    this.visuals.push(this.scoreText);
    this.rivalScoreText = this.add
      .text(width / 2, uiPx(64), `CODE ${this.lanData.code}`, {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(14)}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);
    this.visuals.push(this.rivalScoreText);

    this.trayCell = Math.max(uiPx(12), Math.min(width / 14, height * 0.04));
    this.trayY = trayCenterY;
    this.buildTray(width);
  }

  private buildTray(width: number): void {
    const cell = this.trayCell;
    const slotWidth = cell * 4.4;
    const slotHeight = cell * 4.4;
    const gap = uiPx(10);
    const total = slotWidth * 3 + gap * 2;
    const firstX = (width - total) / 2 + slotWidth / 2;
    this.trayImages = [[], [], []];
    this.trayRects = [];

    for (let index = 0; index < CONFIG.traySize; index += 1) {
      const centerX = firstX + index * (slotWidth + gap);
      this.trayRects.push({
        x: centerX - slotWidth / 2,
        y: this.trayY - slotHeight / 2,
        w: slotWidth,
        h: slotHeight,
      });
      this.trayObjects.push(makePanel(this, centerX, this.trayY, slotWidth, slotHeight));
      const piece = this.match?.players[this.me].tray[index];
      if (piece === null || piece === undefined) continue;
      for (const [dx, dy] of piece.shape.cells) {
        const has = (cx: number, cy: number): boolean =>
          piece.shape.cells.some(([ox, oy]) => ox === cx && oy === cy);
        const image = this.add
          .image(
            centerX + (dx - (piece.shape.width - 1) / 2) * cell,
            this.trayY + (dy - (piece.shape.height - 1) / 2) * cell,
            BLOCKS_TEXTURE,
            frameFor(blockKey(piece.color, has(dx, dy - 1), has(dx + 1, dy), has(dx, dy + 1), has(dx - 1, dy))),
          )
          .setScale(cell / TEXTURE_SIZE);
        this.trayImages[index]!.push(image);
        this.trayObjects.push(image);
      }
    }
  }

  private refresh(): void {
    if (this.match === undefined) {
      this.youView.setBoard(Array.from({ length: 8 }, () => Array(8).fill(null)));
      this.rivalView.setBoard(Array.from({ length: 8 }, () => Array(8).fill(null)));
      return;
    }
    // Show the player on the big board, the opponent on the small one.
    this.youView.setBoard(this.match.players[this.me].board);
    this.rivalView.setBoard(this.match.players[(1 - this.me) as PlayerIndex].board);
    for (const object of this.trayObjects) object.destroy();
    this.trayObjects = [];
    this.buildTray(this.scale.width);
    this.updateHud();
  }

  private updateHud(): void {
    if (this.scoreText?.active && this.match !== undefined) {
      this.scoreText.setText(`${this.role === 'host' ? 'HOST' : 'GUEST'}  ${this.match.players[this.me].score}`);
    }
  }

  private processEvents(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'placed') {
        audio.play('piece_place');
        (event.player === this.me ? this.youView : this.rivalView).popCells(event.cells, false);
      } else if (event.type === 'cleared') {
        audio.play(event.rows.length + event.cols.length >= 3 ? 'big_clear' : 'line_clear');
        const view = event.player === this.me ? this.youView : this.rivalView;
        view.sparkle(event.cells.map((cell) => ({ x: cell.x, y: cell.y })), COLOR.gold, false);
      } else if (event.type === 'attack' && event.to === this.me) {
        audio.play('attack_receive');
        audio.play('garbage_land');
        this.cameras.main.shake(160, 0.006);
      } else if (event.type === 'attack' && event.from === this.me) {
        audio.play('attack_send');
      }
    }
  }

  private onDown(point: Point2): void {
    if (!this.ready || this.match === undefined || this.drag !== null) return;
    const index = this.trayRects.findIndex((rect) => inside(point, rect));
    if (index < 0) return;
    const piece = this.match.players[this.me].tray[index];
    if (piece === null || piece === undefined) return;
    audio.play('piece_pickup');
    const sprites: Phaser.GameObjects.Image[] = [];
    for (const [dx, dy] of piece.shape.cells) {
      const has = (cx: number, cy: number): boolean =>
        piece.shape.cells.some(([ox, oy]) => ox === cx && oy === cy);
      sprites.push(
        this.add
          .image(0, 0, BLOCKS_TEXTURE, frameFor(blockKey(piece.color, has(dx, dy - 1), has(dx + 1, dy), has(dx, dy + 1), has(dx - 1, dy))))
          .setScale(this.cellSize / TEXTURE_SIZE)
          .setDepth(100),
      );
    }
    this.drag = { piece, pieceIndex: index, sprites, target: null };
    this.updateDrag(point);
  }

  private onMove(point: Point2): void {
    if (this.drag !== null) this.updateDrag(point);
  }

  private updateDrag(point: Point2): void {
    if (this.drag === null || this.match === undefined) return;
    const { piece, sprites } = this.drag;
    const cell = this.cellSize;
    const lift = cell * 1.15;
    const centerX = point.x;
    const centerY = point.y - lift;
    sprites.forEach((sprite, i) => {
      const [dx, dy] = piece.shape.cells[i]!;
      sprite.setPosition(
        centerX + (dx - (piece.shape.width - 1) / 2) * cell,
        centerY + (dy - (piece.shape.height - 1) / 2) * cell,
      );
    });
    const anchorX = centerX - (piece.shape.width * cell) / 2;
    const anchorY = centerY - (piece.shape.height * cell) / 2;
    const target = this.youView.worldToCell(anchorX, anchorY);
    const valid = canPlace(this.match.players[this.me].board, piece, target.x, target.y);
    this.drag.target = valid ? target : null;
    this.youView.setGhost(valid ? piece : null, target.x, target.y, valid);
  }

  private onUp(): void {
    if (this.drag === null) return;
    const { pieceIndex, target, sprites } = this.drag;
    for (const sprite of sprites) sprite.destroy();
    this.youView.clearGhost();
    this.drag = null;
    if (target === null) {
      audio.play('piece_invalid');
      return;
    }
    const move: Move = {
      setIndex: this.match?.players[this.me].setIndex ?? 0,
      pieceIndex,
      x: target.x,
      y: target.y,
    };
    if (this.role === 'host') {
      const outcome = applyMove(this.match!, 0, move);
      if (outcome.ok) {
        this.match = outcome.state;
        this.processEvents(outcome.events);
        this.refresh();
        this.broadcastState(outcome.events);
        this.checkEnd();
      } else {
        audio.play('piece_invalid');
      }
    } else {
      this.transport.send({ t: 'move', ...move });
      // The host will send back the authoritative state.
    }
  }

  private onResize(): void {
    if (this.drag !== null) {
      for (const sprite of this.drag.sprites) sprite.destroy();
      this.drag = null;
    }
    this.youView?.destroy();
    this.rivalView?.destroy();
    for (const object of [...this.visuals, ...this.trayObjects]) object.destroy();
    this.visuals = [];
    this.trayObjects = [];
    this.buildLayout();
    this.countdownText?.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.refresh();
  }

  private finish(): void {
    if (this.match === undefined) return;
    const winner = this.match.winner;
    const won = winner === this.me;
    audio.play(won ? 'victory' : 'defeat');
    this.scene.start('Result', {
      won,
      draw: winner === null,
      playerScore: this.match.players[this.me].score,
      botScore: this.match.players[(1 - this.me) as PlayerIndex].score,
      difficulty: 'lan',
    });
  }
}
