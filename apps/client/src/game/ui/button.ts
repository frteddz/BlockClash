import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import type { SfxEvent } from '../audio/sfx-map';
import { COLOR, CSS, FONT, RADIUS, uiPx } from '../theme';
import { onCanvasPointer, type Rect } from './input';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  enabled?: boolean;
  sound?: SfxEvent;
}

/** Native pointer hit testing for anything drawn on the canvas. */
export function attachClickArea(
  scene: Phaser.Scene,
  getRect: () => Rect,
  onClick: () => void,
  sound: SfxEvent = 'ui_click',
): void {
  let hovering = false;
  onCanvasPointer(scene, 'down', (point) => {
    const rect = getRect();
    if (
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h
    ) {
      audio.play(sound);
      onClick();
    }
  });
  onCanvasPointer(scene, 'move', (point) => {
    const rect = getRect();
    const over =
      point.x >= rect.x &&
      point.x <= rect.x + rect.w &&
      point.y >= rect.y &&
      point.y <= rect.y + rect.h;
    if (over !== hovering) {
      hovering = over;
      if (over) scene.game.canvas.style.cursor = 'pointer';
      else scene.game.canvas.style.cursor = '';
    }
  });
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const width = options.width ?? uiPx(240);
  const height = options.height ?? uiPx(64);
  const fill = options.fill ?? COLOR.accent;
  const enabled = options.enabled !== false;
  const container = scene.add.container(x, y);

  const shadow = scene.add.graphics();
  shadow.fillStyle(COLOR.shadow, 1);
  shadow.fillRoundedRect(-width / 2 + 3, -height / 2 + 5, width, height, RADIUS);

  const face = scene.add.graphics();
  face.fillStyle(fill, 1);
  face.fillRoundedRect(-width / 2, -height / 2, width, height, RADIUS);
  face.lineStyle(2, COLOR.panelBorder, 1);
  face.strokeRoundedRect(-width / 2, -height / 2, width, height, RADIUS);

  const text = scene.add
    .text(0, 0, label, {
      fontFamily: FONT.display,
      fontSize: `${options.fontSize ?? uiPx(26)}px`,
      color: options.textColor ?? CSS.light,
    })
    .setOrigin(0.5);

  container.add([shadow, face, text]);

  if (!enabled) {
    container.setAlpha(0.45);
    return container;
  }

  attachClickArea(
    scene,
    () => ({ x: container.x - width / 2, y: container.y - height / 2, w: width, h: height }),
    () => {
      container.setScale(0.97);
      scene.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
      onClick();
    },
    options.sound ?? 'ui_click',
  );

  return container;
}

export function makePanel(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  fill = COLOR.panel,
): Phaser.GameObjects.Graphics {
  const panel = scene.add.graphics();
  panel.fillStyle(COLOR.shadow, 1);
  panel.fillRoundedRect(x - width / 2 + 4, y - height / 2 + 6, width, height, RADIUS);
  panel.fillStyle(fill, 1);
  panel.fillRoundedRect(x - width / 2, y - height / 2, width, height, RADIUS);
  panel.lineStyle(2, COLOR.panelBorder, 1);
  panel.strokeRoundedRect(x - width / 2, y - height / 2, width, height, RADIUS);
  return panel;
}
