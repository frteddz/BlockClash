import Phaser from 'phaser';
import './styles.css';

/** Temporary Phase 0 hello-world scene; replaced by the real scenes in Phase 2. */
class HelloScene extends Phaser.Scene {
  constructor() {
    super('Hello');
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, 'BLOCKCLASH\nhello world', {
        fontFamily: 'sans-serif',
        fontSize: '48px',
        color: '#443355',
        align: 'center',
      })
      .setOrigin(0.5);
  }
}

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#f6e9d2',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  scene: [HelloScene],
});
