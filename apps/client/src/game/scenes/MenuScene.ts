import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import { makeButton, makePanel } from '../ui/button';
import { COLOR, CSS, FONT } from '../theme';

export class MenuScene extends Phaser.Scene {
  private musicIcon?: Phaser.GameObjects.Image;

  constructor() {
    super('Menu');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);
    this.addDecorations(width, height);

    const titleSize = Math.max(40, Math.min(86, width * 0.14));
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
        fontSize: `${Math.max(13, Math.min(20, width * 0.032))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(340, width * 0.8);
    const buttonHeight = Math.max(52, Math.min(68, height * 0.085));
    const fontSize = Math.max(19, Math.min(28, width * 0.05));
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
    makeButton(this, width / 2, y, 'OFFLINE DUEL', () => undefined, {
      width: buttonWidth,
      height: buttonHeight,
      fontSize,
      enabled: false,
    });

    makePanel(this, width - 42, 42, 66, 58, COLOR.panel);
    this.musicIcon = this.add
      .image(width - 42, 42, audio.isMusicOn() ? 'audioOn' : 'audioOff')
      .setScale(0.32)
      .setTint(COLOR.ink)
      .setInteractive({ useHandCursor: true });
    this.musicIcon.on('pointerdown', () => {
      const on = audio.toggleMusic();
      this.musicIcon?.setTexture(on ? 'audioOn' : 'audioOff');
      audio.play('ui_click');
    });

    this.add
      .text(width / 2, height - 26, 'ONLINE MODES ARRIVE IN A LATER UPDATE', {
        fontFamily: FONT.ui,
        fontSize: `${Math.max(11, Math.min(15, width * 0.025))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);

    // Browsers only allow audio after a real tap or click.
    this.input.once('pointerdown', () => {
      if (audio.isMusicOn()) audio.startMusic();
    });
  }

  private addDecorations(width: number, height: number): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(COLOR.gold, 0.18);
    graphics.fillCircle(width * 0.1, height * 0.12, Math.min(90, width * 0.16));
    graphics.fillStyle(COLOR.accent, 0.14);
    graphics.fillCircle(width * 0.9, height * 0.82, Math.min(120, width * 0.2));
    graphics.fillStyle(COLOR.green, 0.12);
    graphics.fillCircle(width * 0.06, height * 0.88, Math.min(70, width * 0.12));
  }
}
