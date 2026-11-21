import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import type { SfxEvent } from '../audio/sfx-map';
import { COLOR, CSS, FONT, RADIUS } from '../theme';

export interface ButtonOptions {
  width?: number;
  height?: number;
  fontSize?: number;
  fill?: number;
  textColor?: string;
  enabled?: boolean;
  sound?: SfxEvent;
}

export function makeButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  options: ButtonOptions = {},
): Phaser.GameObjects.Container {
  const width = options.width ?? 240;
  const height = options.height ?? 64;
  const fill = options.fill ?? COLOR.accent;
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
      fontSize: `${options.fontSize ?? 26}px`,
      color: options.textColor ?? CSS.light,
    })
    .setOrigin(0.5);

  container.add([shadow, face, text]);
  container.setSize(width, height);
  container.setInteractive(
    new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
    Phaser.Geom.Rectangle.Contains,
  );

  if (options.enabled === false) {
    container.setAlpha(0.45);
    container.disableInteractive();
  } else {
    container.on('pointerover', () => container.setScale(1.03));
    container.on('pointerout', () => container.setScale(1));
    container.on('pointerdown', () => {
      audio.play(options.sound ?? 'ui_click');
      onClick();
    });
  }

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
