import {
  W, H, TILE, GROUND_Y, FALL_Y, CHUNK_COLS,
  HP_HIT, HP_PIT, HP_HEART, TOKEN_SCORE, STOMP_SCORE, HERO_H, HERO_SLIDE_H,
  MULT_MAX, MULT_HOLD, MULT_DECAY, MULT_GAIN,
} from '../config.js?v=1792033814';
import { byId, MOTIONS } from '../data/characters.js?v=1792033814';
import { byStage, STAGES } from '../data/stages.js?v=1792033814';
import { rollMissions } from '../data/missions.js?v=1792033814';
import { load, lv, loadGhost, saveGhost, saveDaily } from '../save.js?v=1792033814';
import { todaySeed, todayKey, makeRng } from '../rng.js?v=1792033814';
import { byUp, valueOf } from '../data/upgrades.js?v=1792033814';
import { pickOrder, buildWorld, makeGroups, buildChunk, endlessPick } from '../level/Level.js?v=1792033814';
import { makeGradient } from '../level/textures.js?v=1792033814';
import Hero from '../objects/Hero.js?v=1792033814';
import { setupCamera, scrollTo } from '../hidpi.js?v=1792033814';
import { panel, bar, button } from '../ui.js?v=1792033814';
import { sfx, startMusic, stopMusic, setMusicRate, unlock, setMuted, isMuted } from '../audio.js?v=1792033814';
import { rowY } from '../config.js?v=1792033814';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class PlayScene extends Phaser.Scene {
  constructor() { super('Play'); }

  init(data) {
    this.heroId = data.heroId;
    this.endless = data.stageId === 'endless';
    this.daily = data.stageId === 'daily';
    this.seed = this.daily ? todaySeed() : 0;
    this.stage = this.endless
      ? { id: 'endless', name: '끝없이 달리기', theme: 'forest', chunks: 0,
          diff: [1, 5], sky: ['#9fd8f5', '#e8f7ff'], hint: '어디까지 갈 수 있을까요' }
      : this.daily
        ? { id: 'daily', name: '오늘의 도전', theme: ['forest', 'dessert', 'sky', 'night'][todaySeed() % 4],
            chunks: 22, diff: [2, 5], sky: ['#ffd9b0', '#fff2e0'], hint: '오늘은 모두 같은 길을 달려요' }
        : byStage(data.stageId || 1);
    this.char = byId(this.heroId);
    this.tokenKey = `tok-${this.char.token}`;

    // 올려 둔 능력치를 반영한다
    const up = {
      boostMs: valueOf(byUp('boost'), lv('boost')) * 1000,
      magnetMs: valueOf(byUp('magnet'), lv('magnet')) * 1000,
      giantMs: valueOf(byUp('giant'), lv('giant')) * 1000,
    };
    this.up = up;
    this.hpMax = valueOf(byUp('hp'), lv('hp'));
    this.scoreMul = valueOf(byUp('value'), lv('value'));

    this.score = 0;
    this.tokenCount = 0;
    this.hp = this.hpMax;
    this.revives = valueOf(byUp('revive'), lv('revive'));
    this.over = false;
    this.won = false;

    // 이번 판 미션 세 개
    this.missions = rollMissions(this.endless ? 4 : this.stage.id, load().doneMissions)
      .map((m) => ({ ...m, got: 0, done: false }));
    this.stat = {
      tokens: 0, stomps: 0, doubles: 0, slides: 0, springs: 0,
      bricks: 0, powers: 0, bestCombo: 0, dist: 0, noHit: 1, noPower: 1,
    };
    this.milestone = 0;
    this.mult = 1;
    this.multUntil = 0;
    this.baseScore = 0;    // 배율 없이 번 점수
    this.bonusScore = 0;   // 배율로 더 번 점수
    this.startMs = 0;
    this.trail = [];       // 내 자취 — 최고 기록이면 고스트로 남는다
    this.trailAt = 0;
  }

  preload() {
    // ?lite=1 — 모션을 최소만 싣는다. 느린 환경에서 화면만 확인할 때 쓴다
    this.lite = new URLSearchParams(location.search).has('lite');
    const list0 = this.lite ? ['idle', 'run', 'jump', 'land'] : MOTIONS;
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
    load(this.heroId, list0);
    if (this.stage.rescue) load('zzulien', ['idle']);
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
    const list0 = this.lite ? ['idle', 'run', 'jump', 'land'] : MOTIONS;
    this.makeAnims(this.heroId, list0);
    if (this.stage.rescue) this.makeAnims('zzulien', ['idle']);

    if (this.endless) {
      this.G = makeGroups(this);
      this.order = [];
      this.built = new Map();
      this.recent = [];
      this.worldW = 1e7;
      this.goalX = 1e7;
      this.ensureAhead(0);
    } else {
      this.order = pickOrder(this.stage, this.seed);
      const { groups, width, goalX } = buildWorld(this, this.order, this.stage, this.tokenKey);
      this.G = groups;
      this.worldW = width;
      this.goalX = goalX;
    }

    this.physics.world.setBounds(0, -500, this.worldW, H + 900);
    setupCamera(this);
    this.camX = 0;

    this.drawBackground();
    if (!this.endless && !this.daily) this.drawGoal();
    if (this.stage.rescue) this.setupBoss();

    const heroMeta = this.cache.json.get(`meta-${this.heroId}`).anims;
    this.hero = new Hero(this, 180, GROUND_Y, this.char, heroMeta);

    this.setupGhost();
    this.shadow = this.add.image(0, 0, 'fx_shadow').setDepth(5).setAlpha(0.5);
    this.combo = 0;
    this.comboUntil = 0;

    this.bindCollisions();
    this.buildHUD();
    this.bindInput();
    this.showBanner();
    startMusic(this.stage.theme);
    this.events.once('shutdown', () => stopMusic());

    const q = new URLSearchParams(location.search);
    this.freeze = q.has('freeze');
    this.auto = q.has('auto');
    this.wasGround = true;
    this.lastSonic = 0;
    scrollTo(this, 0);
    this.startMs = this.time.now;
    this.cameras.main.fadeIn(180);
  }

  // 끝없이 달리기 — 앞쪽을 미리 깔고 지나간 자리는 치운다
  ensureAhead(x) {
    const span = CHUNK_COLS * TILE;
    const head = Math.floor(x / span) + 4;
    while (this.order.length <= head) {
      const i = this.order.length;
      const ch = endlessPick(i, this.recent);
      this.recent.push(ch.id);
      if (this.recent.length > 3) this.recent.shift();
      this.order.push(ch);
      const r = buildChunk(this, this.G, ch, i, this.stage, this.tokenKey);
      this.built.set(i, r.made);
    }
    const tail = Math.floor(x / span) - 3;
    for (const [i, made] of this.built) {
      if (i >= tail) continue;
      made.forEach((o) => o.destroy());
      this.built.delete(i);
    }
  }

  // 스테이지 이름을 잠깐 띄운다
  showBanner() {
    const t1 = this.add.text(W / 2, H / 2 - 40, `${this.stage.id}. ${this.stage.name}`, {
      fontFamily: FONT, fontSize: '62px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 12,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(70).setAlpha(0);
    const t2 = this.add.text(W / 2, H / 2 + 24, this.stage.hint, {
      fontFamily: FONT, fontSize: '22px', fontStyle: '700', color: '#6b4a3a',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(70).setAlpha(0);
    this.tweens.add({ targets: [t1, t2], alpha: 1, y: '-=16', duration: 420, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: [t1, t2], alpha: 0, delay: 1500, duration: 460,
      onComplete: () => { t1.destroy(); t2.destroy(); },
    });
  }

  // 발밑에 깔 지면 높이. 없으면 null
  groundYAt(x) {
    if (this.tileAt(x, 8) === 'G') return GROUND_Y;
    for (let r = 7; r >= 2; r--) if (this.tileAt(x, r) === '=') return rowY(r) + 16;
    return null;
  }

  updateShadow() {
    const hero = this.hero;
    const gy = this.groundYAt(hero.box.x);
    if (gy === null || hero.locked) { this.shadow.setVisible(false); return; }
    const drop = Phaser.Math.Clamp((gy - hero.box.y) / 300, 0, 1);
    this.shadow.setVisible(true);
    this.shadow.setPosition(hero.box.x, gy - 4);
    this.shadow.setScale((1 - drop * 0.45) * (hero.giant ? 1.5 : 1), 1 - drop * 0.45);
    this.shadow.setAlpha(0.5 - drop * 0.3);
  }

  // ── 배경 ───────────────────────────────────────────────
  drawBackground() {
    const [c1, c2] = this.stage.sky;
    const th = this.stage.theme;
    makeGradient(this, 'sky_play', W, H, c1, c2);
    this.add.image(0, 0, 'sky_play').setOrigin(0, 0).setScrollFactor(0).setDepth(-30);

    const P = {
      forest: { far: 0x9ec4a6, hill: 0xbfe8c0, hill2: 0xa8dcae, tree: 0x9ed89a, bush: 0xb4e2b8 },
      dessert: { far: 0xe4c49a, hill: 0xf6dcb2, hill2: 0xeccb9a, tree: 0xffd9a8, bush: 0xffe8c8 },
      sky: { far: 0xc6d8f2, hill: 0xdcebff, hill2: 0xc8ddf8, tree: 0xffffff, bush: 0xeef5ff },
      night: { far: 0x3f3858, hill: 0x5f5578, hill2: 0x4e4566, tree: 0x4a4266, bush: 0x565073 },
    }[th];

    // 해 또는 달과 별
    if (th === 'night') {
      this.add.image(1110, 130, 'bg_moon').setScrollFactor(0.06).setDepth(-29).setScale(0.9);
      for (let i = 0; i < 70; i++) {
        const st = this.add.circle(Math.random() * W, Math.random() * 420,
          1.2 + Math.random() * 2.2, 0xffffff, 0.5 + Math.random() * 0.5)
          .setScrollFactor(0.06).setDepth(-29);
        this.tweens.add({
          targets: st, alpha: 0.2, duration: 900 + Math.random() * 1800,
          yoyo: true, repeat: -1, delay: Math.random() * 1200,
        });
      }
    } else {
      this.add.circle(1118, 122, 60, 0xfff6c9, 0.9).setScrollFactor(0.06).setDepth(-29);
      this.add.circle(1118, 122, 86, 0xfff6c9, 0.25).setScrollFactor(0.06).setDepth(-29);
    }

    // 먼 산
    for (let i = 0; i < 26; i++) {
      this.add.image(i * 560 + 100, GROUND_Y + 30, 'bg_far')
        .setOrigin(0.5, 1).setScrollFactor(0.12).setDepth(-28)
        .setScale(1.1 + (i % 2) * 0.3, 0.8).setTint(P.far).setAlpha(0.85);
    }

    // 구름
    const cloudTint = th === 'night' ? 0x8e86a8 : 0xffffff;
    for (let i = 0; i < 34; i++) {
      this.add.image(i * 460 + 120, 100 + (i % 4) * 44, 'bg_cloud')
        .setScrollFactor(0.22).setDepth(-26)
        .setScale(0.7 + (i % 3) * 0.25).setTint(cloudTint)
        .setAlpha(th === 'night' ? 0.55 : 0.95);
    }

    // 언덕 두 겹
    for (let i = 0; i < 60; i++) {
      this.add.image(i * 300 + 40, GROUND_Y + 24, 'bg_hill')
        .setOrigin(0.5, 1).setScrollFactor(0.4).setDepth(-24)
        .setScale(0.8 + (i % 3) * 0.2, 0.5).setTint(P.hill2);
    }
    for (let i = 0; i < 70; i++) {
      this.add.image(i * 250 + 120, GROUND_Y + 30, 'bg_hill')
        .setOrigin(0.5, 1).setScrollFactor(0.62).setDepth(-22)
        .setScale(0.6 + (i % 3) * 0.16, 0.4).setTint(P.hill);
    }

    // 나무와 덤불
    for (let i = 0; i < 48; i++) {
      const x = i * 340 + 180;
      this.add.image(x, GROUND_Y + 4, 'bg_tree')
        .setOrigin(0.5, 1).setScrollFactor(0.82).setDepth(-20)
        .setScale(0.7 + (i % 3) * 0.15).setTint(P.tree);
    }
    for (let i = 0; i < 70; i++) {
      this.add.image(i * 230 + 60, GROUND_Y + 6, 'bg_bush')
        .setOrigin(0.5, 1).setScrollFactor(0.9).setDepth(-19)
        .setScale(0.55 + (i % 3) * 0.2).setTint(P.bush);
    }
  }

  // 먹구름성 끝 — 꾸르릉이 앞서 달아나며 번개를 떨군다
  setupBoss() {
    this.bossHp = 3;
    this.bossDown = false;
    this.bossNext = 0;
    this.bossAt = this.goalX - 2400;        // 이 지점부터 나타난다
    this.boss = this.add.image(0, 150, 'boss').setScale(0.58).setDepth(12).setVisible(false);
    this.bolts = this.physics.add.group({ allowGravity: false });
    this.physics.add.overlap(this.hero.box, this.bolts, (box, b) => {
      if (!b.active) return;
      b.destroy();
      this.lastCause = '번개';
      this.damage(HP_HIT);
    });
    this.bossBarG = this.add.graphics().setScrollFactor(0).setDepth(58).setVisible(false);
  }

  updateBoss(time, delta) {
    if (!this.boss || this.bossHp <= 0) return;
    const hero = this.hero;
    if (hero.box.x < this.bossAt) return;
    if (!this.boss.visible) {
      this.boss.setVisible(true);
      this.bossBarG.setVisible(true);
      this.toast('꾸르릉이 나타났어요!');
      this.cameras.main.shake(400, 0.006);
    }

    // 평소엔 높이 떠 있고, 가끔 내려와 밟을 틈을 준다
    const lowTime = this.bossDown;
    const tx = hero.box.x + 420;
    const ty = lowTime ? GROUND_Y - 150 : 180;
    this.boss.x = Phaser.Math.Linear(this.boss.x || tx, tx, 0.08);
    this.boss.y = Phaser.Math.Linear(this.boss.y, ty, 0.06);

    if (time > this.bossNext) {
      if (this.bossDown) {
        this.bossDown = false;
        this.bossNext = time + 3400;
      } else {
        // 번개를 몇 발 떨군 뒤 내려온다
        for (let i = 0; i < 3; i++) {
          this.time.delayedCall(i * 260, () => this.dropBolt());
        }
        this.bossDown = true;
        this.bossNext = time + 2600;
      }
    }

    // 내려와 있을 때만 밟힌다
    if (this.bossDown && !this.bossHit) {
      const dx = Math.abs(hero.box.x - this.boss.x);
      const top = this.boss.y - this.boss.displayHeight / 2;
      if (dx < 90 && hero.body.velocity.y > 60 && hero.box.y < top + 60) {
        this.hitBoss();
      }
    }

    // 체력 막대
    this.bossBarG.clear();
    const w = 420;
    this.bossBarG.fillStyle(0x2f2740, 0.85);
    this.bossBarG.fillRoundedRect(W / 2 - w / 2, 102, w, 26, 13);
    this.bossBarG.fillStyle(0xff7fa4, 1);
    this.bossBarG.fillRoundedRect(W / 2 - w / 2 + 4, 106, (w - 8) * (this.bossHp / 3), 18, 9);
  }

  dropBolt() {
    if (!this.bolts || this.bossHp <= 0) return;
    const x = this.hero.box.x + 240 + Math.random() * 420;
    const b = this.bolts.create(x, 40, 'boss_bolt').setScale(0.7).setDepth(11);
    b.body.setSize(34, 70).setOffset(7, 10);
    b.setVelocityY(560);
    this.time.delayedCall(2600, () => { if (b.active) b.destroy(); });
  }

  hitBoss() {
    this.bossHit = true;
    this.bossHp--;
    this.hero.stomp(1.15);
    this.hitStop(110);
    this.cameras.main.shake(260, 0.01);
    this.sparkle(this.boss.x, this.boss.y, 9, 'fx_star');
    this.hitMark(this.boss.x, this.boss.y);
    this.addScore(3000);
    this.bumpMult('stomp');
    sfx.stomp();
    this.tweens.add({ targets: this.boss, alpha: 0.3, duration: 90, yoyo: true, repeat: 2 });
    this.time.delayedCall(700, () => { this.bossHit = false; });
    this.bossDown = false;
    this.bossNext = this.time.now + 2200;

    if (this.bossHp <= 0) {
      this.bossBarG.setVisible(false);
      this.toast('꾸르릉을 물리쳤어요!');
      this.tweens.add({
        targets: this.boss, y: -300, angle: 220, alpha: 0, duration: 1200,
        onComplete: () => this.boss.destroy(),
      });
      this.bolts.clear(true, true);
      sfx.goal();
    }
  }

  drawGoal() {
    const x = this.goalX;
    if (this.stage.rescue) {
      this.cage = this.add.image(x, GROUND_Y - 150, 'i_cage').setDepth(3);
      const pm = this.cache.json.get('meta-zzulien').anims.idle;
      this.zz = this.add.sprite(x, GROUND_Y - 104, 'zzulien-idle')
        .setOrigin(pm.origin.x, pm.origin.y).setScale(0.5).setDepth(4);
      this.zz.play('zzulien-idle');
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
        this.hitStop(45);
        sfx.bump();
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
      this.tally('springs');
      this.bumpMult('spring');
      sfx.spring();
      this.tweens.add({ targets: sp, scaleY: 0.28, duration: 90, yoyo: true });
      this.sparkle(sp.x, sp.y - 40);
    });

    this.physics.add.overlap(hero.box, this.G.puddles, (box, pd) => {
      if (!hero.slipping) { hero.slip(this.time.now); sfx.slip(); this.splash(pd.x, pd.y - 10); }
    });
  }

  canSmash() {
    const h = this.hero;
    return h.giant || h.boosting || (h.sliding && this.char.stats.slideBreak);
  }

  breakBrick(b) {
    this.tally('bricks');
    this.bumpMult('brick');
    this.hitStop(40);
    this.cameras.main.shake(70, 0.003);
    sfx.break_();
    this.puff(b.x, b.y);
    this.hitMark(b.x, b.y);
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
    this.tally('tokens');
    this.bumpMult('token');
    sfx.token(this.combo);
    const mul = this.bumpCombo(this.time.now);
    this.addScore(Math.round(TOKEN_SCORE * (this.char.stats.token || 1) * mul * this.scoreMul));
    this.hp = Math.min(this.hpMax, this.hp + HP_HEART);
    this.sparkle(t.x, t.y, 3);
  }

  takePower(p) {
    const kind = p.getData('kind');
    p.destroy();
    const now = this.time.now;
    const hero = this.hero;
    hero.powerUp();
    this.bumpMult('power');
    this.stat.noPower = 0;
    this.tally('powers');
    if (kind === 'heal') sfx.heal(); else sfx.power();
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
    if (kind === 'heal') { this.hp = Math.min(this.hpMax, this.hp + 40); this.heartUp(hero.x, hero.y - 100); }
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
      || (kind === 'ghost' && e.alpha > 0.7);
    if (stompable && stomping) {
      // 벌은 더 높이 튕긴다. 구멍을 건너는 발판으로 쓰라고 둔 것이다
      this.killEnemy(e, kind === 'slime', kind === 'bee' ? 2 : 1);
      hero.stomp(kind === 'bee' ? 1.25 : 1);
      this.bumpMult('stomp');
      this.hitStop(55 + Math.min(hero.stompChain, 4) * 10);
      this.cameras.main.shake(90, 0.004);
      sfx.stomp();
      this.hitMark(e.x, top + 10);
      const i = Math.min(hero.stompChain, STOMP_SCORE.length - 1);
      const add = STOMP_SCORE[i];
      this.addScore(add);
      this.floatText(e.x, top, `+${add}`);
      hero.stompChain++;
      this.tally('stomps');
      // 이어 밟을수록 크게 돌려준다
      if (hero.stompChain >= 3) {
        this.chainMark(e.x, top - 40, hero.stompChain);
        this.hp = Math.min(this.hpMax, this.hp + 4);
      }
      return;
    }
    this.lastCause = { slime: '슬라임', bee: '벌', ghost: '유령', chestnut: '밤송이' }[kind] || '적';
    this.damage(HP_HIT, kind === 'chestnut');
  }

  touchHazard(o) {
    if (this.hero.locked) return;
    if (o.getData('kind') === 'hang' && this.hero.sliding) return;
    this.lastCause = { spike: '가시', hang: '매달린 것', tall: '높은 기둥' }[o.getData('kind')] || '장애물';
    this.damage(HP_HIT, o.getData('kind') === 'spike');
  }

  killEnemy(e, squash = false, drop = 0) {
    if (drop > 0 && this.char.stats.luck && Math.random() < this.char.stats.luck) drop += 1;
    for (let i = 0; i < drop; i++) {
      this.popToken(e.x + (i - (drop - 1) / 2) * 34, e.y - e.displayHeight * 0.6);
    }
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

    const lost = this.mult;
    this.hp -= amount;
    this.stat.noHit = 0;
    sfx.hurt();
    this.combo = 0;
    this.mult = 1;
    this.multUntil = 0;
    if (lost >= 1.8) this.floatText(hero.x, hero.y - 150, `×${lost.toFixed(1)} 날아감`);
    this.hitStop(90);
    this.cameras.main.shake(190, 0.009);
    this.sparkle(hero.x, hero.y - 90, 5, 'fx_star');
    if (this.hp > 0) {
      if (stun) hero.stun(this.time.now); else hero.hurt(this.time.now);
      return;
    }

    this.hp = 0;
    this.stat.dist = Math.max(this.stat.dist, Math.floor(hero.box.x / 10));
    if (this.revives > 0) {
      this.revives--;
      hero.down(() => { this.hp = Math.round(this.hpMax * 0.5); sfx.revive(); this.toast('한 번 더!'); });
    } else {
      hero.gameOver();
      stopMusic();
      sfx.fail();
      this.finish(false);
    }
  }

  // ── HUD ────────────────────────────────────────────────
  buildHUD() {
    panel(this, 16, 14, 280, 78);
    this.add.image(46, 53, `base-${this.heroId}`).setScale(0.085)
      .setScrollFactor(0).setDepth(51);
    this.add.text(78, 24, this.char.name, {
      fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#8a6a56',
    }).setScrollFactor(0).setDepth(51);
    this.hpBar = bar(this, 78, 46, 200, 22, 0xff7fa4);
    this.badge = this.add.text(78, 70, '', {
      fontFamily: FONT, fontSize: '12px', fontStyle: '700', color: '#8a6a56',
    }).setScrollFactor(0).setDepth(52);

    panel(this, 312, 14, 176, 78);
    this.add.image(342, 53, this.tokenKey).setScale(0.17).setScrollFactor(0).setDepth(51);
    this.tokenTxt = this.add.text(370, 36, '0', {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: '#6b4a3a',
    }).setScrollFactor(0).setDepth(51);

    panel(this, 504, 14, 238, 78);
    this.add.text(520, 24, 'SCORE', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#9a7b68',
    }).setScrollFactor(0).setDepth(51);
    this.scoreTxt = this.add.text(520, 42, '000000', {
      fontFamily: FONT, fontSize: '30px', fontStyle: '900', color: '#6b4a3a',
    }).setScrollFactor(0).setDepth(51);

    panel(this, 758, 14, 506, 78);
    this.add.text(774, 24, this.endless ? '끝없이 달리기' : `${this.stage.id}. ${this.stage.name}`, {
      fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#9a7b68',
    }).setScrollFactor(0).setDepth(51);
    this.progTrack = bar(this, 774, 46, 474, 26, 0xffd977);
    this.progTrack.draw(0);
    this.progIcon = this.add.image(780, 59, `base-${this.heroId}`)
      .setScale(0.05).setScrollFactor(0).setDepth(53);
    this.timeTxt = this.add.text(1248, 68, '0.0초', {
      fontFamily: FONT, fontSize: '15px', fontStyle: '900', color: '#8a6a56',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(53);
    this.distTxt = this.add.text(1248, 24, '0m', {
      fontFamily: FONT, fontSize: '16px', fontStyle: '900', color: '#8a6a56',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(53);
    this.add.image(1240, 59, 'i_flag').setScale(0.1).setScrollFactor(0).setDepth(52);

    // 점수 배율 — 가운데 위에 크게. 유지 시간이 줄어드는 게 보여야 한다
    this.multTxt = this.add.text(W / 2, 104, '', {
      fontFamily: FONT, fontSize: '46px', fontStyle: '900', color: '#ffd977',
      stroke: '#7b5a48', strokeThickness: 9,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(58).setAlpha(0);
    this.multBarG = this.add.graphics().setScrollFactor(0).setDepth(58);

    // 콤보
    this.comboTxt = this.add.text(W / 2, 150, '', {
      fontFamily: FONT, fontSize: '36px', fontStyle: '900', color: '#ffd977',
      stroke: '#7b5a48', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(60).setAlpha(0);

    // 파워업 남은 시간
    this.powerSlots = [];
    for (let i = 0; i < 3; i++) {
      const x = 20 + i * 96;
      const g = panel(this, x, H - 92, 88, 70, { depth: 50 });
      const icon = this.add.image(x + 44, H - 68, 'pw-boost')
        .setScale(0.2).setScrollFactor(0).setDepth(51);
      const b = bar(this, x + 10, H - 42, 68, 12, 0x7fd4ff, { depth: 51 });
      const slot = { g, icon, bar: b, show: false };
      [g, icon, b.back, b.fill].forEach((o) => o.setVisible(false));
      this.powerSlots.push(slot);
    }

    // 이번 판 미션 세 개
    this.missionUI = this.missions.map((m, i) => {
      const y = H - 112 + i * 32;
      const g = this.add.graphics().setScrollFactor(0).setDepth(50);
      g.fillStyle(0xffffff, 0.86);
      g.fillRoundedRect(W - 358, y, 344, 28, 10);
      g.lineStyle(3, 0x7b5a48, 0.9);
      g.strokeRoundedRect(W - 358, y, 344, 28, 10);
      const t = this.add.text(W - 346, y + 5, m.text, {
        fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#7b5a48',
      }).setScrollFactor(0).setDepth(51);
      const n = this.add.text(W - 24, y + 5, '', {
        fontFamily: FONT, fontSize: '14px', fontStyle: '900', color: '#b08a4a',
      }).setOrigin(1, 0).setScrollFactor(0).setDepth(51);
      return { m, g, t, n, y };
    });

    this.toastTxt = this.add.text(W / 2, 162, '', {
      fontFamily: FONT, fontSize: '42px', fontStyle: '900', color: '#ffffff',
      stroke: '#e2577f', strokeThickness: 9,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(62).setAlpha(0);

    this.hint = this.add.text(W / 2, H - 30,
      'Space 점프(공중에서 한 번 더) · ↓ 슬라이드', {
        fontFamily: FONT, fontSize: '16px', fontStyle: '700', color: '#6b4a3a',
        backgroundColor: '#ffffffcc', padding: { x: 14, y: 6 },
      }).setOrigin(0.5).setScrollFactor(0).setDepth(55);
    this.tweens.add({ targets: this.hint, alpha: 0, delay: 5000, duration: 700 });
  }

  // 빠를 때 화면 가장자리로 선이 지나간다
  updateSpeedLines(time) {
    const hero = this.hero;
    const fast = hero.boosting || hero.speed > 640;
    if (!fast) return;
    if (time - (this.lastLine || 0) < (hero.boosting ? 45 : 110)) return;
    this.lastLine = time;
    const y = 120 + Math.random() * (H - 260);
    const len = 90 + Math.random() * 140;
    const g = this.add.rectangle(W + 40, y, len, 3 + Math.random() * 3, 0xffffff,
      hero.boosting ? 0.55 : 0.3).setOrigin(0, 0.5).setScrollFactor(0).setDepth(45);
    this.tweens.add({
      targets: g, x: -len - 40, duration: hero.boosting ? 300 : 460,
      onComplete: () => g.destroy(),
    });
  }

  // 지금 걸린 파워업을 아이콘과 남은 시간으로 보여 준다
  updatePowerSlots(now) {
    const hero = this.hero;
    const live = [];
    if (hero.boosting) live.push(['pw-boost', (hero.boostUntil - now) / 3000, 0x7fd4ff]);
    if (hero.giant) live.push(['pw-giant', (hero.giantUntil - now) / 6000, 0xffb34d]);
    if (hero.magnet) live.push(['pw-magnet', (hero.magnetUntil - now) / 7000, 0xff9ebd]);
    if (hero.shield) live.push(['pw-shield', 1, 0xa8e6a3]);
    if (hero.bonusAir) live.push(['pw-double', 1, 0xc9a7e8]);

    this.powerSlots.forEach((slot, i) => {
      const on = i < live.length;
      [slot.g, slot.icon, slot.bar.back, slot.bar.fill].forEach((o) => o.setVisible(on));
      if (!on) return;
      const [key, ratio, color] = live[i];
      slot.icon.setTexture(key);
      slot.bar.fill.clear();
      const x = 20 + i * 96;
      const ww = Math.max(0, 62 * Phaser.Math.Clamp(ratio, 0, 1));
      if (ww > 0) {
        slot.bar.fill.fillStyle(color, 1);
        slot.bar.fill.fillRoundedRect(x + 13, H - 39, ww, 6, 3);
      }
    });
  }

  // 미션 진행도를 올리고 달성하면 바로 알려 준다
  tally(stat, n = 1) {
    if (this.stat[stat] === undefined) return;
    if (stat === 'bestCombo') this.stat.bestCombo = Math.max(this.stat.bestCombo, n);
    else if (stat === 'dist') this.stat.dist = Math.max(this.stat.dist, n);
    else this.stat[stat] += n;
    for (const m of this.missions) {
      if (m.done) continue;
      m.got = this.stat[m.stat] || 0;
      if (m.got >= m.need) {
        m.done = true;
        sfx.power();
        this.missionToast(m);
      }
    }
  }

  missionToast(m) {
    const y = 210 + this.missions.indexOf(m) * 6;
    const g = this.add.container(W, y).setScrollFactor(0).setDepth(66);
    const bg = this.add.graphics();
    bg.fillStyle(0x7b5a48, 0.25); bg.fillRoundedRect(3, 5, 430, 56, 16);
    bg.fillStyle(0xffd977, 1); bg.fillRoundedRect(0, 0, 430, 56, 16);
    bg.lineStyle(4, 0x7b5a48, 1); bg.strokeRoundedRect(0, 0, 430, 56, 16);
    const t1 = this.add.text(18, 10, '미션 완료', {
      fontFamily: FONT, fontSize: '12px', fontStyle: '900', color: '#b07a20',
    });
    const t2 = this.add.text(18, 26, m.text, {
      fontFamily: FONT, fontSize: '17px', fontStyle: '900', color: '#6b4a3a',
    });
    const st = this.add.text(408, 28, '★'.repeat(m.star), {
      fontFamily: FONT, fontSize: '20px', fontStyle: '900', color: '#ff9f1c',
    }).setOrigin(1, 0.5);
    g.add([bg, t1, t2, st]);
    this.tweens.add({ targets: g, x: W - 452, duration: 380, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: g, x: W + 20, delay: 2200, duration: 340,
      onComplete: () => g.destroy(),
    });
  }

  // 거리를 넘길 때마다 한 번씩 띄운다
  checkMilestone() {
    const m = Math.floor(this.hero.box.x / 10);
    const next = (this.milestone + 1) * 500;
    if (m < next) return;
    this.milestone++;
    this.addScore(300 * this.milestone);
    sfx.goal();
    const t = this.add.text(W / 2, 250, `${next}m 돌파!`, {
      fontFamily: FONT, fontSize: '52px', fontStyle: '900', color: '#ffffff',
      stroke: '#ff9f1c', strokeThickness: 10,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(66).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, alpha: 0, y: 210, delay: 900, duration: 420,
      onComplete: () => t.destroy(),
    });
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 110, () => this.sparkle(
        W / 2 + (Math.random() - 0.5) * 320 + this.cameras.main.scrollX,
        250 + (Math.random() - 0.5) * 80, 6, 'fx_star'));
    }
  }

  // 최고 기록을 넘기는 순간
  checkBest() {
    if (this.beatBest) return;
    const best = this.endless ? load().bestDist : (load().best[this.stage.id] || 0);
    const cur = this.endless ? Math.floor(this.hero.box.x / 10) : this.score;
    if (!best || cur <= best) return;
    this.beatBest = true;
    sfx.power();
    this.toast('최고 기록 넘었어요!');
    this.cameras.main.flash(260, 255, 240, 190);
  }

  // 적극적인 행동마다 배율이 오른다
  bumpMult(kind) {
    let g = MULT_GAIN[kind] || 0.1;
    if (kind === 'brick' && this.char.stats.brickMult) g = this.char.stats.brickMult;
    this.mult = Math.min(MULT_MAX, this.mult + g);
    this.multUntil = this.time.now + MULT_HOLD + (this.char.stats.holdBonus || 0);
    if (this.mult > (this.peakMult || 1)) this.peakMult = this.mult;
  }

  updateMult(time, delta) {
    if (this.mult > 1 && time >= this.multUntil) {
      this.mult = Math.max(1, this.mult - delta * MULT_DECAY);
    }
    // 잘 풀릴수록 음악이 빨라진다
    const want = 1 + (this.mult - 1) / (MULT_MAX - 1) * 0.32
      + (this.hero.boosting ? 0.08 : 0);
    setMusicRate(want);
  }

  bumpCombo(now) {
    this.combo = now < this.comboUntil ? this.combo + 1 : 1;
    this.comboUntil = now + 1500;
    this.tally('bestCombo', this.combo);
    if (this.combo < 3) return 1;
    const mul = 1 + Math.min(this.combo, 20) * 0.1;
    this.comboTxt.setText(`${this.combo} 연속`).setAlpha(1).setScale(0.8);
    this.tweens.killTweensOf(this.comboTxt);
    this.tweens.add({ targets: this.comboTxt, scale: 1, duration: 160, ease: 'Back.easeOut' });
    this.tweens.add({ targets: this.comboTxt, alpha: 0, delay: 1100, duration: 400 });
    return mul;
  }

  // 번 점수는 기본과 배율분으로 나눠 센다. 결과 화면에서 어디서 났는지 보여 준다.
  addScore(n, useMult = true) {
    let m = useMult ? this.mult : 1;
    if (useMult && this.hero.boosting && this.char.stats.boostMult) m *= this.char.stats.boostMult;
    const got = Math.round(n * m);
    this.baseScore += n;
    this.bonusScore += got - n;
    this.score += got;
    this.scoreTxt.setText(String(this.score).padStart(6, '0'));
    return got;
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

  sparkle(x, y, n = 5, key = 'fx_sparkle') {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 40 + Math.random() * 40;
      const s = this.add.image(x, y, key)
        .setScale(0.14 + Math.random() * 0.14).setDepth(8)
        .setAngle(Math.random() * 360);
      this.tweens.add({
        targets: s, x: x + Math.cos(a) * r, y: y + Math.sin(a) * r,
        angle: s.angle + 180, scale: 0, alpha: 0,
        duration: 380 + Math.random() * 260, ease: 'Quad.easeOut',
        onComplete: () => s.destroy(),
      });
    }
  }

  // 이어 밟기 표시
  chainMark(x, y, n) {
    const t = this.add.text(x, y, `${n}연속!`, {
      fontFamily: FONT, fontSize: `${22 + Math.min(n, 8) * 3}px`, fontStyle: '900',
      color: '#ffffff', stroke: '#ff9f1c', strokeThickness: 7,
    }).setOrigin(0.5).setDepth(42).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 170, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: y - 60, alpha: 0, delay: 360, duration: 480,
      onComplete: () => t.destroy(),
    });
    this.sparkle(x, y, 4, 'fx_star');
    if (n >= 5) this.cameras.main.flash(140, 255, 236, 180);
  }

  togglePause() {
    if (this.over) return;
    if (this.paused) { this.resumeGame(); return; }
    this.paused = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    stopMusic();

    const g = this.add.container(0, 0).setScrollFactor(0).setDepth(80);
    const dim = this.add.rectangle(0, 0, W, H, 0x2b2436, 0.72).setOrigin(0, 0);
    const t = this.add.text(W / 2, 240, '잠깐 멈춤', {
      fontFamily: FONT, fontSize: '56px', fontStyle: '900', color: '#ffffff',
      stroke: '#7b5a48', strokeThickness: 11,
    }).setOrigin(0.5);
    const hint = this.add.text(W / 2, 306, 'Esc · P 로 이어서 · M 으로 소리 끄고 켜기', {
      fontFamily: FONT, fontSize: '17px', fontStyle: '700', color: '#ffe6c0',
    }).setOrigin(0.5);
    g.add([dim, t, hint]);
    this.pauseUI = g;

    const b1 = button(this, W / 2 - 170, 420, 300, 68, '이어서 하기',
      () => this.resumeGame(), { size: '24px' });
    const b2 = button(this, W / 2 + 170, 420, 300, 68, '그만두기',
      () => { this.cleanupPause(); this.scene.start('Stage'); },
      { size: '24px', fill: 0xffffff, hover: 0xfff2d0 });
    [b1, b2].forEach((b) => {
      b.g.setScrollFactor(0).setDepth(81);
      b.t.setScrollFactor(0).setDepth(82);
      b.zone.setScrollFactor(0);
    });
    this.pauseBtns = [b1, b2];
  }

  cleanupPause() {
    if (this.pauseUI) { this.pauseUI.destroy(); this.pauseUI = null; }
    if (this.pauseBtns) {
      this.pauseBtns.forEach((b) => { b.g.destroy(); b.t.destroy(); b.zone.destroy(); });
      this.pauseBtns = null;
    }
    this.paused = false;
  }

  resumeGame() {
    this.cleanupPause();
    this.physics.world.resume();
    this.anims.resumeAll();
    startMusic(this.stage.theme);
  }

  // 아주 짧게 멈춘다. 눈에는 안 보이고 손에만 걸리는 게 맞는 길이다.
  hitStop(ms) {
    if (this.stopping || this.over || this.paused) return;
    this.stopping = true;
    this.physics.world.pause();
    this.anims.pauseAll();
    window.setTimeout(() => {
      if (!this.scene || !this.scene.isActive() || this.paused) { this.stopping = false; return; }
      this.physics.world.resume();
      this.anims.resumeAll();
      this.stopping = false;
    }, ms);
  }

  // 밟거나 부술 때 터지는 표시
  hitMark(x, y) {
    const h = this.add.image(x, y, 'fx_hit').setScale(0.2).setDepth(9);
    this.tweens.add({
      targets: h, scale: 0.52, alpha: 0, duration: 300,
      ease: 'Quad.easeOut', onComplete: () => h.destroy(),
    });
  }

  // 회복했을 때 떠오르는 하트
  heartUp(x, y) {
    for (let i = 0; i < 3; i++) {
      const h = this.add.image(x + (i - 1) * 26, y, 'fx_heart').setScale(0.16).setDepth(9);
      this.tweens.add({
        targets: h, y: y - 90 - i * 14, alpha: 0, duration: 760,
        delay: i * 90, onComplete: () => h.destroy(),
      });
    }
  }

  // 물에 닿았을 때 튀는 물방울
  splash(x, y) {
    for (let i = 0; i < 6; i++) {
      const d = this.add.image(x, y, 'fx_drop').setScale(0.12).setDepth(9);
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2;
      this.tweens.add({
        targets: d, x: x + Math.cos(a) * 70, y: y + Math.sin(a) * 60, alpha: 0,
        scale: 0.05, duration: 460, onComplete: () => d.destroy(),
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
    const press = () => { unlock(); if (!this.over) this.hero.jumpPressed(this.time.now); };
    const release = () => this.hero.jumpReleased();
    k.on('keydown-SPACE', press);
    k.on('keydown-UP', press);
    k.on('keyup-SPACE', release);
    k.on('keyup-UP', release);
    k.on('keydown-ESC', () => this.togglePause());
    k.on('keydown-P', () => this.togglePause());
    k.on('keydown-M', () => { setMuted(!isMuted()); this.toast(isMuted() ? '소리 끔' : '소리 켬'); });

    this.touchSlide = false;
    this.input.on('pointerdown', (p) => {
      if (this.over) return;
      if (p.x > W / 2) press(); else this.touchSlide = true;
    });
    const letGo = () => { this.touchSlide = false; release(); };
    this.input.on('pointerup', letGo);
    this.input.on('pointerupoutside', letGo);
    this.input.on('gameout', letGo);
    // 씬을 넘어오며 눌린 상태가 남는 걸 막는다
    k.resetKeys();
  }

  // ── 루프 ───────────────────────────────────────────────
  update(time, delta) {
    const hero = this.hero;
    if (!hero || this.paused) return;

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
    if (!grounded) this.lastFallV = hero.body.velocity.y;
    if (grounded && !this.wasGround && !hero.locked) {
      hero.playOnce('land');
      // 빠르게 떨어졌을수록 크게 눌린다
      const vy = Math.abs(this.lastFallV || 0);
      const k = Phaser.Math.Clamp(vy / 1400, 0.25, 1);
      hero.squash(1 + 0.34 * k, 1 - 0.3 * k);
      if (k > 0.65) this.cameras.main.shake(70, 0.0025);
      sfx.land();
      this.puff(hero.x, hero.y);
      hero.stompChain = 0;
    }
    this.wasGround = grounded;

    // 속도가 붙을수록 캐릭터를 왼쪽으로 밀어 앞을 더 보여 준다
    const t = Phaser.Math.Clamp((hero.speed - 470) / 400, 0, 1);
    const lead = 360 - t * 110;
    const want = Phaser.Math.Clamp(hero.box.x - lead, 0, this.worldW - W);
    this.camX = Phaser.Math.Linear(this.camX, want, 0.2);
    scrollTo(this, this.camX);

    if (this.endless) this.ensureAhead(hero.box.x);
    if (this.boss) this.updateBoss(time, delta);
    this.recordTrail(time);
    this.updateGhost(time);
    this.countSlidePass();
    this.checkNearMiss();
    this.updateEnemies(time);
    this.updateTokens(time);
    if (this.char.stats.sonic) this.updateSonic(time);

    // 추락 — 지면 바로 아래에서 바로 잡는다.
    // 더 늦게 잡으면 달리던 관성으로 지면 타일 밑에 들어가 점프해도 머리가 막힌다.
    if (hero.box.y > FALL_Y && !hero.locked && !this.over) { this.lastCause = '구멍'; this.fallOut(); }

    if (!this.endless && !this.won && hero.box.x >= this.goalX) this.reachGoal();

    this.updateMult(time, delta);
    this.updateShadow();
    this.updateSpeedLines(time);
    this.updatePowerSlots(time);
    // 배율 표시
    this.multBarG.clear();
    if (this.mult > 1.05) {
      const grow = Phaser.Math.Clamp((this.mult - 1) / (MULT_MAX - 1), 0, 1);
      this.multTxt.setText(`×${this.mult.toFixed(1)}`)
        .setAlpha(1)
        .setScale(0.9 + grow * 0.45)
        .setColor(this.mult >= 4 ? '#ff9f1c' : (this.mult >= 2.5 ? '#ffd977' : '#ffeaa8'));
      const left = Phaser.Math.Clamp((this.multUntil - time) / MULT_HOLD, 0, 1);
      const w = 190;
      this.multBarG.fillStyle(0x7b5a48, 0.3);
      this.multBarG.fillRoundedRect(W / 2 - w / 2, 136, w, 9, 4);
      if (left > 0) {
        this.multBarG.fillStyle(this.mult >= 4 ? 0xff9f1c : 0xffd977, 1);
        this.multBarG.fillRoundedRect(W / 2 - w / 2, 136, w * left, 9, 4);
      }
    } else {
      this.multTxt.setAlpha(0);
    }

    this.missionUI.forEach((u) => {
      if (u.m.done) {
        u.n.setText('★'.repeat(u.m.star)).setColor('#ff9f1c');
        u.t.setColor('#b9a594');
      } else if (u.m.need > 1) {
        u.n.setText(`${Math.min(u.m.got, u.m.need)}/${u.m.need}`);
      }
    });
    this.hpBar.draw(this.hp / this.hpMax);
    this.tokenTxt.setText(String(this.tokenCount));
    this.badge.setText(this.revives > 0 ? '부활 1회 남음' : '부활 없음');
    const p = Phaser.Math.Clamp(hero.box.x / this.goalX, 0, 1);
    const dist = Math.floor(hero.box.x / 10);
    this.distTxt.setText(`${dist}m`);
    this.timeTxt.setText(`${((time - this.startMs) / 1000).toFixed(1)}초`);
    this.tally('dist', dist);
    this.checkMilestone();
    this.checkBest();
    this.progTrack.draw(p);
    this.progIcon.x = 780 + 462 * p;
  }

  onDoubleJump() { this.tally('doubles'); }

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
    stopMusic();
    sfx.goal();
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

  // 지난 최고 기록이 반투명으로 같이 달린다. 혼자 달리는 것보다 낫다.
  setupGhost() {
    if (this.endless) return;
    const g = loadGhost(this.daily ? `daily-${todayKey()}` : this.stage.id);
    if (!g || g.length < 8) return;
    this.ghostData = g;
    this.ghostIdx = 0;
    this.ghost = this.add.sprite(g[0][0], g[0][1], `${this.heroId}-run`)
      .setDepth(3).setAlpha(0.34).setTint(0x9fd6f5);
    const m = this.cache.json.get(`meta-${this.heroId}`).anims.run;
    this.ghost.setOrigin(m.origin.x, m.origin.y);
    this.ghost.play(`${this.heroId}-run`);
    this.ghostTxt = this.add.text(0, 0, '최고 기록', {
      fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#5aa9e6',
    }).setOrigin(0.5, 1).setDepth(3).setAlpha(0.7);
  }

  updateGhost(time) {
    if (!this.ghost) return;
    const i = Math.floor((time - this.startMs) / 90);
    if (i >= this.ghostData.length) {
      this.ghost.setVisible(false);
      if (this.ghostTxt) this.ghostTxt.setVisible(false);
      return;
    }
    const [x, y] = this.ghostData[Math.max(0, i)];
    this.ghost.setPosition(x, y);
    this.ghostTxt.setPosition(x, y - 150);
  }

  // 자취를 남긴다. 최고 기록이면 다음 판에 고스트로 같이 달린다.
  recordTrail(time) {
    if (this.endless || this.over) return;
    if (time - this.trailAt < 90) return;
    this.trailAt = time;
    this.trail.push([Math.round(this.hero.box.x), Math.round(this.hero.box.y)]);
    if (this.trail.length > 1400) this.trail.shift();
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

  // 장애물과 적을 얼마나 아슬아슬하게 지나쳤는지 본다
  checkNearMiss() {
    const hero = this.hero;
    if (hero.locked || hero.invuln) return;
    const hx = hero.box.x;
    const hTop = hero.box.y - (hero.sliding ? HERO_SLIDE_H : HERO_H);
    const scan = (grp, key) => {
      grp.children.iterate((o) => {
        if (!o || !o.active || o.getData(key)) return;
        if (hx < o.x + 26) return;
        o.setData(key, true);
        const oTop = o.y - o.displayHeight * (o.originY === 1 ? 1 : 0.5);
        const oBot = oTop + o.displayHeight;
        // 위로 넘었으면 발과 머리 사이, 아래로 지났으면 머리와 바닥 사이
        const gap = hero.box.y <= oTop + 8
          ? oTop - hero.box.y
          : (hTop >= oBot - 8 ? hTop - oBot : -1);
        if (gap < 0 || gap > 78) return;
        this.nearMiss(o.x, oTop);
      });
    };
    scan(this.G.hazards, 'nm');
    scan(this.G.enemies, 'nm');
  }

  nearMiss(x, y) {
    this.nearCount = (this.nearCount || 0) + 1;
    this.bumpMult('near');
    this.addScore(250);
    sfx.token(6);
    const t = this.add.text(x, y - 20, '아슬아슬!', {
      fontFamily: FONT, fontSize: '22px', fontStyle: '900', color: '#ffffff',
      stroke: '#5aa9e6', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(42).setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 150, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t, y: y - 80, alpha: 0, delay: 300, duration: 420,
      onComplete: () => t.destroy(),
    });
    this.sparkle(x, y, 3);
  }

  // 매달린 것을 슬라이드로 지나쳤는지 센다
  countSlidePass() {
    const hero = this.hero;
    this.G.hazards.children.iterate((o) => {
      if (!o || !o.active || o.getData('kind') !== 'hang') return;
      if (o.getData('passed')) return;
      if (hero.box.x > o.x + 40) {
        o.setData('passed', true);
        if (hero.sliding || hero.box.y < o.y) this.tally('slides');
      }
    });
  }

  updateEnemies(time) {
    this.G.enemies.children.iterate((e) => {
      if (!e || !e.active) return;
      const kind = e.getData('kind');
      if (kind === 'slime') {
        if (e.getData('chase')) {
          const d = this.hero.box.x - e.x;
          if (Math.abs(d) < 420) e.setVelocityX(Math.sign(d) * 120);
        } else {
          const home = e.getData('homeX');
          if (e.x < home - 70 && e.body.velocity.x < 0) e.setVelocityX(82);
          if (e.x > home + 70 && e.body.velocity.x > 0) e.setVelocityX(-82);
        }
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

  updateSonic(time) {
    if (time - this.lastSonic < (this.char.stats.sonicMs || 3200)) return;
    this.lastSonic = time;
    let hit = null;
    this.G.enemies.children.iterate((e) => {
      if (!e || !e.active || hit) return;
      if (e.getData('kind') === 'chestnut') return;
      const d = e.x - this.hero.box.x;
      if (d > 60 && d < 620) hit = e;
    });
    if (!hit) return;
    // 눈에 보이게 쏜다. 그냥 사라지면 버그로 보인다
    const hx = this.hero.box.x + 20;
    const hy = this.hero.box.y - 80;
    const beam = this.add.image(hx, hy, 'fx_sparkle').setScale(0.3).setDepth(9);
    this.tweens.add({
      targets: beam, x: hit.x, y: hit.y - 40, scale: 0.5, duration: 190,
      onComplete: () => {
        beam.destroy();
        if (!hit.active) return;
        this.hitMark(hit.x, hit.y - 30);
        this.killEnemy(hit, false, 1);
        this.addScore(150);
      },
    });
    for (let i = 0; i < 3; i++) {
      this.time.delayedCall(i * 45, () => {
        const w = this.add.image(hx + i * 30, hy, 'fx_sparkle')
          .setScale(0.16).setAlpha(0.8).setDepth(8);
        this.tweens.add({ targets: w, alpha: 0, scale: 0.3, duration: 220,
          onComplete: () => w.destroy() });
      });
    }
  }

  finish(cleared) {
    if (this.over) return;
    this.over = true;
    this.cameras.main.fadeOut(420);
    this.time.delayedCall(460, () => {
      this.scene.start('Result', {
        cleared, score: this.score, tokens: this.tokenCount,
        heroId: this.heroId,
        stageId: this.endless ? 'endless' : this.stage.id,
        missions: this.missions.map((m) => ({ ...m })),
        near: this.nearCount || 0,
        cause: this.lastCause || null,
        ms: Math.round(this.time.now - this.startMs),
        trail: this.trail,
        daily: this.daily ? todayKey() : null,
        baseScore: Math.round(this.baseScore),
        bonusScore: Math.round(this.bonusScore),
        bestMult: Math.round((this.peakMult || 1) * 10) / 10,
        dist: Math.max(this.stat.dist, Math.floor(this.hero.box.x / 10)),
      });
    });
  }
}
