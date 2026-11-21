import Phaser from 'phaser';
import './styles.css';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { DifficultyScene } from './game/scenes/DifficultyScene';
import { SettingsScene } from './game/scenes/SettingsScene';
import { MatchScene } from './game/scenes/MatchScene';
import { ResultScene } from './game/scenes/ResultScene';

// Phaser 3 has no built-in device pixel ratio support. We make the game buffer
// DPR times larger and zoom the canvas back down to CSS pixels. That keeps text
// and blocks sharp on phones without changing any game coordinates.
const pixelRatio = (): number => Math.min(window.devicePixelRatio || 1, 2);

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f7ead6',
  render: {
    antialias: true,
    pixelArt: false,
  },
  scale: {
    mode: Phaser.Scale.NONE,
    width: Math.round(window.innerWidth * pixelRatio()),
    height: Math.round(window.innerHeight * pixelRatio()),
    zoom: 1 / pixelRatio(),
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: {
    activePointers: 2,
  },
  scene: [BootScene, MenuScene, DifficultyScene, SettingsScene, MatchScene, ResultScene],
});

function resizeGame(): void {
  const ratio = pixelRatio();
  game.scale.resize(Math.round(window.innerWidth * ratio), Math.round(window.innerHeight * ratio));
  game.scale.setZoom(1 / ratio);
  // Menus are laid out once when created, so rebuild them for the new size.
  // MatchScene reflows itself and keeps the match state.
  for (const scene of game.scene.getScenes(true)) {
    if (scene.scene.key === 'Match' || scene.scene.key === 'Boot') continue;
    const key = scene.scene.key;
    game.scene.stop(key);
    game.scene.start(key);
  }
}

window.addEventListener('resize', resizeGame);
window.addEventListener('orientationchange', resizeGame);

// Dev-only console hook for poking at scenes while testing. Stripped from builds.
if (import.meta.env.DEV) {
  (window as Window & { __blockclash?: Phaser.Game }).__blockclash = game;
}
