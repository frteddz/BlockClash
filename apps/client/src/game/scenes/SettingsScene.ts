import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import { makeButton, makePanel } from '../ui/button';
import { COLOR, CSS, FONT, uiPx } from '../theme';

export class SettingsScene extends Phaser.Scene {
  private musicLabel?: Phaser.GameObjects.Text;
  private motionLabel?: Phaser.GameObjects.Text;
  private sfxLabel?: Phaser.GameObjects.Text;
  private musicVolumeLabel?: Phaser.GameObjects.Text;

  constructor() {
    super('Settings');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);
    makePanel(
      this,
      width / 2,
      height / 2,
      Math.min(uiPx(520), width * 0.92),
      Math.min(uiPx(520), height * 0.86),
    );

    this.add
      .text(width / 2, height * 0.19, 'SETTINGS', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(30), Math.min(uiPx(50), width * 0.08))}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);

    const small = { width: uiPx(150), height: uiPx(50), fontSize: uiPx(18) };
    let y = height * 0.32;
    const gap = Math.min(uiPx(76), height * 0.12);

    this.musicLabel = this.add
      .text(width / 2, y, `MUSIC: ${audio.isMusicOn() ? 'ON' : 'OFF'}`, {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(22)}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    y += gap * 0.55;
    makeButton(
      this,
      width / 2,
      y,
      'TOGGLE',
      () => {
        audio.toggleMusic();
        this.musicLabel?.setText(`MUSIC: ${audio.isMusicOn() ? 'ON' : 'OFF'}`);
      },
      { ...small, fill: COLOR.green },
    );

    y += gap;
    this.musicVolumeLabel = this.add
      .text(width / 2, y, `MUSIC VOLUME: ${Math.round(audio.getSettings().musicVolume * 100)}%`, {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(20)}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    y += gap * 0.55;
    this.volumeRow(y, (delta) => {
      audio.setMusicVolume(audio.getSettings().musicVolume + delta);
      this.musicVolumeLabel?.setText(
        `MUSIC VOLUME: ${Math.round(audio.getSettings().musicVolume * 100)}%`,
      );
    });

    y += gap * 1.4;
    this.sfxLabel = this.add
      .text(width / 2, y, `SFX VOLUME: ${Math.round(audio.getSettings().sfxVolume * 100)}%`, {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(20)}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    y += gap * 0.55;
    this.volumeRow(y, (delta) => {
      audio.setSfxVolume(audio.getSettings().sfxVolume + delta);
      if (delta > 0) audio.play('ui_click');
      this.sfxLabel?.setText(`SFX VOLUME: ${Math.round(audio.getSettings().sfxVolume * 100)}%`);
    });

    y += gap * 1.4;
    this.motionLabel = this.add
      .text(width / 2, y, `REDUCE MOTION: ${audio.getSettings().reduceMotion ? 'ON' : 'OFF'}`, {
        fontFamily: FONT.ui,
        fontSize: `${uiPx(20)}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    y += gap * 0.6;
    makeButton(
      this,
      width / 2,
      y,
      'TOGGLE',
      () => {
        const next = !audio.getSettings().reduceMotion;
        audio.setReduceMotion(next);
        this.motionLabel?.setText(`REDUCE MOTION: ${next ? 'ON' : 'OFF'}`);
      },
      { ...small, fill: COLOR.gold },
    );

    makeButton(this, 62, 42, 'BACK', () => this.scene.start('Menu'), {
      width: uiPx(96),
      height: uiPx(48),
      fontSize: uiPx(17),
      fill: COLOR.ink,
      sound: 'ui_back',
    });
  }

  private volumeRow(y: number, change: (delta: number) => void): void {
    makeButton(this, this.scale.width / 2 - 95, y, '-', () => change(-0.1), {
      width: uiPx(60),
      height: uiPx(46),
      fontSize: uiPx(24),
      fill: COLOR.ink,
    });
    makeButton(this, this.scale.width / 2 + 95, y, '+', () => change(0.1), {
      width: uiPx(60),
      height: uiPx(46),
      fontSize: uiPx(24),
      fill: COLOR.ink,
    });
  }
}
