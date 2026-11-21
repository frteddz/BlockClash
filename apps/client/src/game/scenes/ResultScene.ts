import Phaser from 'phaser';
import type { Difficulty } from '@blockclash/shared';
import { makeButton, makePanel } from '../ui/button';
import { COLOR, CSS, FONT, uiPx } from '../theme';

interface ResultData {
  won: boolean;
  draw: boolean;
  playerScore: number;
  botScore: number;
  difficulty: Difficulty;
}

export class ResultScene extends Phaser.Scene {
  private result: ResultData = {
    won: false,
    draw: false,
    playerScore: 0,
    botScore: 0,
    difficulty: 'medium',
  };

  constructor() {
    super('Result');
  }

  init(data: ResultData): void {
    this.result = data;
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);
    makePanel(
      this,
      width / 2,
      height / 2,
      Math.min(uiPx(520), width * 0.92),
      Math.min(uiPx(500), height * 0.84),
    );

    const title = this.result.draw ? 'DRAW!' : this.result.won ? 'VICTORY!' : 'DEFEAT';
    const titleColor = this.result.won ? CSS.accent : this.result.draw ? CSS.soft : '#4b3a57';
    this.add
      .text(width / 2, height * 0.26, title, {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(38), Math.min(uiPx(72), width * 0.12))}px`,
        color: titleColor,
        stroke: CSS.light,
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height * 0.43, `YOU  ${this.result.playerScore}`, {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(24), Math.min(uiPx(38), width * 0.07))}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.52, `BOT  ${this.result.botScore}`, {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(24), Math.min(uiPx(38), width * 0.07))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);
    this.add
      .text(width / 2, height * 0.6, `DIFFICULTY: ${this.result.difficulty.toUpperCase()}`, {
        fontFamily: FONT.ui,
        fontSize: `${Math.max(uiPx(12), Math.min(uiPx(16), width * 0.028))}px`,
        color: CSS.soft,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(uiPx(300), width * 0.75);
    makeButton(
      this,
      width / 2,
      height * 0.69,
      'PLAY AGAIN',
      () => {
        this.scene.start('Match', { difficulty: this.result.difficulty });
      },
      { width: buttonWidth, height: 60, fontSize: 24, fill: COLOR.green },
    );
    makeButton(this, width / 2, height * 0.8, 'MAIN MENU', () => this.scene.start('Menu'), {
      width: buttonWidth,
      height: 58,
      fontSize: 22,
      fill: COLOR.ink,
      sound: 'ui_back',
    });
  }
}
