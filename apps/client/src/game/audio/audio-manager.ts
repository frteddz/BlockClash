import Phaser from 'phaser';
import { loadSettings, saveSettings, type Settings } from '../settings';
import { MUSIC, SFX_FILES, sfxKey, sfxVolume, type SfxEvent } from './sfx-map';

/** One instance shared by every scene. BootScene attaches the sound manager. */
class AudioManager {
  private sound?: Phaser.Sound.BaseSoundManager;
  private settings: Settings = loadSettings();
  private music?: Phaser.Sound.BaseSound;

  attach(scene: Phaser.Scene): void {
    this.sound = scene.sound;
  }

  getSettings(): Settings {
    return this.settings;
  }

  private write(patch: Partial<Settings>): void {
    this.settings = { ...this.settings, ...patch };
    saveSettings(this.settings);
  }

  play(event: SfxEvent, options: { rate?: number; volume?: number } = {}): void {
    if (this.settings.sfxVolume <= 0 || this.sound === undefined) return;
    this.sound.play(sfxKey(SFX_FILES[event]), {
      volume: this.settings.sfxVolume * sfxVolume(event) * (options.volume ?? 1),
      rate: options.rate ?? 1,
    });
  }

  startMusic(): void {
    if (!this.settings.music || this.sound === undefined) return;
    if (this.music === undefined) {
      this.music = this.sound.add(MUSIC.key, { loop: true, volume: this.settings.musicVolume });
    }
    if (!this.music.isPlaying) this.music.play();
  }

  stopMusic(): void {
    this.music?.stop();
  }

  toggleMusic(): boolean {
    const enabled = !this.settings.music;
    this.write({ music: enabled });
    if (enabled) this.startMusic();
    else this.stopMusic();
    return enabled;
  }

  isMusicOn(): boolean {
    return this.settings.music;
  }

  setSfxVolume(value: number): void {
    this.write({ sfxVolume: value });
  }

  setMusicVolume(value: number): void {
    this.write({ musicVolume: value });
    if (this.music !== undefined) (this.music as Phaser.Sound.WebAudioSound).setVolume(value);
  }

  setReduceMotion(value: boolean): void {
    this.write({ reduceMotion: value });
  }
}

export const audio = new AudioManager();
