import Phaser from 'phaser';
import type { Difficulty } from '@blockclash/shared';
import { makeButton, makePanel } from '../ui/button';
import { COLOR, CSS, FONT, uiPx } from '../theme';

const OPTIONS: Array<{ label: string; value: Difficulty; fill: number; hint: string }> = [
  { label: 'EASY', value: 'easy', fill: COLOR.green, hint: 'Walks into things. Mostly.' },
  { label: 'MEDIUM', value: 'medium', fill: COLOR.gold, hint: 'Actually looks at the board.' },
  { label: 'HARD', value: 'hard', fill: COLOR.accent, hint: 'Plans three moves ahead.' },
];

export class DifficultyScene extends Phaser.Scene {
  constructor() {
    super('Difficulty');
  }

  create(): void {
    const { width, height } = this.scale;
    this.cameras.main.setBackgroundColor(COLOR.background);

    this.add
      .text(width / 2, height * 0.16, 'PICK YOUR RIVAL', {
        fontFamily: FONT.display,
        fontSize: `${Math.max(uiPx(30), Math.min(uiPx(56), width * 0.09))}px`,
        color: CSS.ink,
      })
      .setOrigin(0.5);

    const buttonWidth = Math.min(uiPx(320), width * 0.78);
    const buttonHeight = Math.max(uiPx(56), Math.min(uiPx(72), height * 0.09));
    let y = height * 0.36;
    for (const option of OPTIONS) {
      makeButton(this, width / 2, y, option.label, () => this.startMatch(option.value), {
        width: buttonWidth,
        height: buttonHeight,
        fontSize: Math.max(uiPx(21), Math.min(uiPx(30), width * 0.052)),
        fill: option.fill,
      });
      this.add
        .text(width / 2, y + buttonHeight * 0.72, option.hint, {
          fontFamily: FONT.ui,
          fontSize: `${Math.max(uiPx(11), Math.min(uiPx(15), width * 0.026))}px`,
          color: CSS.soft,
        })
        .setOrigin(0.5);
      y += buttonHeight + 32;
    }

    makePanel(this, 62, 42, 100, 52);
    makeButton(this, 62, 42, 'BACK', () => this.scene.start('Menu'), {
      width: 96,
      height: 48,
      fontSize: 17,
      fill: COLOR.ink,
      sound: 'ui_back',
    });
  }

  private startMatch(difficulty: Difficulty): void {
    this.scene.start('Match', { difficulty });
  }
}
