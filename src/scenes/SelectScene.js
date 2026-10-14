import { W, H } from '../config.js';
import { CHARACTERS, PLAYABLE, byId } from '../data/characters.js';
import { makeGradient } from '../level/textures.js';
import { load, setLast } from '../save.js';

import { setupCamera } from '../hidpi.js';
import { unlock, sfx } from '../audio.js';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  init(d) { this.stageId = (d && d.stageId) || 1; }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });
    this.shadowG = this.add.graphics().setDepth(-5);
    const data = load();
    this.petPool = data.pets.slice();
    this.heroId = PLAYABLE.some((c) => c.id === data.lastHero) ? data.lastHero : PLAYABLE[0].id;
    this.petId = this.petPool.includes(data.lastPet) ? data.lastPet : this.petPool[0];

    makeGradient(this, 'sky_select', W, H, '#ffeef6', '#e9f6ff');
    this.add.image(0, 0, 'sky_select').setOrigin(0, 0).setDepth(-20);

    this.add.text(W / 2, 40, '누구랑 갈까요', {
      fontFamily: FONT, fontSize: '42px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 9,
    }).setOrigin(0.5);

    // 캐릭터
    this.add.text(70, 92, '달릴 하뀨하', {
      fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: '#6b4a3a',
    });
    const CWd = 128, CHt = 150, GX = 10;
    const x0 = W / 2 - (PLAYABLE.length * CWd + (PLAYABLE.length - 1) * GX) / 2;
    this.heroCards = [];
    PLAYABLE.forEach((c, i) => {
      const cx = x0 + i * (CWd + GX) + CWd / 2;
      const cy = 198;
      this.shadowG.fillStyle(0x7b5a48, 0.22);
      this.shadowG.fillRoundedRect(cx - CWd / 2 + 3, cy - CHt / 2 + 6, CWd, CHt, 16);
      const box = this.add.rectangle(cx, cy, CWd, CHt, 0xfffaf4).setStrokeStyle(5, 0x7b5a48)
        .setInteractive({ useHandCursor: true });
      this.add.image(cx, cy + 22, `base-${c.id}`).setOrigin(0.5, 1).setScale(0.15);
      this.add.text(cx, cy + 40, c.name, {
        fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#6b4a3a',
      }).setOrigin(0.5);
      this.add.image(cx + 44, cy - 50, `tok-${c.token}`).setScale(0.11);
      box.on('pointerup', () => this.pickHero(c.id));
      box.on('pointerover', () => this.pickHero(c.id));
      this.heroCards.push({ id: c.id, box });
    });

    this.skill = this.add.text(W / 2, 300, '', {
      fontFamily: FONT, fontSize: '19px', color: '#6b4a3a',
      backgroundColor: '#ffffff', padding: { x: 18, y: 7 },
    }).setOrigin(0.5);

    // 펫
    this.add.text(70, 340, '따라올 펫', {
      fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: '#6b4a3a',
    });
    this.add.text(190, 344, '스테이지를 깨면 그 캐릭터가 펫으로 들어와요', {
      fontFamily: FONT, fontSize: '14px', color: '#9a7b68',
    });

    const PWd = 112, PHt = 126;
    const px0 = W / 2 - (this.petPool.length * PWd + (this.petPool.length - 1) * GX) / 2;
    this.petCards = [];
    this.petPool.forEach((id, i) => {
      const c = byId(id);
      const cx = px0 + i * (PWd + GX) + PWd / 2;
      const cy = 436;
      this.shadowG.fillStyle(0x7b5a48, 0.22);
      this.shadowG.fillRoundedRect(cx - PWd / 2 + 3, cy - PHt / 2 + 6, PWd, PHt, 16);
      const box = this.add.rectangle(cx, cy, PWd, PHt, 0xfffaf4).setStrokeStyle(5, 0x7b5a48)
        .setInteractive({ useHandCursor: true });
      this.add.image(cx, cy + 16, `base-${id}`).setOrigin(0.5, 1).setScale(0.12);
      this.add.text(cx, cy + 34, c.name, {
        fontFamily: FONT, fontSize: '15px', fontStyle: '900',
        color: id === 'zzulien' ? '#8f6bbf' : '#6b4a3a',
      }).setOrigin(0.5);
      box.on('pointerup', () => this.pickPet(id));
      box.on('pointerover', () => this.pickPet(id));
      this.petCards.push({ id, box });
    });

    const go = this.add.rectangle(W / 2, 560, 320, 72, 0xffd977)
      .setStrokeStyle(5, 0x7b5a48).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 560, '▶ 출발', {
      fontFamily: FONT, fontSize: '30px', fontStyle: '900', color: '#6b4a3a',
    }).setOrigin(0.5);
    go.on('pointerover', () => go.setFillStyle(0xffe7a4));
    go.on('pointerout', () => go.setFillStyle(0xffd977));
    go.on('pointerup', () => this.start());

    const back = this.add.rectangle(W / 2, 646, 200, 52, 0xffffff)
      .setStrokeStyle(4, 0x7b5a48).setInteractive({ useHandCursor: true });
    this.add.text(W / 2, 646, '스테이지 고르기', {
      fontFamily: FONT, fontSize: '17px', fontStyle: '700', color: '#6b4a3a',
    }).setOrigin(0.5);
    back.on('pointerup', () => this.scene.start('Stage'));

    this.input.keyboard.on('keydown-SPACE', () => this.start());
    this.input.keyboard.on('keydown-ENTER', () => this.start());

    this.pickHero(this.heroId);
    this.pickPet(this.petId);
  }

  pickHero(id) {
    this.heroId = id;
    this.heroCards.forEach((e) => {
      e.box.setStrokeStyle(5, e.id === id ? 0xff7fa4 : 0x7b5a48);
      e.box.setFillStyle(e.id === id ? 0xfff1f6 : 0xfffaf4);
    });
    const c = byId(id);
    this.skill.setText(`${c.skill} — ${c.desc}`);
  }

  pickPet(id) {
    this.petId = id;
    this.petCards.forEach((e) => {
      e.box.setStrokeStyle(5, e.id === id ? 0x8fc4e8 : 0x7b5a48);
      e.box.setFillStyle(e.id === id ? 0xeff8ff : 0xfffaf4);
    });
  }

  start() {
    setLast(this.heroId, this.petId);
    this.scene.start('Play', { heroId: this.heroId, petId: this.petId, stageId: this.stageId });
  }
}
