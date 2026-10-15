import { W, H } from '../config.js?v=1792031867';
import { CHARACTERS } from '../data/characters.js?v=1792031867';
import { makeGradient } from '../level/textures.js?v=1792031867';

import { setupCamera } from '../hidpi.js?v=1792031867';
import { unlock, sfx } from '../audio.js?v=1792031867';
import { button } from '../ui.js?v=1792031867';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });
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

    // 아홉이 같이 선다. 팔라벨라가 맨 끝에 오게 쭈일리언과 자리를 바꾼다
    const cast = CHARACTERS.slice();
    const a = cast.findIndex((c) => c.id === 'palabella');
    const b = cast.findIndex((c) => c.id === 'zzulien');
    if (a >= 0 && b >= 0) [cast[a], cast[b]] = [cast[b], cast[a]];
    cast.forEach((c, i) => {
      const x = W / 2 + (i - (cast.length - 1) / 2) * 134;
      const s = this.add.image(x, 592, `base-${c.id}`).setOrigin(0.5, 1).setScale(0.27);
      this.tweens.add({
        targets: s, y: 584, duration: 900 + i * 60, yoyo: true,
        repeat: -1, ease: 'Sine.easeInOut',
      });
    });

    button(this, W / 2, 648, 300, 72, '▶ 시작하기', () => this.scene.start('Stage'), { size: '30px' });

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Stage'));
    this.input.keyboard.once('keydown-ENTER', () => this.scene.start('Stage'));

    this.add.text(W / 2, H - 16, 'ⓒ 팬메이드 · 비매품', {
      fontFamily: FONT, fontSize: '13px', color: '#8a6a56',
    }).setOrigin(0.5, 1).setAlpha(0.8);
  }
}
