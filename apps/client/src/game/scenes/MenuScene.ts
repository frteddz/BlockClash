import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import { attachClickArea, makeButton, makePanel } from '../ui/button';
import { onCanvasPointer } from '../ui/input';
import { COLOR, CSS, FONT, uiPx } from '../theme';

export class MenuScene extends Phaser.Scene {
  private musicIcon?: Phaser.GameObjects.Image;

  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);
    this.addDecorations(width, height);

    const titleSize = Math.max(uiPx(40), Math.min(uiPx(86), width * 0.14));
    this.add
      .text(width / 2, height * 0.2, 'BLOCKCLASH', {
        fontFamily: FONT.display,
        fontSize: `${titleSize}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.2 + titleSize * 0.62, 'CHILL BLOCKS. MEAN RIVALS.', {
        fontFamily: FONT.ui,
        fontSize: `${Math.max(uiPx(13), Math.min(uiPx(20), width * 0.032))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(uiPx(340), width * 0.8);
    const buttonHeight = Math.max(uiPx(52), Math.min(uiPx(68), height * 0.085));
    const fontSize = Math.max(uiPx(19), Math.min(uiPx(28), width * 0.05));
    let y = height * 0.42;
    const step = buttonHeight + 14;

    makeButton(this, width / 2, y, 'PLAY VS BOT', () => this.scene.start('Difficulty'), {
      width: buttonWidth,
      height: buttonHeight,
      fontSize,
    });
    y += step;
    makeButton(this, width / 2, y, 'SETTINGS', () => this.scene.start('Settings'), {
      width: buttonWidth,
      height: buttonHeight,
      fontSize,
      fill: COLOR.green,
    });
    y += step;
    makeButton(this, width / 2, y, 'PLAY ONLINE', () => undefined, {
      width: buttonWidth,
      height: buttonHeight,
      fontSize,
      enabled: false,
    });
    y += step;
    makeButton(this, width / 2, y, 'OFFLINE DUEL', () => this.scene.start('LanLobby'), {
      width: buttonWidth,
      height: buttonHeight,
      fontSize,
      fill: COLOR.gold,
    });

    const iconX = width - uiPx(42);
    const iconY = uiPx(42);
    const iconSize = uiPx(66);
    makePanel(this, iconX, iconY, iconSize, iconSize * 0.88, COLOR.panel);
    this.musicIcon = this.add
      .image(iconX, iconY, audio.isMusicOn() ? 'audioOn' : 'audioOff')
      .setScale((iconSize * 0.32) / 64)
      .setTint(COLOR.ink);
    attachClickArea(
      this,
      () => ({ x: iconX - iconSize / 2, y: iconY - iconSize / 2, w: iconSize, h: iconSize }),
      () => {
        const on = audio.toggleMusic();
        this.musicIcon?.setTexture(on ? 'audioOn' : 'audioOff');
      },
    );

    this.add
      .text(width / 2, height - 26, 'ONLINE MODES ARRIVE IN A LATER UPDATE', {
        fontFamily: FONT.ui,
        fontSize: `${Math.max(uiPx(11), Math.min(uiPx(15), width * 0.025))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);

    // Browsers only allow audio after a real tap or click.
    let started = false;
    onCanvasPointer(this, 'down', () => {
      if (started) return;
      started = true;
      if (audio.isMusicOn()) audio.startMusic();
    });
  }

  private addDecorations(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLOR.gold, 0.18);
    graphics.fillCircle(width * 0.1, height * 0.12, Math.min(uiPx(90), width * 0.16));
    graphics.fillStyle(COLOR.accent, 0.14);
    graphics.fillCircle(width * 0.9, height * 0.82, Math.min(uiPx(120), width * 0.2));
    graphics.fillStyle(COLOR.green, 0.12);
    graphics.fillCircle(width * 0.06, height * 0.88, Math.min(uiPx(70), width * 0.12));
  }
}
