import { W, H } from '../config.js?v=1792031867';
import { setupCamera } from '../hidpi.js?v=1792031867';
import { unlock, sfx } from '../audio.js?v=1792031867';
import { makeGradient } from '../level/textures.js?v=1792031867';
import { panel, button } from '../ui.js?v=1792031867';
import { UPGRADES, costOf } from '../data/upgrades.js?v=1792031867';
import { load, buy } from '../save.js?v=1792031867';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class ShopScene extends Phaser.Scene {
  constructor() { super('Shop'); }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });

    makeGradient(this, 'sky_shop', W, H, '#fff2d8', '#ffeef6');
    this.add.image(0, 0, 'sky_shop').setOrigin(0, 0).setDepth(-20);
    this.add.image(140, 100, 'bg_cloud').setScale(0.9);
    this.add.image(1100, 86, 'bg_cloud').setScale(0.75);

    this.add.text(W / 2, 44, '모은 걸로 올리기', {
      fontFamily: FONT, fontSize: '42px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 9,
    }).setOrigin(0.5);

    this.bankTxt = this.add.text(W / 2, 94, '', {
      fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: '#7b5a48',
    }).setOrigin(0.5);

    this.cards = [];
    const CW = 384, CH = 150, GX = 20, GY = 18;
    const x0 = W / 2 - (3 * CW + 2 * GX) / 2;
    UPGRADES.forEach((u, i) => {
      const cx = x0 + (i % 3) * (CW + GX);
      const cy = 136 + Math.floor(i / 3) * (CH + GY);
      panel(this, cx, cy, CW, CH, { fixed: false, depth: 0 });
      this.add.image(cx + 52, cy + 56, u.icon).setScale(0.26).setDepth(1);
      this.add.text(cx + 100, cy + 16, u.name, {
        fontFamily: FONT, fontSize: '21px', fontStyle: '900', color: '#6b4a3a',
      }).setDepth(1);
      const desc = this.add.text(cx + 100, cy + 46, '', {
        fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#9a7b68',
      }).setDepth(1);
      const dots = this.add.text(cx + 100, cy + 70, '', {
        fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#ffb340',
      }).setDepth(1);
      const b = button(this, cx + CW - 92, cy + CH - 42, 148, 52, '', () => this.tryBuy(u),
        { size: '17px' });
      this.cards.push({ u, desc, dots, b });
    });

    button(this, W / 2, H - 52, 260, 58, '돌아가기', () => this.scene.start('Stage'),
      { size: '21px', fill: 0xffffff, hover: 0xfff2d0 });

    this.refresh();
  }

  refresh() {
    const d = load();
    this.bankTxt.setText(`모은 것 ${d.bank.toLocaleString()}개  ·  별 ${d.stars}개`);
    for (const c of this.cards) {
      const lv = d.upgrades[c.u.id] || 0;
      const cost = costOf(c.u, lv);
      c.desc.setText(c.u.desc(lv));
      c.dots.setText('●'.repeat(lv) + '○'.repeat(c.u.max - lv));
      if (cost === null) {
        c.b.t.setText('끝').setColor('#9a7b68');
        c.b.zone.disableInteractive();
      } else {
        c.b.t.setText(`${cost}개`).setColor(d.bank >= cost ? '#6b4a3a' : '#b9a594');
      }
    }
  }

  tryBuy(u) {
    const d = load();
    const lv = d.upgrades[u.id] || 0;
    const cost = costOf(u, lv);
    if (cost === null) return;
    if (!buy(u.id, cost)) {
      this.flash('모은 게 모자라요');
      return;
    }
    sfx.power();
    this.flash(`${u.name} 올렸어요`);
    this.refresh();
  }

  flash(msg) {
    if (this.msg) this.msg.destroy();
    this.msg = this.add.text(W / 2, H - 110, msg, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#ffffff',
      stroke: '#e2577f', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(60);
    this.tweens.add({ targets: this.msg, alpha: 0, delay: 900, duration: 400 });
  }
}
