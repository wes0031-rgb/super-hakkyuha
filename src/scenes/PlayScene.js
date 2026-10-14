import {
  W, H, TILE, GROUND_Y, FALL_Y, CHUNK_COLS,
  HP_MAX, HP_HIT, HP_PIT, HP_HEART, REVIVE_HP, TOKEN_SCORE, STOMP_SCORE,
} from '../config.js';
import { byId, MOTIONS, PET_MOTIONS } from '../data/characters.js';
import { byStage } from '../data/stages.js';
import { pickOrder, buildWorld } from '../level/Level.js';
import { makeGradient } from '../level/textures.js';
import Hero from '../objects/Hero.js';
import { setupCamera, scrollTo } from '../hidpi.js';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  init(data) {
    this.heroId = data.heroId;
    this.petId = data.petId;
    this.stage = byStage(data.stageId || 1);
    this.char = byId(this.heroId);
    this.tokenKey = `tok-${this.char.token}`;
    this.score = 0;
    this.tokenCount = 0;
    this.hp = HP_MAX;
    this.revives = 1;
    this.over = false;
    this.won = false;
  }

  preload() {
    const load = (id, list) => {
      const meta = this.cache.json.get(`meta-${id}`).anims;
      for (const m of list) {
        const key = `${id}-${m}`;
        if (this.textures.exists(key)) continue;
        const a = meta[m];
        this.load.spritesheet(key, `assets/${id}/${a.file}`,
          { frameWidth: a.frameWidth, frameHeight: a.frameHeight });
      }
    };
    load(this.heroId, MOTIONS);
    load(this.petId, PET_MOTIONS);
    if (this.stage.rescue) load('zzulien', ['pet_follow']);
  }

  makeAnims(id, list) {
    const meta = this.cache.json.get(`meta-${id}`).anims;
    for (const m of list) {
      const key = `${id}-${m}`;
      if (this.anims.exists(key)) continue;
      const a = meta[m];
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(key, { start: 0, end: a.frames - 1 }),
        frameRate: a.frameRate,
        repeat: a.loop ? -1 : 0,
      });
    }
  }

  create() {
    this.makeAnims(this.heroId, MOTIONS);
    this.makeAnims(this.petId, PET_MOTIONS);
    if (this.stage.rescue) this.makeAnims('zzulien', ['pet_follow']);

    this.order = pickOrder(this.stage);
    const { groups, width, goalX } = buildWorld(this, this.order, this.stage, this.tokenKey);
    this.G = groups;
    this.worldW = width;
    this.goalX = goalX;

    this.physics.world.setBounds(0, -500, width, H + 900);
    setupCamera(this);
    this.camX = 0;

    this.drawBackground();
    this.drawGoal();

    const heroMeta = this.cache.json.get(`meta-${this.heroId}`).anims;
    this.hero = new Hero(this, 180, GROUND_Y, this.char, heroMeta);

    this.pet = this.add.sprite(60, GROUND_Y, `${this.petId}-pet_follow`).setDepth(4);
    const pm = this.cache.json.get(`meta-${this.petId}`).anims.pet_follow;
    this.pet.setOrigin(pm.origin.x, pm.origin.y).setScale(0.58);
    this.pet.play(`${this.petId}-pet_follow`);
    this.petTimer = 0;

    this.bindCollisions();
    this.buildHUD();
    this.bindInput();

    const q = new URLSearchParams(location.search);
    this.freeze = q.has('freeze');
    this.auto = q.has('auto');
    this.wasGround = true;
    this.lastSonic = 0;
    scrollTo(this, 0);
    this.cameras.main.fadeIn(180);
  }

  // ── 배경 ───────────────────────────────────────────────
  drawBackground() {
    const [c1, c2] = this.stage.sky;
    makeGradient(this, 'sky_play', W, H, c1, c2);
    this.add.image(0, 0, 'sky_play').setOrigin(0, 0).setScrollFactor(0).setDepth(-20);

    const night = this.stage.theme === 'night';
    if (!night) {
      this.add.circle(1120, 120, 58, 0xfff6c9, 0.85).setScrollFactor(0).setDepth(-19);
    } else {
      for (let i = 0; i < 40; i++) {
        this.add.circle(Math.random() * W, Math.random() * 380, 2 + Math.random() * 2,
          0xffffff, 0.8).setScrollFactor(0.1).setDepth(-19);
      }
    }

    const cloudTint = night ? 0x8e86a8 : 0xffffff;
    for (let i = 0; i < 30; i++) {
      this.add.image(i * 520 + 120, 110 + (i % 3) * 46, 'bg_cloud')
        .setScrollFactor(0.25).setDepth(-18).setScale(0.8 + (i % 3) * 0.2).setTint(cloudTint);
    }
    const hillTint = {
      forest: 0xbfe8c0, dessert: 0xf3d6a8, sky: 0xd8e8ff, night: 0x5f5578,
    }[this.stage.theme];
    for (let i = 0; i < 54; i++) {
      this.add.image(i * 330 + 60, GROUND_Y + 34, 'bg_hill')
        .setOrigin(0.5, 1).setScrollFactor(0.55).setDepth(-17)
        .setScale(0.62 + (i % 3) * 0.14, 0.42 + (i % 2) * 0.1).setTint(hillTint);
    }
  }

  drawGoal() {
    const x = this.goalX;
    if (this.stage.rescue) {
      this.cage = this.add.image(x, GROUND_Y - 150, 'i_cage').setDepth(3);
      const pm = this.cache.json.get('meta-zzulien').anims.pet_follow;
      this.zz = this.add.sprite(x, GROUND_Y - 108, 'zzulien-pet_follow')
        .setOrigin(pm.origin.x, pm.origin.y).setScale(0.4).setDepth(4);
      this.zz.play('zzulien-pet_follow');
      this.tweens.add({
        targets: [this.cage, this.zz], y: '-=12', duration: 1100,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });
    } else {
      this.add.image(x, GROUND_Y, 'i_flag').setOrigin(0.5, 1).setDepth(2);
    }
  }

  // ── 충돌 ───────────────────────────────────────────────
  bindCollisions() {
    const hero = this.hero;
    this.physics.add.collider(hero.box, this.G.solid);

    this.physics.add.collider(hero.box, this.G.bricks, (box, b) => {
      if (hero.body.blocked.up) { this.breakBrick(b); hero.bump(); }
    }, () => !this.canSmash());

    this.physics.add.overlap(hero.box, this.G.bricks, (box, b) => {
      if (this.canSmash()) { this.breakBrick(b); this.addScore(50); }
    });

    this.physics.add.collider(hero.box, this.G.boxes, (box, blk) => {
      if (hero.body.blocked.up && blk.getData('full')) {
        blk.setData('full', false);
        blk.setTexture('blk-empty');
        hero.bump();
        this.tweens.add({ targets: blk, y: blk.y - 10, duration: 90, yoyo: true });
        this.popToken(blk.x, blk.y - 60);
      }
    });

    this.physics.add.overlap(hero.box, this.G.tokens, (box, t) => this.takeToken(t));
    this.physics.add.overlap(hero.box, this.G.powers, (box, p) => this.takePower(p));
    this.physics.add.overlap(hero.box, this.G.enemies, (box, e) => this.touchEnemy(e));
    this.physics.add.overlap(hero.box, this.G.hazards, (box, o) => this.touchHazard(o));

    this.physics.add.overlap(hero.box, this.G.springs, (box, sp) => {
      if (hero.body.velocity.y <= 0) return;
      hero.spring();
      this.tweens.add({ targets: sp, scaleY: 0.28, duration: 90, yoyo: true });
      this.sparkle(sp.x, sp.y - 40);
    });

    this.physics.add.overlap(hero.box, this.G.puddles, (box, pd) => {
      if (!hero.slipping) { hero.slip(this.time.now); this.puff(pd.x, pd.y); }
    });
  }

  canSmash() {
    const h = this.hero;
    return h.giant || h.boosting || (h.sliding && this.char.stats.slideBreak);
  }

  breakBrick(b) {
    this.puff(b.x, b.y);
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(b.x, b.y, 'blk-cookie').setScale(0.16).setDepth(3);
      this.tweens.add({
        targets: p, x: b.x + (i % 2 ? 50 : -50), y: b.y + 120, angle: i * 90,
        alpha: 0, duration: 520, onComplete: () => p.destroy(),
      });
    }
    b.destroy();
  }

  popToken(x, y) {
    const t = this.G.tokens.create(x, y, this.tokenKey).setScale(0.32);
    t.body.setCircle(70, 30, 30);
    t.setData('baseY', y);
    this.tweens.add({ targets: t, y: y - 28, duration: 220, yoyo: true, ease: 'Quad.easeOut' });
  }

  takeToken(t) {
    if (!t.body) return;
    t.disableBody(true, false);
    this.tweens.add({
      targets: t, scale: 0.46, alpha: 0, duration: 180, onComplete: () => t.destroy(),
    });
    this.tokenCount++;
    this.addScore(Math.round(TOKEN_SCORE * (this.char.stats.token || 1)));
    this.hp = Math.min(HP_MAX, this.hp + HP_HEART);
  }

  takePower(p) {
    const kind = p.getData('kind');
    p.destroy();
    const now = this.time.now;
    const hero = this.hero;
    hero.powerUp();
    this.sparkle(hero.x, hero.y - 90);
    const label = {
      boost: '부스트!', giant: '거대화!', magnet: '자석!',
      shield: '보호막!', double: '점프 하나 더!', heal: '회복!',
    }[kind];
    if (kind === 'boost') hero.giveBoost(now);
    if (kind === 'giant') hero.giveGiant(now);
    if (kind === 'magnet') hero.giveMagnet(now);
    if (kind === 'shield') hero.giveShield();
    if (kind === 'double') hero.giveDouble();
    if (kind === 'heal') this.hp = Math.min(HP_MAX, this.hp + 40);
    this.toast(label);
  }

  touchEnemy(e) {
    const hero = this.hero;
    if (!e.active || hero.locked) return;
    const kind = e.getData('kind');
    const top = e.y - e.displayHeight * (e.originY === 1 ? 1 : 0.5);
    const stomping = hero.body.velocity.y > 60 && hero.box.y < top + 36;

    if (hero.giant || hero.boosting) { this.killEnemy(e); this.addScore(300); return; }

    const stompable = kind === 'slime' || kind === 'bee'
      || (kind === 'ghost' && e.alpha > 0.6);
    if (stompable && stomping) {
      this.killEnemy(e, kind === 'slime');
      hero.stomp();
      const i = Math.min(hero.stompChain, STOMP_SCORE.length - 1);
      this.addScore(STOMP_SCORE[i]);
      this.floatText(e.x, top, `+${STOMP_SCORE[i]}`);
      hero.stompChain++;
      return;
    }
    this.damage(HP_HIT, kind === 'chestnut');
  }

  touchHazard(o) {
    if (this.hero.locked) return;
    this.damage(HP_HIT, o.getData('kind') === 'spike');
  }

  killEnemy(e, squash = false) {
    if (squash) {
      e.setTexture('enm-slime-hurt');
      e.disableBody(true, false);
      this.tweens.add({
        targets: e, scaleY: 0.1, alpha: 0, duration: 260, onComplete: () => e.destroy(),
      });
    } else {
      this.puff(e.x, e.y - 20);
      e.destroy();
    }
  }

  damage(amount, stun = false) {
    const hero = this.hero;
    if (hero.invuln || hero.locked || this.over) return;
    if (this.char.stats.slideInvuln && hero.sliding) return;

    if (hero.shield) {
      hero.shield = false;
      hero.invulnUntil = this.time.now + 900;
      this.toast('보호막이 막았어요');
      this.sparkle(hero.x, hero.y - 80);
      return;
    }

    this.hp -= amount;
    this.cameras.main.shake(140, 0.006);
    if (this.hp > 0) {
      if (stun) hero.stun(this.time.now); else hero.hurt(this.time.now);
      return;
    }

    this.hp = 0;
    if (this.revives > 0) {
      this.revives--;
      hero.down(() => { this.hp = REVIVE_HP; this.toast('한 번 더!'); });
    } else {
      hero.gameOver();
      this.finish(false);
    }
  }

  // ── HUD ────────────────────────────────────────────────
  buildHUD() {
    const panel = (x, y, w, h) => this.add.rectangle(x, y, w, h, 0xffffff, 0.9)
      .setOrigin(0, 0).setStrokeStyle(4, 0x7b5a48).setScrollFactor(0).setDepth(50);

    panel(16, 14, 274, 74);
    this.add.image(42, 51, `base-${this.heroId}`).setScale(0.085)
      .setScrollFactor(0).setDepth(51);
    this.add.text(74, 22, this.char.name, {
      fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: '#8a6a56',
    }).setScrollFactor(0).setDepth(51);
    this.add.rectangle(74, 46, 196, 20, 0xe6dcd2)
      .setOrigin(0, 0).setStrokeStyle(3, 0x7b5a48).setScrollFactor(0).setDepth(51);
    this.hpBar = this.add.rectangle(77, 49, 190, 14, 0xff7fa4)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(52);
    this.badge = this.add.text(74, 68, '', {
      fontFamily: FONT, fontSize: '12px', color: '#8a6a56',
    }).setScrollFactor(0).setDepth(51);

    panel(304, 14, 170, 74);
    this.add.image(332, 51, this.tokenKey).setScale(0.17).setScrollFactor(0).setDepth(51);
    this.tokenTxt = this.add.text(358, 36, '0', {
      fontFamily: FONT, fontSize: '26px', fontStyle: '900', color: '#6b4a3a',
    }).setScrollFactor(0).setDepth(51);

    panel(488, 14, 230, 74);
    this.add.text(502, 22, 'SCORE', {
      fontFamily: FONT, fontSize: '13px', color: '#9a7b68',
    }).setScrollFactor(0).setDepth(51);
    this.scoreTxt = this.add.text(502, 40, '000000', {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: '#6b4a3a',
    }).setScrollFactor(0).setDepth(51);

    panel(732, 14, 532, 74);
    this.add.text(746, 22, `${this.stage.id}. ${this.stage.name}`, {
      fontFamily: FONT, fontSize: '13px', color: '#9a7b68',
    }).setScrollFactor(0).setDepth(51);
    this.add.rectangle(746, 44, 502, 26, 0xe6dcd2)
      .setOrigin(0, 0).setStrokeStyle(3, 0x7b5a48).setScrollFactor(0).setDepth(51);
    this.progBar = this.add.rectangle(749, 47, 6, 20, 0xffd977)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(52);
    this.progIcon = this.add.image(749, 57, `base-${this.heroId}`)
      .setScale(0.045).setScrollFactor(0).setDepth(53);

    this.toastTxt = this.add.text(W / 2, 150, '', {
      fontFamily: FONT, fontSize: '40px', fontStyle: '900', color: '#ffffff',
      stroke: '#e2577f', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);

    this.hint = this.add.text(W / 2, H - 34,
      `${this.stage.hint}   ·   Space 점프(공중에서 한 번 더) · ↓ 슬라이드`, {
        fontFamily: FONT, fontSize: '16px', color: '#6b4a3a',
        backgroundColor: '#ffffffcc', padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(55);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 4200, duration: 700 });
  }

  addScore(n) {
    this.score += n;
    this.scoreTxt.setText(String(this.score).padStart(6, '0'));
  }

  toast(msg) {
    this.toastTxt.setText(msg).setAlpha(1).setScale(0.7);
    this.tweens.add({ targets: this.toastTxt, scale: 1, duration: 180, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.toastTxt, alpha: 0, delay: 900, duration: 400 });
  }

  floatText(x, y, msg) {
    const t = this.add.text(x, y, msg, {
      fontFamily: FONT, fontSize: '26px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 70, alpha: 0, duration: 760, onComplete: () => t.destroy() });
  }

  puff(x, y) {
    for (let i = 0; i < 4; i++) {
      const p = this.add.image(x + (i - 1.5) * 14, y - 6, 'fx_puff')
        .setScale(0.5).setAlpha(0.85).setDepth(7).setTint(0xf0e6d6);
      this.tweens.add({
        targets: p, x: p.x - 40 - i * 10, y: p.y - 18, scale: 1.1, alpha: 0,
        duration: 420, onComplete: () => p.destroy(),
      });
    }
  }

  sparkle(x, y) {
    for (let i = 0; i < 5; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = this.add.image(x, y, 'fx_sparkle').setScale(0.22).setDepth(8);
      this.tweens.add({
        targets: s, x: x + Math.cos(a) * 60, y: y + Math.sin(a) * 60,
        scale: 0, alpha: 0, duration: 430, onComplete: () => s.destroy(),
      });
    }
  }

  // ── 입력 ───────────────────────────────────────────────
  bindInput() {
    const k = this.input.keyboard;
    this.keys = k.addKeys({
      down: Phaser.Input.Keyboard.KeyCodes.DOWN,
      shift: Phaser.Input.Keyboard.KeyCodes.SHIFT,
    });
    const press = () => { if (!this.over) this.hero.jumpPressed(this.time.now); };
    const release = () => this.hero.jumpReleased();
    k.on('keydown-SPACE', press);
    k.on('keydown-UP', press);
    k.on('keyup-SPACE', release);
    k.on('keyup-UP', release);
    k.on('keydown-ESC', () => this.scene.start('Stage'));

    this.touchSlide = false;
    this.input.on('pointerdown', (p) => {
      if (this.over) return;
      if (p.x > W / 2) press(); else this.touchSlide = true;
    });
    this.input.on('pointerup', (p) => {
      if (p.x > W / 2) release(); else this.touchSlide = false;
    });
  }

  // ── 루프 ───────────────────────────────────────────────
  update(time, delta) {
    const hero = this.hero;
    if (!hero) return;

    if (this.freeze) {
      hero.box.setVelocityX(0);
      hero.art.x = hero.box.x; hero.art.y = hero.box.y;
      return;
    }

    const input = {
      slide: this.keys.down.isDown || this.keys.shift.isDown || this.touchSlide,
    };
    if (this.auto) this.autoPlay(time, input);
    hero.update(time, delta, input);

    const grounded = hero.body.blocked.down || hero.body.touching.down;
    if (grounded && !this.wasGround && !hero.locked) {
      hero.playOnce('land');
      this.puff(hero.x, hero.y);
      hero.stompChain = 0;
    }
    this.wasGround = grounded;

    const want = Phaser.Math.Clamp(hero.box.x - 380, 0, this.worldW - W);
    this.camX = Phaser.Math.Linear(this.camX, want, 0.2);
    scrollTo(this, this.camX);

    this.updateEnemies(time);
    this.updateTokens(time);
    this.updatePet(time, delta);
    if (this.char.stats.sonic) this.updateSonic(time);

    // 추락 — 지면 바로 아래에서 바로 잡는다.
    // 더 늦게 잡으면 달리던 관성으로 지면 타일 밑에 들어가 점프해도 머리가 막힌다.
    if (hero.box.y > FALL_Y && !hero.locked && !this.over) this.fallOut();

    if (!this.won && hero.box.x >= this.goalX) this.reachGoal();

    this.hpBar.width = Math.max(0, 190 * (this.hp / HP_MAX));
    this.tokenTxt.setText(String(this.tokenCount));
    const marks = [];
    if (this.revives > 0) marks.push('부활 1');
    if (hero.shield) marks.push('보호막');
    if (hero.magnet) marks.push('자석');
    this.badge.setText(marks.join(' · '));
    const p = Phaser.Math.Clamp(hero.box.x / this.goalX, 0, 1);
    this.progBar.width = 6 + 496 * p;
    this.progIcon.x = 749 + 496 * p;
  }

  // 구멍에 빠졌을 때 — 체력을 깎고 마지막으로 디딘 자리에서 이어 달린다
  fallOut() {
    const hero = this.hero;
    hero.box.setPosition(hero.lastSafeX - 30, hero.lastSafeY - 170);
    hero.box.setVelocity(0, 0);
    hero.jumpsLeft = hero.maxJumps;
    hero.play('surprise', true);
    this.camX = Math.max(0, hero.box.x - 380);
    scrollTo(this, this.camX);
    this.damage(HP_PIT);
    if (!this.over) hero.invulnUntil = this.time.now + 1200;
  }

  reachGoal() {
    this.won = true;
    const hero = this.hero;
    hero.victory();
    this.pet.play(`${this.petId}-pet_cheer`);
    if (this.stage.rescue && this.zz) {
      this.toast('쭈일리언 구출!');
      this.tweens.killTweensOf([this.cage, this.zz]);
      this.tweens.add({ targets: this.cage, y: this.cage.y - 220, alpha: 0, duration: 600 });
      this.tweens.add({ targets: this.zz, y: GROUND_Y - 36, duration: 520, ease: 'Bounce.easeOut' });
      for (let i = 0; i < 3; i++) {
        this.time.delayedCall(i * 170, () => this.sparkle(this.zz.x, this.zz.y - 60));
      }
    } else {
      this.toast('클리어!');
    }
    this.time.delayedCall(1900, () => this.finish(true));
  }

  tileAt(worldX, row) {
    const span = CHUNK_COLS * TILE;
    const ci = Math.floor(worldX / span);
    const ch = this.order[ci];
    if (!ch) return '.';
    const col = Math.floor((worldX - ci * span) / TILE);
    return ch.rows[row][col] || '.';
  }

  autoPlay(time, input) {
    const hero = this.hero;
    const x = hero.box.x;
    const look = hero.speed * 0.42;
    const grounded = hero.body.blocked.down || hero.body.touching.down;

    const hang = this.tileAt(x + 110, 1) === 'h' || this.tileAt(x + 40, 1) === 'h';
    input.slide = hang && grounded;
    if (hang) return;

    let need = false;
    for (let d = 60; d < look; d += 32) {
      if (this.tileAt(x + d, 8) === '.') { need = true; break; }
      if ('smct'.includes(this.tileAt(x + d, 7))) { need = true; break; }
    }
    if (!grounded && hero.body.velocity.y > 140 && this.tileAt(x + 90, 8) === '.') need = true;

    if (need && time - (this.lastAuto || 0) > 130) {
      this.lastAuto = time;
      hero.jumpPressed(time);
      this.time.delayedCall(160, () => hero.jumpReleased());
    }
  }

  updateEnemies(time) {
    this.G.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const kind = e.getData('kind');
      if (kind === 'slime') {
        const home = e.getData('homeX');
        if (e.x < home - 70 && e.body.velocity.x < 0) e.setVelocityX(72);
        if (e.x > home + 70 && e.body.velocity.x > 0) e.setVelocityX(-72);
        e.setFlipX(e.body.velocity.x > 0);
      } else if (kind === 'bee') {
        e.setTexture(Math.floor(time / 80) % 2 ? 'enm-bee1' : 'enm-bee2');
      }
    });
  }

  updateTokens() {
    const hero = this.hero;
    const range = hero.magnet ? 260 : (this.char.stats.magnet || 0);
    if (!range) return;
    const hx = hero.box.x;
    const hy = hero.box.y - 60;
    this.G.tokens.children.iterate((t) => {
      if (!t || !t.active || !t.body) return;
      const d = Phaser.Math.Distance.Between(t.x, t.y, hx, hy);
      if (d < range) {
        t.x = Phaser.Math.Linear(t.x, hx, 0.16);
        t.y = Phaser.Math.Linear(t.y, hy, 0.16);
      }
    });
  }

  updatePet(time, delta) {
    const hero = this.hero;
    this.pet.x = Phaser.Math.Linear(this.pet.x, hero.box.x - 150, 0.07);
    this.pet.y = Phaser.Math.Linear(this.pet.y, hero.box.y, 0.12);
    if (this.won) return;
    this.petTimer += delta;
    if (this.petTimer > 6500) {
      this.petTimer = 0;
      this.pet.play(`${this.petId}-pet_activate`);
      this.pet.once('animationcomplete', () => this.pet.play(`${this.petId}-pet_follow`));
      this.popToken(hero.box.x + 240, hero.box.y - 160);
    }
  }

  updateSonic(time) {
    if (time - this.lastSonic < 3200) return;
    this.lastSonic = time;
    let hit = null;
    this.G.enemies.children.iterate((e) => {
      if (!e || !e.active || hit) return;
      if (e.getData('kind') === 'chestnut') return;
      const d = e.x - this.hero.box.x;
      if (d > 60 && d < 620) hit = e;
    });
    if (hit) { this.sparkle(hit.x, hit.y - 40); this.killEnemy(hit); this.addScore(150); }
  }

  finish(cleared) {
    if (this.over) return;
    this.over = true;
    this.cameras.main.fadeOut(420);
    this.time.delayedCall(460, () => {
      this.scene.start('Result', {
        cleared, score: this.score, tokens: this.tokenCount,
        heroId: this.heroId, petId: this.petId, stageId: this.stage.id,
      });
    });
  }
}
