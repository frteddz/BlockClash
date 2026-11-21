import Phaser from 'phaser';
import './styles.css';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { DifficultyScene } from './game/scenes/DifficultyScene';
import { SettingsScene } from './game/scenes/SettingsScene';
import { MatchScene } from './game/scenes/MatchScene';
import { ResultScene } from './game/scenes/ResultScene';

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f7ead6',
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MenuScene, DifficultyScene, SettingsScene, MatchScene, ResultScene],
});

// Dev-only console hook for poking at scenes while testing. Stripped from builds.
if (import.meta.env.DEV) {
  (window as Window & { __blockclash?: Phaser.Game }).__blockclash = game;
}
