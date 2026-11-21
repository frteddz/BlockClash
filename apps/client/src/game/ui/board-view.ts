import Phaser from 'phaser';
import { blockKey, getBlockKeyAt, type Board, type Piece, type Point } from '@blockclash/shared';
import { BLOCKS_TEXTURE, frameFor } from '../textures/atlas';
import { COLOR } from '../theme';

const TEXTURE_SIZE = 128;

export class BoardView {
  readonly originX: number;
  readonly originY: number;
  readonly cellSize: number;
  readonly columns: number;
  readonly rows: number;

  private readonly scene: Phaser.Scene;
  private readonly baseScale: number;
  private readonly cells: Phaser.GameObjects.Image[][];
  private readonly ghostCells: Phaser.GameObjects.Image[];
  private readonly objects: Phaser.GameObjects.GameObject[] = [];

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    cellSize: number,
    columns: number,
    rows: number,
  ) {
    this.scene = scene;
    this.originX = x;
    this.originY = y;
    this.cellSize = cellSize;
    this.columns = columns;
    this.rows = rows;
    this.baseScale = cellSize / TEXTURE_SIZE;

    const frame = scene.add.graphics();
    frame.fillStyle(COLOR.shadow, 1);
    frame.fillRoundedRect(x - 8, y - 8, columns * cellSize + 16, rows * cellSize + 16, 12);
    frame.fillStyle(COLOR.boardSlot, 1);
    frame.fillRoundedRect(x - 5, y - 5, columns * cellSize + 10, rows * cellSize + 10, 10);
    frame.lineStyle(1, COLOR.shadow, 0.9);
    for (let col = 0; col <= columns; col += 1) {
      frame.lineBetween(x + col * cellSize, y, x + col * cellSize, y + rows * cellSize);
    }
    for (let row = 0; row <= rows; row += 1) {
      frame.lineBetween(x, y + row * cellSize, x + columns * cellSize, y + row * cellSize);
    }
    this.objects.push(frame);

    this.cells = [];
    for (let row = 0; row < rows; row += 1) {
      const line: Phaser.GameObjects.Image[] = [];
      for (let col = 0; col < columns; col += 1) {
        const image = scene.add
          .image(this.cellCenterX(col), this.cellCenterY(row), BLOCKS_TEXTURE)
          .setScale(this.baseScale)
          .setVisible(false);
        line.push(image);
        this.objects.push(image);
      }
      this.cells.push(line);
    }

    this.ghostCells = [];
    for (let i = 0; i < 16; i += 1) {
      const ghost = scene.add
        .image(0, 0, BLOCKS_TEXTURE)
        .setScale(this.baseScale)
        .setAlpha(0.4)
        .setVisible(false)
        .setDepth(20);
      this.ghostCells.push(ghost);
      this.objects.push(ghost);
    }
  }

  destroy(): void {
    for (const object of this.objects) object.destroy();
    this.objects.length = 0;
  }

  cellCenterX(x: number): number {
    return this.originX + (x + 0.5) * this.cellSize;
  }

  cellCenterY(y: number): number {
    return this.originY + (y + 0.5) * this.cellSize;
  }

  worldToCell(worldX: number, worldY: number): Point {
    return {
      x: Math.floor((worldX - this.originX) / this.cellSize),
      y: Math.floor((worldY - this.originY) / this.cellSize),
    };
  }

  setBoard(board: Board): void {
    for (let y = 0; y < this.rows; y += 1) {
      for (let x = 0; x < this.columns; x += 1) {
        const key = getBlockKeyAt(board, x, y);
        const image = this.cells[y]![x]!;
        if (key === null) image.setVisible(false);
        else image.setVisible(true).setFrame(frameFor(key)).clearTint().setAlpha(1);
      }
    }
  }

  setGhost(piece: Piece | null, anchorX: number, anchorY: number, valid: boolean): void {
    let used = 0;
    if (piece !== null) {
      const offsets = piece.shape.cells;
      const has = (dx: number, dy: number): boolean =>
        offsets.some(([cx, cy]) => cx === dx && cy === dy);
      offsets.forEach(([dx, dy]) => {
        const x = anchorX + dx;
        const y = anchorY + dy;
        if (x < 0 || y < 0 || x >= this.columns || y >= this.rows) return;
        const image = this.ghostCells[used];
        if (image === undefined) return;
        used += 1;
        image
          .setFrame(
            frameFor(
              blockKey(
                piece.color,
                has(dx, dy - 1),
                has(dx + 1, dy),
                has(dx, dy + 1),
                has(dx - 1, dy),
              ),
            ),
          )
          .setPosition(this.cellCenterX(x), this.cellCenterY(y))
          .setScale(this.baseScale)
          .setAlpha(0.4)
          .setTint(valid ? 0xffffff : 0xff7b7b)
          .setVisible(true);
      });
    }
    for (let i = used; i < this.ghostCells.length; i += 1) this.ghostCells[i]!.setVisible(false);
  }

  clearGhost(): void {
    this.setGhost(null, 0, 0, false);
  }

  popCells(points: Point[], reduceMotion: boolean): void {
    if (reduceMotion) return;
    for (const point of points) {
      const image = this.cells[point.y]?.[point.x];
      if (image === undefined || !image.visible) continue;
      image.setScale(this.baseScale * 1.28);
      this.scene.tweens.add({
        targets: image,
        scaleX: this.baseScale,
        scaleY: this.baseScale,
        duration: 190,
        ease: 'Back.easeOut',
      });
    }
  }

  sparkle(points: Point[], tint: number, reduceMotion: boolean): void {
    if (reduceMotion) return;
    for (const point of points) {
      const spark = this.scene.add
        .image(
          this.cellCenterX(point.x),
          this.cellCenterY(point.y),
          BLOCKS_TEXTURE,
          frameFor('fx_sparkle'),
        )
        .setScale(this.baseScale * 0.5)
        .setTint(tint)
        .setDepth(30);
      this.scene.tweens.add({
        targets: spark,
        scaleX: this.baseScale * 1.3,
        scaleY: this.baseScale * 1.3,
        alpha: 0,
        duration: 300,
        ease: 'Quad.easeOut',
        onComplete: () => spark.destroy(),
      });
    }
  }
}
