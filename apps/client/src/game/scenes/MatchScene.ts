import Phaser from 'phaser';
import {
  applyMove,
  botDelayMs,
  canPlace,
  chooseMove,
  createMatch,
  createRng,
  hashSeed,
  startMatch,
  CONFIG,
  type Difficulty,
  type GameEvent,
  type MatchState,
  type Move,
  type Piece,
  type PlayerIndex,
  type Point,
  type Rng,
} from '@blockclash/shared';
import { audio } from '../audio/audio-manager';
import { BLOCKS_TEXTURE, frameFor } from '../textures/atlas';
import { blockKey } from '../textures/block-key';
import { COLOR, CSS, FONT } from '../theme';
import { makePanel } from '../ui/button';
import { BoardView } from '../ui/board-view';

interface DragState {
  pieceIndex: number;
  piece: Piece;
  sprites: Phaser.GameObjects.Image[];
  target: Point | null;
}

const TEXTURE_SIZE = 128;

export class MatchScene extends Phaser.Scene {
  private difficulty: Difficulty = 'medium';
  private match!: MatchState;
  private botRng!: Rng;
  private playerView!: BoardView;
  private opponentView!: BoardView;
  private boardCellSize = 40;
  private trayCellSize = 24;
  private trayCenterY = 0;
  private drag: DragState | null = null;
  private busy = true;
  private reduceMotion = false;

  private visualObjects: Phaser.GameObjects.GameObject[] = [];
  private trayObjects: Phaser.GameObjects.GameObject[] = [];
  private traySlotImages: Phaser.GameObjects.Image[][] = [[], [], []];
  private scoreText!: Phaser.GameObjects.Text;
  private botScoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private countdownText!: Phaser.GameObjects.Text;

  constructor() {
    super('Match');
  }

  init(data: { difficulty?: Difficulty }): void {
    this.difficulty = data.difficulty ?? 'medium';
  }

