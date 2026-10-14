import { W, H } from '../config.js';
import { byId } from '../data/characters.js';
import { byStage, STAGES } from '../data/stages.js';
import { makeGradient } from '../level/textures.js';
import { clearStage } from '../save.js';

import { setupCamera } from '../hidpi.js';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(d) { this.d = d; }

  create() {
    setupCamera(this);
    const { cleared, score, tokens, heroId, stageId } = this.d;
    const char = byId(heroId);
    const stage = byStage(stageId);
    const news = cleared ? clearStage(stageId, heroId, score) : [];

    const key = cleared ? 'sky_win' : 'sky_lose';
    makeGradient(this, key, W, H, cleared ? '#ffd9e8' : '#6b6080', cleared ? '#eafbe9' : '#cfc7dd');
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20);
    this.add.image(160, 110, 'bg_cloud').setScale(1.0).setAlpha(cleared ? 1 : 0.5);
    this.add.image(1080, 90, 'bg_cloud').setScale(0.85).setAlpha(cleared ? 1 : 0.5);

    this.add.text(W / 2, 86, cleared ? `${stage.name} 클리어!` : '다시 가 볼까요', {
      fontFamily: FONT, fontSize: '56px', fontStyle: '900', color: '#ffffff',
      stroke: cleared ? '#7b5a48' : '#4c4160', strokeThickness: 12,
    }).setOrigin(0.5);

    this.add.image(W / 2, 320, `base-${heroId}`).setOrigin(0.5, 1).setScale(0.3);

    this.add.rectangle(W / 2, 400, 560, 118, 0xffffff, 0.92).setStrokeStyle(5, 0x7b5a48);
    this.add.text(W / 2 - 240, 362, '점수', {
      fontFamily: FONT, fontSize: '17px', color: '#9a7b68',
    });
    this.add.text(W / 2 - 240, 382, String(score).padStart(6, '0'), {
      fontFamily: FONT, fontSize: '38px', fontStyle: '900', color: '#6b4a3a',
    });
    this.add.image(W / 2 + 90, 398, `tok-${char.token}`).setScale(0.16);
    this.add.text(W / 2 + 120, 376, `${tokens}개`, {
      fontFamily: FONT, fontSize: '32px', fontStyle: '900', color: '#6b4a3a',
    });

    // 새로 들어온 펫
    if (news.length) {
      const y = 492;
      this.add.rectangle(W / 2, y, 620, 96, 0xfff3d4).setStrokeStyle(5, 0xffb340);
      this.add.text(W / 2 - 280, y - 30, '펫이 늘었어요', {
        fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#b07a20',
      });
      news.forEach((id, i) => {
        const x = W / 2 - 240 + i * 120;
        const s = this.add.image(x, y + 28, `base-${id}`).setOrigin(0.5, 1).setScale(0.14);
        this.add.text(x, y + 34, byId(id).name, {
          fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#7b5a48',
        }).setOrigin(0.5, 0);
        this.tweens.add({
          targets: s, y: y + 20, duration: 520, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
        });
      });
      if (news.includes('zzulien')) {
        this.add.text(W / 2 + 60, y - 10, '쭈일리언을 구해 냈어요!\n이제 펫으로 데리고 다닐 수 있어요', {
          fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#8f6bbf', lineSpacing: 4,
        }).setOrigin(0, 0.5);
      }
    }

    const next = STAGES.find((s) => s.id === stageId + 1);
    const y0 = news.length ? 606 : 560;
    if (cleared && next) {
      this.btn(W / 2 - 170, y0, `다음 · ${next.name}`, () => this.scene.start('Select', { stageId: next.id }));
    } else {
      this.btn(W / 2 - 170, y0, '다시 하기', () => this.scene.start('Play', this.d));
    }
    this.btn(W / 2 + 170, y0, '스테이지 고르기', () => this.scene.start('Stage'));

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Stage'));
  }

  btn(x, y, label, fn) {
    const r = this.add.rectangle(x, y, 300, 62, 0xffd977)
      .setStrokeStyle(5, 0x7b5a48).setInteractive({ useHandCursor: true });
    this.add.text(x, y, label, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#6b4a3a',
    }).setOrigin(0.5);
    r.on('pointerover', () => r.setFillStyle(0xffe7a4));
    r.on('pointerout', () => r.setFillStyle(0xffd977));
    r.on('pointerup', fn);
  }
}
