import { W, H } from '../config.js?v=1792031867';
import { STAGES } from '../data/stages.js?v=1792031867';
import { makeGradient } from '../level/textures.js?v=1792031867';
import { load, maxOpen, endlessOpen } from '../save.js?v=1792031867';
import { byId } from '../data/characters.js?v=1792031867';
import { button } from '../ui.js?v=1792031867';

import { setupCamera } from '../hidpi.js?v=1792031867';
import { unlock, sfx } from '../audio.js?v=1792031867';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class StageScene extends Phaser.Scene {
  constructor() { super('Stage'); }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });
    this.shadowG = this.add.graphics().setDepth(-5);
    const data = load();
    const open = maxOpen();

    makeGradient(this, 'sky_stage', W, H, '#bfe6ff', '#eafbe9');
    this.add.image(0, 0, 'sky_stage').setOrigin(0, 0).setDepth(-20);
    this.add.image(140, 110, 'bg_cloud').setScale(1.0);
    this.add.image(1080, 86, 'bg_cloud').setScale(0.85);

    this.add.text(W / 2, 54, '어디로 갈까요', {
      fontFamily: FONT, fontSize: '46px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 9,
    }).setOrigin(0.5);
    this.add.text(W / 2, 100, '먹구름성까지 가면 쭈일리언을 구해 낼 수 있어요', {
      fontFamily: FONT, fontSize: '18px', color: '#8a6a56',
    }).setOrigin(0.5);

    const CWd = 186, CHt = 254, GX = 14;
    const COUNT = STAGES.length + 1;
    const x0 = W / 2 - (COUNT * CWd + (COUNT - 1) * GX) / 2;

    STAGES.forEach((s, i) => {
      const cx = x0 + i * (CWd + GX) + CWd / 2;
      const cy = 272;
      const locked = s.id > open;
      const cleared = data.cleared.includes(s.id);

      this.shadowG.fillStyle(0x7b5a48, 0.25);
      this.shadowG.fillRoundedRect(cx - CWd / 2 + 4, cy - CHt / 2 + 8, CWd, CHt, 20);
      const box = this.add.rectangle(cx, cy, CWd, CHt, locked ? 0xded6e8 : 0xfffaf4)
        .setStrokeStyle(5, locked ? 0x6b5f85 : 0x7b5a48);

      const tileKey = { forest: 'forest-ground', dessert: 'dessert-ground', sky: 'sky-ground', night: 'night-ground' }[s.theme];
      const th = this.add.image(cx, cy - 62, tileKey).setScale(0.55);
      if (locked) th.setTint(0x9b93ad);

      this.add.text(cx, cy - 8, `${s.id}`, {
        fontFamily: FONT, fontSize: '36px', fontStyle: '900',
        color: locked ? '#6b5f85' : '#ffd977', stroke: '#7b5a48', strokeThickness: 7,
      }).setOrigin(0.5);
      this.add.text(cx, cy + 30, s.name, {
        fontFamily: FONT, fontSize: '19px', fontStyle: '900',
        color: locked ? '#6b5f85' : '#6b4a3a',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 56, locked ? '앞 스테이지를 깨면 열려요' : s.hint, {
        fontFamily: FONT, fontSize: '12px', color: '#9a7b68',
        wordWrap: { width: CWd - 26 }, align: 'center',
      }).setOrigin(0.5);

      if (cleared) {
        this.add.text(cx, cy + 94, `최고 ${String(data.best[s.id] || 0).padStart(6, '0')}`, {
          fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#7b5a48',
          backgroundColor: '#ffd977', padding: { x: 9, y: 4 },
        }).setOrigin(0.5);
      } else if (!locked) {
        this.add.text(cx, cy + 94, '도전!', {
          fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#ffffff',
          backgroundColor: '#ff7fa4', padding: { x: 14, y: 4 },
        }).setOrigin(0.5);
      }

      if (locked) return;
      box.setInteractive({ useHandCursor: true });
      box.on('pointerover', () => box.setStrokeStyle(5, 0xff7fa4));
      box.on('pointerout', () => box.setStrokeStyle(5, 0x7b5a48));
      box.on('pointerup', () => this.scene.start('Select', { stageId: s.id }));
    });

    // 끝없이 달리기
    {
      const i = STAGES.length;
      const cx = x0 + i * (CWd + GX) + CWd / 2;
      const cy = 272;
      const open2 = endlessOpen();
      this.shadowG.fillStyle(0x7b5a48, 0.25);
      this.shadowG.fillRoundedRect(cx - CWd / 2 + 4, cy - CHt / 2 + 8, CWd, CHt, 20);
      const box = this.add.rectangle(cx, cy, CWd, CHt, open2 ? 0xfff3d4 : 0xded6e8)
        .setStrokeStyle(5, open2 ? 0xffb340 : 0x6b5f85);
      this.add.text(cx, cy - 62, '∞', {
        fontFamily: FONT, fontSize: '58px', fontStyle: '900',
        color: open2 ? '#ffb340' : '#9b93ad',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 30, '끝없이 달리기', {
        fontFamily: FONT, fontSize: '19px', fontStyle: '900',
        color: open2 ? '#6b4a3a' : '#6b5f85',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 56, open2 ? '어디까지 갈 수 있을까요' : '1 스테이지를 깨면 열려요', {
        fontFamily: FONT, fontSize: '12px', color: '#9a7b68',
        wordWrap: { width: CWd - 26 }, align: 'center',
      }).setOrigin(0.5);
      if (open2) {
        this.add.text(cx, cy + 94, `최고 ${data.bestDist}m`, {
          fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#7b5a48',
          backgroundColor: '#ffd977', padding: { x: 9, y: 4 },
        }).setOrigin(0.5);
        box.setInteractive({ useHandCursor: true });
        box.on('pointerover', () => box.setStrokeStyle(5, 0xff7fa4));
        box.on('pointerout', () => box.setStrokeStyle(5, 0xffb340));
        box.on('pointerup', () => this.scene.start('Select', { stageId: 'endless' }));
      }
    }

    // 지금 데리고 갈 하뀨하
    const hero = byId(data.lastHero) || byId('jjujebi');

    const BX = W / 2 - 316, BY = 440, BW = 632, BH = 130;
    this.shadowG.fillStyle(0x7b5a48, 0.2);
    this.shadowG.fillRoundedRect(BX + 4, BY + 7, BW, BH, 20);
    this.add.rectangle(W / 2, BY + BH / 2, BW, BH, 0xfffaf4).setStrokeStyle(5, 0x7b5a48);

    this.add.text(BX + 24, BY + 14, '지금 달리는 하뀨하', {
      fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#9a7b68',
    });

    this.add.image(BX + 76, BY + BH - 14, `base-${hero.id}`).setOrigin(0.5, 1).setScale(0.14);
    this.add.text(BX + 124, BY + 52, hero.name, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#6b4a3a',
    });
    this.add.image(BX + 134, BY + 94, `tok-${hero.token}`).setScale(0.1);
    this.add.text(BX + 154, BY + 84, hero.skill, {
      fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#9a7b68',
    });

    button(this, BX + BW - 118, BY + BH / 2, 196, 62, '바꾸기', () => {
      this.scene.start('Select', { stageId: Math.min(open, 5) });
    }, { size: '21px', fill: 0xffffff, hover: 0xfff2d0 });

    this.add.text(BX + 24, BY + BH + 32, `★ ${data.stars}   ·   모은 것 ${data.bank.toLocaleString()}개`, {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#7b5a48',
    });

    button(this, W / 2 + 86, BY + BH + 44, 230, 54, '올리러 가기',
      () => this.scene.start('Shop'), { size: '19px' });
    button(this, W / 2 + 330, BY + BH + 44, 200, 54, '타이틀로',
      () => this.scene.start('Title'), { size: '19px', fill: 0xffffff, hover: 0xfff2d0 });
  }
}