  create(): void {
    this.reduceMotion = audio.getSettings().reduceMotion;
    const seedBuffer = new Uint32Array(1);
    crypto.getRandomValues(seedBuffer);
    const seed = seedBuffer[0]!;
    this.match = createMatch(seed);
    this.botRng = createRng(hashSeed(seed, 0xb07));
    this.cameras.main.setBackgroundColor(COLOR.background);

    this.layout();
    this.countdownText = this.add
      .text(this.scale.width / 2, this.scale.height / 2, '', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(60, Math.min(130, this.scale.width * 0.2))}px`,
        color: CSS.accent,
        stroke: CSS.light,
        strokeThickness: 8,
      })
      .setOrigin(0.5)
      .setDepth(200)
      .setVisible(false);

    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off('pointermove', this.onPointerMove, this);
      this.input.off('pointerup', this.onPointerUp, this);
      this.scale.off('resize', this.onResize, this);
      this.tweens.killAll();
    });

    audio.play('match_found');
    this.startCountdown();
  }

  private layout(): void {
    const width = this.scale.width;
    const height = this.scale.height;
    const columns = CONFIG.board.width;
    const rows = CONFIG.board.height;
    const portrait = height > width * 1.05;

    // Work out the tray first so the boards never grow into it.
    const trayCell = Math.max(12, Math.min(width / 14, height * 0.04));
    const traySlotHeight = trayCell * 4.4;
    let opponentX: number;
    let opponentY: number;
    let opponentCell: number;
    let playerX: number;
    let playerY: number;
    let playerCell: number;
    let trayY: number;

    if (portrait) {
      opponentCell = Math.max(14, Math.min((width - 56) / columns, (height * 0.2) / rows));
      opponentX = (width - opponentCell * columns) / 2;
      opponentY = height * 0.17;
      playerY = opponentY + opponentCell * rows + 42;
      playerCell = Math.max(
        18,
        Math.min((width - 28) / columns, (height - playerY - traySlotHeight - 60) / rows),
      );
      playerX = (width - playerCell * columns) / 2;
      trayY = playerY + playerCell * rows + 16 + traySlotHeight / 2;
    } else {
      const top = Math.max(64, height * 0.13);
      playerCell = Math.max(
        18,
        Math.min((width / 2 - 68) / columns, (height - top - traySlotHeight - 70) / rows),
      );
      opponentCell = playerCell;
      opponentX = width / 2 - playerCell * columns - 30;
      playerX = width / 2 + 30;
      opponentY = top;
      playerY = top;
      trayY = playerY + playerCell * rows + 16 + traySlotHeight / 2;
    }

    this.boardCellSize = playerCell;
    this.playerView = new BoardView(this, playerX, playerY, playerCell, columns, rows);
    this.opponentView = new BoardView(this, opponentX, opponentY, opponentCell, columns, rows);

    const labelSize = Math.max(14, Math.min(24, width * 0.035));
    this.visualObjects.push(makePanel(this, width * 0.25, 32, width * 0.42, 52));
    this.visualObjects.push(makePanel(this, width * 0.75, 32, width * 0.42, 52));
    const botLabel = this.add
      .text(width * 0.06, 20, 'BOT', {
        fontFamily: FONT.display,
        fontSize: `${labelSize}px`,
        color: CSS.soft,
      })
      .setOrigin(0, 0);
    const youLabel = this.add
      .text(width * 0.56, 20, 'YOU', {
        fontFamily: FONT.display,
        fontSize: `${labelSize}px`,
        color: CSS.soft,
      })
      .setOrigin(0, 0);
    this.visualObjects.push(botLabel, youLabel);
    this.scoreText = this.add
      .text(width * 0.75, 34, '0', {
        fontFamily: FONT.display,
        fontSize: `${labelSize + 8}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    this.botScoreText = this.add
      .text(width * 0.25, 34, '0', {
        fontFamily: FONT.display,
        fontSize: `${labelSize + 8}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    this.statusText = this.add
      .text(width / 2, 76, `VS ${this.difficulty.toUpperCase()} BOT`, {
        fontFamily: FONT.ui,
        fontSize: `${Math.max(12, Math.min(18, width * 0.028))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);
    this.comboText = this.add
      .text(playerX + (playerCell * columns) / 2, playerY - 24, '', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(22, Math.min(40, playerCell * 0.85))}px`,
        color: CSS.accent,
        stroke: CSS.light,
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setVisible(false);

    this.trayCellSize = trayCell;
    this.trayCenterY = trayY;
    this.buildTray(width, trayY);
  }

  private buildTray(width: number, centerY: number): void {
    const cell = this.trayCellSize;
    const slotWidth = cell * 4.4;
    const slotHeight = cell * 4.4;
    const gap = 10;
    const total = slotWidth * 3 + gap * 2;
    const firstX = (width - total) / 2 + slotWidth / 2;
    this.traySlotImages = [[], [], []];

    for (let index = 0; index < CONFIG.traySize; index += 1) {
      const centerX = firstX + index * (slotWidth + gap);
      const panel = makePanel(this, centerX, centerY, slotWidth, slotHeight, COLOR.panel);
      this.trayObjects.push(panel);

      const piece = this.match.players[0].tray[index];
      if (piece !== undefined && piece !== null) {
        for (const [dx, dy] of piece.shape.cells) {
          const x = centerX + (dx - (piece.shape.width - 1) / 2) * cell;
          const y = centerY + (dy - (piece.shape.height - 1) / 2) * cell;
          const image = this.add
            .image(
              x,
              y,
              BLOCKS_TEXTURE,
              frameFor(
                blockKey(
                  piece.color,
                  piece.shape.cells.some(([cx, cy]) => cx === dx && cy === dy - 1),
                  piece.shape.cells.some(([cx, cy]) => cx === dx + 1 && cy === dy),
                  piece.shape.cells.some(([cx, cy]) => cx === dx && cy === dy + 1),
                  piece.shape.cells.some(([cx, cy]) => cx === dx - 1 && cy === dy),
                ),
              ),
            )
            .setScale(cell / TEXTURE_SIZE);
          this.traySlotImages[index]!.push(image);
          this.trayObjects.push(image);
        }
      }

      const zone = this.add.zone(centerX, centerY, slotWidth, slotHeight).setInteractive();
      zone.on('pointerdown', () => this.onTrayDown(index));
      this.trayObjects.push(zone);
    }
  }

  private clearVisuals(): void {
    this.playerView?.destroy();
    this.opponentView?.destroy();
    for (const object of [...this.visualObjects, ...this.trayObjects]) object.destroy();
    this.visualObjects = [];
    this.trayObjects = [];
    this.traySlotImages = [[], [], []];
  }

  private onResize(): void {
    if (this.drag !== null) this.cancelDrag();
    this.tweens.killAll();
    this.clearVisuals();
    this.layout();
    this.countdownText.setPosition(this.scale.width / 2, this.scale.height / 2);
    this.refreshBoards();
    this.renderTray();
    this.updateHud();
  }

  private viewFor(player: PlayerIndex): BoardView {
    return player === 0 ? this.playerView : this.opponentView;
  }

  private refreshBoards(): void {
    this.playerView.setBoard(this.match.players[0].board);
    this.opponentView.setBoard(this.match.players[1].board);
  }

  private renderTray(): void {
    for (const object of this.trayObjects) object.destroy();
    this.trayObjects = [];
    this.traySlotImages = [[], [], []];
    this.buildTray(this.scale.width, this.trayCenterY);
  }

  private updateHud(): void {
    if (this.scoreText.active) this.scoreText.setText(String(this.match.players[0].score));
    if (this.botScoreText.active) this.botScoreText.setText(String(this.match.players[1].score));
    if (this.statusText.active) {
      this.statusText.setText(
        this.busy ? 'BOT IS THINKING...' : `VS ${this.difficulty.toUpperCase()} BOT`,
      );
    }
  }

  private startCountdown(): void {
    let remaining = CONFIG.match.countdownSeconds;
    const tick = (): void => {
      this.countdownText
        .setText(String(remaining))
        .setVisible(true)
        .setAlpha(1)
        .setScale(0.5)
        .setColor(CSS.accent);
      audio.play('countdown_tick');
      if (!this.reduceMotion) {
        this.tweens.add({
          targets: this.countdownText,
          scaleX: 1.1,
          scaleY: 1.1,
          duration: 220,
          ease: 'Back.easeOut',
        });
      }
      remaining -= 1;
      if (remaining > 0) {
        this.time.delayedCall(750, tick);
      } else {
        this.time.delayedCall(750, () => {
          this.countdownText.setText('GO!').setColor(CSS.light).setScale(1);
          audio.play('countdown_go');
          this.tweens.add({
            targets: this.countdownText,
            scaleX: 1.4,
            scaleY: 1.4,
            alpha: 0,
            duration: 450,
            onComplete: () => this.countdownText.setVisible(false),
          });
          this.match = startMatch(this.match);
          this.busy = false;
          this.updateHud();
        });
      }
    };
    tick();
  }

  private onTrayDown(index: number): void {
    if (this.busy || this.match.phase !== 'playing') return;
    const piece = this.match.players[0].tray[index];
    if (piece === null || piece === undefined) return;
    audio.play('piece_pickup');

    const sprites: Phaser.GameObjects.Image[] = [];
    for (const [dx, dy] of piece.shape.cells) {
      const key = blockKey(
        piece.color,
        piece.shape.cells.some(([cx, cy]) => cx === dx && cy === dy - 1),
        piece.shape.cells.some(([cx, cy]) => cx === dx + 1 && cy === dy),
        piece.shape.cells.some(([cx, cy]) => cx === dx && cy === dy + 1),
        piece.shape.cells.some(([cx, cy]) => cx === dx - 1 && cy === dy),
      );
      sprites.push(
        this.add
          .image(0, 0, BLOCKS_TEXTURE, frameFor(key))
          .setScale(this.boardCellSize / TEXTURE_SIZE)
          .setDepth(100),
      );
    }
    this.drag = { pieceIndex: index, piece, sprites, target: null };
    this.setTraySlotAlpha(index, 0.3);
    this.updateDrag(this.input.activePointer);
  }

  private onPointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.drag !== null) this.updateDrag(pointer);
  }

  private updateDrag(pointer: Phaser.Input.Pointer): void {
    if (this.drag === null) return;
    const { piece, sprites } = this.drag;
    const cell = this.boardCellSize;
    const lift = cell * 1.15;
    const centerX = pointer.x;
    const centerY = pointer.y - lift;

    sprites.forEach((sprite, i) => {
      const [dx, dy] = piece.shape.cells[i]!;
      sprite.setPosition(
        centerX + (dx - (piece.shape.width - 1) / 2) * cell,
        centerY + (dy - (piece.shape.height - 1) / 2) * cell,
      );
    });

    const anchorX = centerX - (piece.shape.width * cell) / 2;
    const anchorY = centerY - (piece.shape.height * cell) / 2;
    const target = this.playerView.worldToCell(anchorX, anchorY);
    const valid = canPlace(this.match.players[0].board, piece, target.x, target.y);
    this.drag.target = valid ? target : null;
    this.playerView.setGhost(valid ? piece : null, target.x, target.y, valid);
  }

  private onPointerUp(): void {
    if (this.drag === null) return;
    const { pieceIndex, target } = this.drag;
    this.cancelDrag();
    if (target !== null && !this.busy && this.match.phase === 'playing') {
      this.submitPlayerMove(pieceIndex, target.x, target.y);
    } else {
      audio.play('piece_invalid');
      this.setTraySlotAlpha(pieceIndex, 1);
    }
  }

  private cancelDrag(): void {
    if (this.drag === null) return;
    for (const sprite of this.drag.sprites) sprite.destroy();
    this.playerView?.clearGhost();
    this.drag = null;
  }

  private setTraySlotAlpha(index: number, alpha: number): void {
    for (const image of this.traySlotImages[index] ?? []) image.setAlpha(alpha);
  }

  private submitPlayerMove(pieceIndex: number, x: number, y: number): void {
    const move: Move = {
      setIndex: this.match.players[0].setIndex,
      pieceIndex,
      x,
      y,
    };
    const outcome = applyMove(this.match, 0, move);
    if (!outcome.ok) {
      audio.play('piece_invalid');
      this.setTraySlotAlpha(pieceIndex, 1);
      return;
    }
    this.busy = true;
    this.match = outcome.state;
    this.processEvents(outcome.events);
    this.refreshBoards();
    this.renderTray();
    this.updateHud();
    if (this.match.phase === 'ended') {
      this.finish();
      return;
    }
    this.time.delayedCall(botDelayMs(this.botRng), () => this.botTurn());
  }

  private botTurn(): void {
    if (this.match.phase !== 'playing') return;
    const bot = this.match.players[1];
    const placement = chooseMove(bot.board, bot.tray, this.difficulty, this.botRng);
    if (placement === null) {
      this.match = { ...this.match, phase: 'ended', winner: 0 };
      this.finish();
      return;
    }
    const outcome = applyMove(this.match, 1, { setIndex: bot.setIndex, ...placement });
    if (!outcome.ok) {
      this.busy = false;
      return;
    }
    this.match = outcome.state;
    this.processEvents(outcome.events);
    this.refreshBoards();
    this.updateHud();
    if (this.match.phase === 'ended') {
      this.finish();
      return;
    }
    this.busy = false;
    this.updateHud();
  }

  private processEvents(events: GameEvent[]): void {
    for (const event of events) {
      if (event.type === 'placed') {
        audio.play('piece_place');
        this.viewFor(event.player).popCells(event.cells, this.reduceMotion);
      } else if (event.type === 'cleared') {
        const lines = event.rows.length + event.cols.length;
        audio.play(lines >= 3 ? 'big_clear' : 'line_clear');
        if (event.score.streak > 1) {
          audio.play('combo', { rate: 1 + (event.score.streak - 1) * 0.08 });
        }
        this.viewFor(event.player).sparkle(
          event.cells.map((cell) => ({ x: cell.x, y: cell.y })),
          COLOR.gold,
          this.reduceMotion,
        );
        this.showCombo(event.score.streak);
      } else if (event.type === 'attack') {
        if (event.from === 0) audio.play('attack_send');
        if (event.to === 0) {
          audio.play('attack_receive');
          audio.play('garbage_land');
          if (!this.reduceMotion) this.cameras.main.shake(180, 0.007);
        }
        this.viewFor(event.to).sparkle(event.cells, COLOR.red, this.reduceMotion);
      }
    }
  }

  private showCombo(streak: number): void {
    if (streak < 2 || !this.comboText.active) return;
    this.comboText.setText(`COMBO x${streak}!`).setVisible(true).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.comboText);
    this.tweens.add({
      targets: this.comboText,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 160,
      ease: 'Back.easeOut',
      yoyo: true,
      onComplete: () => {
        if (this.comboText.active) this.comboText.setVisible(false);
      },
    });
  }

  private finish(): void {
    this.busy = true;
    const won = this.match.winner === 0;
    const draw = this.match.winner === null;
    audio.play(won ? 'victory' : 'defeat');
    if (won && this.match.players[0].board.flat().every((cell) => cell === null)) {
      audio.play('perfect_clear');
    }
    this.time.delayedCall(700, () => {
      this.scene.start('Result', {
        won,
        draw,
        playerScore: this.match.players[0].score,
        botScore: this.match.players[1].score,
        difficulty: this.difficulty,
      });
    });
  }
}
