import { CHARACTERS } from '../data/characters.js';
import { buildTextures } from '../level/textures.js';
import { W, H } from '../config.js';
import { setupCamera } from '../hidpi.js';

const TOKENS = ['bone', 'clover', 'flower', 'heart', 'note', 'paw', 'ribbon', 'seed', 'snowflake'];
const POWERS = ['boost', 'double', 'giant', 'heal', 'magnet', 'shield'];
const TILES = ['forest-ground', 'dessert-ground', 'sky-ground', 'night-ground', 'sky-platform'];

export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    setupCamera(this);
    const bar = this.add.rectangle(W / 2, H / 2, 420, 22, 0xffffff, 0.25);
    const fill = this.add.rectangle(W / 2 - 208, H / 2, 10, 14, 0xffd977).setOrigin(0, 0.5);
    this.add.text(W / 2, H / 2 - 44, '불러오는 중', {
      fontFamily: 'Apple SD Gothic Neo, sans-serif', fontSize: '22px', color: '#ffffff',
    }).setOrigin(0.5);
    this.load.on('progress', (p) => { fill.width = 416 * p; });
    this.load.on('complete', () => { bar.destroy(); fill.destroy(); });

    for (const c of CHARACTERS) {
      this.load.image(`base-${c.id}`, `assets/base/${c.id}.webp`);
      this.load.json(`meta-${c.id}`, `assets/${c.id}/${c.id}.json`);
    }

    TILES.forEach((t) => this.load.image(t, `assets/tiles/${t}.webp`));
    TOKENS.forEach((t) => this.load.image(`tok-${t}`, `assets/items/${t}.webp`));
    POWERS.forEach((p) => this.load.image(`pw-${p}`, `assets/powerups/${p}.webp`));

    this.load.image('blk-cookie', 'assets/blocks/cookie.webp');
    this.load.image('blk-item', 'assets/blocks/item.webp');
    this.load.image('blk-empty', 'assets/blocks/empty.webp');

    this.load.image('enm-slime', 'assets/enemies/slime.webp');
    this.load.image('enm-slime-hurt', 'assets/enemies/slime-hurt.webp');
    this.load.image('enm-bee1', 'assets/enemies/bee-1.webp');
    this.load.image('enm-bee2', 'assets/enemies/bee-2.webp');
    this.load.image('enm-ghost', 'assets/enemies/ghost.webp');
    this.load.image('enm-chestnut', 'assets/enemies/chestnut.webp');

    this.load.image('obs-spikes', 'assets/obstacles/spikes.webp');
    this.load.image('obs-hanging', 'assets/obstacles/hanging.webp');
    this.load.image('obs-tall', 'assets/obstacles/tall.webp');
    this.load.image('obs-spring', 'assets/obstacles/spring.webp');
    this.load.image('obs-puddle', 'assets/obstacles/puddle.webp');

    // fx 는 SVG 만 있다
    this.load.svg('fx_sparkle', 'assets/fx/sparkle.svg', { width: 96, height: 96 });
    this.load.svg('fx_star', 'assets/fx/star.svg', { width: 96, height: 96 });
    this.load.svg('fx_hit', 'assets/fx/hit.svg', { width: 160, height: 160 });
    this.load.svg('fx_heart', 'assets/fx/heart.svg', { width: 96, height: 96 });
    this.load.svg('fx_drop', 'assets/fx/drop.svg', { width: 64, height: 64 });
  }

  create() {
    buildTextures(this);

    const q = new URLSearchParams(location.search);
    const hero = q.get('hero');
    if (hero && CHARACTERS.some((c) => c.id === hero && !c.rescueOnly)) {
      const others = CHARACTERS.filter((c) => c.id !== hero && !c.rescueOnly);
      this.scene.start('Play', {
        heroId: hero,
        petId: q.get('pet') || others[0].id,
        stageId: Number(q.get('stage') || 1),
      });
      return;
    }
    this.scene.start(q.get('scene') || 'Title');
  }
}
