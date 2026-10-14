import { W, H } from '../config.js?v=1792017972';
import { setupCamera } from '../hidpi.js?v=1792017972';
import { unlock, sfx } from '../audio.js?v=1792017972';
import { CHARACTERS, byId } from '../data/characters.js?v=1792017972';
import { makeGradient } from '../level/textures.js?v=1792017972';
import { panel, button } from '../ui.js?v=1792017972';
import { load, setLast, isUnlocked } from '../save.js?v=1792017972';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class SelectScene extends Phaser.Scene {
  constructor() { super('Select'); }

  init(d) { this.stageId = (d && d.stageId) || 1; }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });
    this.shadowG = this.add.graphics().setDepth(-5);

    const data = load();
    this.list = CHARACTERS.filter((c) => !c.needRescue || isUnlocked(c.id));
    this.heroId = this.list.some((c) => c.id === data.lastHero) ? data.lastHero : this.list[0].id;

    makeGradient(this, 'sky_select', W, H, '#ffeef6', '#e9f6ff');
    this.add.image(0, 0, 'sky_select').setOrigin(0, 0).setDepth(-20);

    this.add.text(W / 2, 46, '누구랑 갈까요', {
      fontFamily: FONT, fontSize: '44px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 9,
    }).setOrigin(0.5);

    const locked = CHARACTERS.filter((c) => c.needRescue && !isUnlocked(c.id));
    this.add.text(W / 2, 94, locked.length
      ? '먹구름성을 깨면 쭈일리언도 함께 달릴 수 있어요'
      : '쭈일리언까지 모두 모였어요', {
      fontFamily: FONT, fontSize: '17px', fontStyle: '700', color: '#8a6a56',
    }).setOrigin(0.5);

    const all = [...this.list, ...locked];
    const CWd = 128, CHt = 182, GX = 10;
    const x0 = W / 2 - (all.length * CWd + (all.length - 1) * GX) / 2;
    this.cards = [];

    all.forEach((c, i) => {
      const cx = x0 + i * (CWd + GX) + CWd / 2;
      const cy = 232;
      const dim = c.needRescue && !isUnlocked(c.id);

      this.shadowG.fillStyle(0x7b5a48, 0.22);
      this.shadowG.fillRoundedRect(cx - CWd / 2 + 3, cy - CHt / 2 + 6, CWd, CHt, 16);
      const box = this.add.rectangle(cx, cy, CWd, CHt, dim ? 0xded6e8 : 0xfffaf4)
        .setStrokeStyle(5, dim ? 0x6b5f85 : 0x7b5a48);

      const art = this.add.image(cx, cy + 34, `base-${c.id}`).setOrigin(0.5, 1).setScale(0.165);
      if (dim) art.setTint(0x9b93ad).setAlpha(0.6);

      this.add.text(cx, cy + 40, c.name, {
        fontFamily: FONT, fontSize: '18px', fontStyle: '900',
        color: dim ? '#6b5f85' : '#6b4a3a',
      }).setOrigin(0.5);
      this.add.text(cx, cy + 62, c.member, {
        fontFamily: FONT, fontSize: '12px', fontStyle: '700', color: '#9a7b68',
      }).setOrigin(0.5);
      this.add.image(cx + 44, cy - 64, `tok-${c.token}`).setScale(0.1).setAlpha(dim ? 0.4 : 1);

      if (dim) {
        this.add.text(cx, cy - 20, '자물쇠', {
          fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#ffffff',
          backgroundColor: '#4c4160', padding: { x: 8, y: 3 },
        }).setOrigin(0.5);
        return;
      }

      box.setInteractive({ useHandCursor: true });
      box.on('pointerup', () => this.pick(c.id));
      box.on('pointerover', () => this.pick(c.id));
      this.cards.push({ id: c.id, box });
    });

    panel(this, W / 2 - 330, 350, 660, 104, { fixed: false, depth: 0 });
    this.skillName = this.add.text(W / 2 - 306, 364, '', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#6b4a3a',
    }).setDepth(1);
    this.skillDesc = this.add.text(W / 2 - 306, 396, '', {
      fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#8a6a56',
    }).setDepth(1);
    this.tokenIcon = this.add.image(W / 2 + 250, 388, 'tok-heart').setScale(0.19).setDepth(1);
    this.tokenTxt = this.add.text(W / 2 + 250, 420, '', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#9a7b68',
    }).setOrigin(0.5).setDepth(1);

    this.add.text(W / 2, 478, `★ ${data.stars}   ·   모은 것 ${data.bank.toLocaleString()}개`, {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#7b5a48',
    }).setOrigin(0.5);

    button(this, W / 2, 556, 320, 72, '▶ 출발', () => this.start(), { size: '30px' });
    button(this, W / 2, 648, 240, 54, '스테이지 고르기',
      () => this.scene.start('Stage'), { size: '18px', fill: 0xffffff, hover: 0xfff2d0 });

    this.input.keyboard.on('keydown-SPACE', () => this.start());
    this.input.keyboard.on('keydown-ENTER', () => this.start());
    this.input.keyboard.on('keydown-RIGHT', () => this.step(1));
    this.input.keyboard.on('keydown-LEFT', () => this.step(-1));

    this.pick(this.heroId);
  }

  step(d) {
    const ids = this.cards.map((c) => c.id);
    const at = ids.indexOf(this.heroId);
    this.pick(ids[(at + d + ids.length) % ids.length]);
  }

  pick(id) {
    this.heroId = id;
    this.cards.forEach((e) => {
      e.box.setStrokeStyle(5, e.id === id ? 0xff7fa4 : 0x7b5a48);
      e.box.setFillStyle(e.id === id ? 0xfff1f6 : 0xfffaf4);
    });
    const c = byId(id);
    this.skillName.setText(c.skill);
    this.skillDesc.setText(c.desc);
    this.tokenIcon.setTexture(`tok-${c.token}`);
    this.tokenTxt.setText('이걸 주워요');
  }

  start() {
    setLast(this.heroId);
    this.scene.start('Play', { heroId: this.heroId, stageId: this.stageId });
  }
}
