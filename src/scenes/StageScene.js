import { W, H } from '../config.js';
import { STAGES } from '../data/stages.js';
import { makeGradient } from '../level/textures.js';
import { load, maxOpen } from '../save.js';

import { setupCamera } from '../hidpi.js';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class StageScene extends Phaser.Scene {
  constructor() { super('Stage'); }

  create() {
    setupCamera(this);
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
    this.add.text(W / 2, 102, '스테이지를 깰 때마다 그 캐릭터가 펫으로 따라와요', {
      fontFamily: FONT, fontSize: '18px', color: '#8a6a56',
    }).setOrigin(0.5);

    const CWd = 212, CHt = 268, GX = 18;
    const x0 = W / 2 - (STAGES.length * CWd + (STAGES.length - 1) * GX) / 2;

    STAGES.forEach((s, i) => {
      const cx = x0 + i * (CWd + GX) + CWd / 2;
      const cy = 300;
      const locked = s.id > open;
      const cleared = data.cleared.includes(s.id);

      this.shadowG.fillStyle(0x7b5a48, 0.25);
      this.shadowG.fillRoundedRect(cx - CWd / 2 + 4, cy - CHt / 2 + 8, CWd, CHt, 20);
      const box = this.add.rectangle(cx, cy, CWd, CHt, locked ? 0xded6e8 : 0xfffaf4)
        .setStrokeStyle(5, locked ? 0x6b5f85 : 0x7b5a48);

      const tileKey = { forest: 'forest-ground', dessert: 'dessert-ground', sky: 'sky-ground', night: 'night-ground' }[s.theme];
      const th = this.add.image(cx, cy - 66, tileKey).setScale(0.62);
      if (locked) th.setTint(0x9b93ad);

      this.add.text(cx, cy - 6, `${s.id}`, {
        fontFamily: FONT, fontSize: '40px', fontStyle: '900',
        color: locked ? '#6b5f85' : '#ffd977', stroke: '#7b5a48', strokeThickness: 7,
      }).setOrigin(0.5);
      this.add.text(cx, cy + 36, s.name, {
        fontFamily: FONT, fontSize: '21px', fontStyle: '900',
        color: locked ? '#6b5f85' : '#6b4a3a',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 62, locked ? '앞 스테이지를 깨면 열려요' : s.hint, {
        fontFamily: FONT, fontSize: '13px', color: '#9a7b68',
        wordWrap: { width: CWd - 30 }, align: 'center',
      }).setOrigin(0.5);

      if (cleared) {
        this.add.text(cx, cy + 100, `최고 ${String(data.best[s.id] || 0).padStart(6, '0')}`, {
          fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#7b5a48',
          backgroundColor: '#ffd977', padding: { x: 10, y: 4 },
        }).setOrigin(0.5);
      } else if (!locked) {
        this.add.text(cx, cy + 100, '도전!', {
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

    // 모은 펫
    this.add.text(W / 2, 486, `모은 펫 ${data.pets.length}`, {
      fontFamily: FONT, fontSize: '17px', color: '#8a6a56',
    }).setOrigin(0.5);
    data.pets.forEach((id, i) => {
      const x = W / 2 + (i - (data.pets.length - 1) / 2) * 92;
      this.add.image(x, 560, `base-${id}`).setOrigin(0.5, 1).setScale(0.16);
    });

    const back = this.add.rectangle(W / 2, 650, 240, 60, 0xffffff)
      .setStrokeStyle(5, 0x7b5a48).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 650, '타이틀로', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#6b4a3a',
    }).setOrigin(0.5);
    back.on('pointerup', () => this.scene.start('Title'));
  }
}
