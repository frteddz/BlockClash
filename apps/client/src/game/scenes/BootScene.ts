import Phaser from 'phaser';
import { audio } from '../audio/audio-manager';
import { MUSIC, SFX_FILES, sfxKey } from '../audio/sfx-map';
import { BLOCKS_TEXTURE, setAtlasFrames } from '../textures/atlas';
import { COLOR, CSS, FONT } from '../theme';

export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);
    this.add
      .text(width / 2, height / 2, 'LOADING...', {
        fontFamily: FONT.display,
        fontSize: '36px',
        color: CSS.ink,
      })
      .setOrigin(0.5);

    this.load.font(FONT.display, 'assets/fonts/TitanOne-Regular.ttf');
    this.load.font(FONT.ui, 'assets/fonts/Nunito-Regular.ttf');
    this.load.spritesheet(BLOCKS_TEXTURE, 'assets/textures/blocks-atlas.png', {
      frameWidth: 128,
      frameHeight: 128,
    });
    this.load.json('blocks-atlas', 'assets/textures/blocks-atlas.json');
    for (const file of Object.values(SFX_FILES)) {
      this.load.audio(sfxKey(file), `assets/sfx/${file}`);
    }
    this.load.audio(MUSIC.key, `assets/music/${MUSIC.file}`);
    this.load.image('audioOn', 'assets/ui/audioOn.png');
    this.load.image('audioOff', 'assets/ui/audioOff.png');
  }

  create(): void {
    const atlas = this.cache.json.get('blocks-atlas') as { frames: Record<string, number> };
    setAtlasFrames(atlas);
    audio.attach(this);
    this.scene.start('Menu');
  }
}
