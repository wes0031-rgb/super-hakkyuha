import { W, H } from '../config.js';
import { PLAYABLE } from '../data/characters.js';
import { makeGradient } from '../level/textures.js';

import { setupCamera } from '../hidpi.js';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    setupCamera(this);
    makeGradient(this, 'sky_title', W, H, '#ffd9e8', '#eafbe9');
    this.add.image(0, 0, 'sky_title').setOrigin(0, 0).setDepth(-20);

    this.add.image(140, 130, 'bg_cloud').setScale(1.1);
    this.add.image(1070, 96, 'bg_cloud').setScale(0.9);
    this.add.image(560, 80, 'bg_cloud').setScale(0.6);

    const hill = this.add.graphics();
    hill.fillStyle(0xbfe8c0, 1);
    hill.fillRoundedRect(-80, 560, W + 160, 300, 120);
    hill.lineStyle(5, 0x7b5a48, 1);
    hill.strokeRoundedRect(-80, 560, W + 160, 300, 120);

    this.add.text(W / 2, 92, '슈퍼', {
      fontFamily: FONT, fontSize: '58px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 12,
    }).setOrigin(0.5);
    this.add.text(W / 2, 182, '하뀨하', {
      fontFamily: FONT, fontSize: '116px', fontStyle: '900', color: '#ffd977',
      stroke: '#7b5a48', strokeThickness: 16,
    }).setOrigin(0.5);
    this.add.text(W / 2, 256, 'SUPER HAKKYUHA', {
      fontFamily: FONT, fontSize: '21px', fontStyle: '700', color: '#7b5a48',
    }).setOrigin(0.5).setLetterSpacing(10);
    this.add.text(W / 2, 306, '쭈일리언을 구하러 가자!', {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: '#ffffff',
      stroke: '#e2577f', strokeThickness: 8,
    }).setOrigin(0.5);

    const cast = PLAYABLE;
    cast.forEach((c, i) => {
      const x = W / 2 + (i - (cast.length - 1) / 2) * 148;
      const s = this.add.image(x, 592, `base-${c.id}`).setOrigin(0.5, 1).setScale(0.3);
      this.tweens.add({
        targets: s, y: 584, duration: 900 + i * 60, yoyo: true,
        repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    const btn = this.add.container(W / 2, 648);
    const r = this.add.rectangle(0, 0, 300, 72, 0xffd977)
      .setStrokeStyle(5, 0x7b5a48).setInteractive({ useHandCursor: true });
    const t = this.add.text(0, 0, '▶ 시작하기', {
      fontFamily: FONT, fontSize: '30px', fontStyle: '900', color: '#6b4a3a',
    }).setOrigin(0.5);
    btn.add([r, t]);
    r.on('pointerover', () => r.setFillStyle(0xffe7a4));
    r.on('pointerout', () => r.setFillStyle(0xffd977));
    r.on('pointerup', () => this.scene.start('Stage'));

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Stage'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Stage'));

    this.add.text(W / 2, H - 16, 'ⓒ 팬메이드 · 비매품', {
      fontFamily: FONT, fontSize: '13px', color: '#8a6a56',
    }).setOrigin(0.5, 1).setAlpha(0.8);
  }
}
