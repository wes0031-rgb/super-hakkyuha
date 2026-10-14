import { sfx } from '../audio.js?v=1792018473';
import {
  HERO_W, HERO_H, HERO_SLIDE_H, JUMP_V, JUMP2_V, JUMP_CUT, SPRING_V,
  COYOTE_MS, BUFFER_MS, SPEED_MIN, SPEED_MAX, SPEED_RAMP,
  BOOST_MS, GIANT_MS, INVULN_MS, MAGNET_MS, SLIP_MS, STUN_MS,
} from '../config.js?v=1792018473';

// 물리 바디는 보이지 않는 사각형이고, 그림은 매 프레임 그 바닥에 발을 맞춘다.
// 모션마다 칸 크기가 달라도 발 위치가 흔들리지 않는다.
export default class Hero {
  constructor(scene, x, y, char, meta) {
    this.scene = scene;
    this.char = char;
    this.meta = meta;
    this.stats = char.stats;

    this.box = scene.physics.add.sprite(x, y, 'hbox').setOrigin(0.5, 1).setVisible(false);
    this.box.body.setSize(HERO_W, HERO_H);

    this.art = scene.add.sprite(x, y, `${char.id}-idle`).setDepth(6);

    this.state = 'run';
    this.lastGround = 0;
    this.lastJumpPress = -9999;
    this.jumpsLeft = 0;
    this.sliding = false;
    this.locked = false;
    this.invulnUntil = 0;
    this.boostUntil = 0;
    this.giantUntil = 0;
    this.magnetUntil = 0;
    this.slipUntil = 0;
    this.stunUntil = 0;
    this.shield = false;
    this.bonusAir = 0;
    this.stompChain = 0;
    this.lastSafeX = x;
    this.lastSafeY = y;

    this.play('run');
  }

  get body() { return this.box.body; }
  get x() { return this.box.x; }
  get y() { return this.box.y; }

  get baseSpeed() { return Math.min(SPEED_MAX, SPEED_MIN + this.box.x * SPEED_RAMP); }
  get speed() {
    let s = this.baseSpeed;
    if (this.boosting) s *= 1.55;
    if (this.slipping) s *= 1.3;
    if (this.stunned) s *= 0.4;
    return s;
  }

  get boosting() { return this.scene.time.now < this.boostUntil; }
  get giant() { return this.scene.time.now < this.giantUntil; }
  get magnet() { return this.scene.time.now < this.magnetUntil; }
  get slipping() { return this.scene.time.now < this.slipUntil; }
  get stunned() { return this.scene.time.now < this.stunUntil; }
  get invuln() {
    return this.scene.time.now < this.invulnUntil || this.boosting || this.giant;
  }
  // 기본 두 번. extraAir 가 있는 캐릭터와 2단 추가 파워업이 더해진다
  get maxJumps() { return 2 + (this.stats.extraAir || 0) + this.bonusAir; }

  play(motion, force = false) {
    const m = this.meta[motion];
    if (!m) return;
    const key = `${this.char.id}-${motion}`;
    if (!force && this.state === motion && this.art.anims.isPlaying) return;
    this.state = motion;
    this.art.play(key, !force);
    this.art.setOrigin(m.origin.x, m.origin.y);
  }

  playOnce(motion, then = null) {
    this.play(motion, true);
    this.art.once('animationcomplete', () => { if (then) then(); });
  }

  setSlide(on) {
    if (this.sliding === on) return;
    this.sliding = on;
    if (on) {
      this.body.setSize(HERO_W, HERO_SLIDE_H);
      this.body.setOffset(0, HERO_H - HERO_SLIDE_H);
    } else {
      this.body.setSize(HERO_W, HERO_H);
      this.body.setOffset(0, 0);
    }
  }

  jumpPressed(now) { this.lastJumpPress = now; }

  jumpReleased() {
    if (this.body.velocity.y < 0) this.body.velocity.y *= JUMP_CUT;
  }

  tryJump(now) {
    if (this.locked || this.stunned) return false;
    const grounded = this.body.blocked.down || this.body.touching.down;
    const coyote = now - this.lastGround < COYOTE_MS;
    if (grounded || coyote) {
      this.body.setVelocityY(-JUMP_V);
      this.jumpsLeft = this.maxJumps - 1;
      this.lastGround = -9999;
      this.lastJumpPress = -9999;
      this.setSlide(false);
      this.play('jump', true);
      sfx.jump();
      this.scene.puff(this.x, this.y);
      return true;
    }
    if (this.jumpsLeft > 0) {
      this.jumpsLeft--;
      this.body.setVelocityY(-JUMP2_V * (this.stats.air || 1));
      this.lastJumpPress = -9999;
      this.play('double_jump', true);
      sfx.double();
      this.scene.sparkle(this.x, this.y - 60);
      return true;
    }
    return false;
  }

  spring() {
    this.body.setVelocityY(-SPRING_V);
    this.jumpsLeft = this.maxJumps;
    this.setSlide(false);
    this.play('spring_jump', true);
  }

  stomp(power = 1) {
    this.body.setVelocityY(-JUMP_V * 0.72 * power);
    this.jumpsLeft = Math.max(this.jumpsLeft, 1);
    this.play('stomp', true);
  }

  bump() { this.play('head_bump', true); }

  slip(now) {
    this.slipUntil = now + SLIP_MS;
    this.play('slip', true);
  }

  stun(now) {
    this.stunUntil = now + STUN_MS;
    this.invulnUntil = Math.max(this.invulnUntil, now + STUN_MS + 400);
    this.play('stun', true);
  }

  hurt(now) {
    this.invulnUntil = now + INVULN_MS;
    this.play('hit', true);
    this.box.setVelocityY(-300);
  }

  powerUp() { this.play('power_up', true); }

  down(then) {
    this.locked = true;
    this.setSlide(false);
    this.box.setVelocityX(0);
    this.playOnce('down_revive', () => {
      this.locked = false;
      this.invulnUntil = this.scene.time.now + INVULN_MS + 800;
      if (then) then();
    });
  }

  gameOver() {
    this.locked = true;
    this.box.setVelocityX(0);
    this.play('game_over', true);
  }

  victory() {
    this.locked = true;
    this.setSlide(false);
    this.box.setVelocityX(0);
    this.play('victory', true);
  }

  startDash(then) {
    this.locked = true;
    this.box.setVelocityX(0);
    this.playOnce('start_dash', () => { this.locked = false; if (then) then(); });
  }

  giveBoost(now) {
    const ms = (this.up && this.up.boostMs) || BOOST_MS;
    this.boostUntil = now + ms * (this.stats.boost || 1);
  }
  giveGiant(now) {
    this.giantUntil = now + ((this.up && this.up.giantMs) || GIANT_MS);
    this.giantFrom = now;
  }
  giveMagnet(now) { this.magnetUntil = now + ((this.up && this.up.magnetMs) || MAGNET_MS); }
  giveShield() { this.shield = true; }
  giveDouble() { this.bonusAir = 1; }

  update(now, dt, input) {
    const grounded = this.body.blocked.down || this.body.touching.down;
    if (grounded) {
      this.lastGround = now;
      this.jumpsLeft = this.maxJumps;
      if (this.body.velocity.y >= 0) {
        this.lastSafeX = this.box.x;
        this.lastSafeY = this.box.y;
      }
    }

    if (!this.locked) {
      this.box.setVelocityX(this.speed);

      if (now - this.lastJumpPress < BUFFER_MS) this.tryJump(now);

      const wantSlide = input.slide && grounded && !this.stunned;
      this.setSlide(wantSlide);

      const busy = ['stomp', 'head_bump', 'hit', 'land', 'spring_jump', 'power_up', 'slip']
        .includes(this.state) && this.art.anims.isPlaying;
      if (!busy) {
        const justGiant = this.giant && now - (this.giantFrom || 0) < 1100;
        if (this.stunned) this.play('stun');
        else if (justGiant) this.play('giant');
        else if (this.boosting) this.play('boost');
        else if (!grounded) {
          const v = this.body.velocity.y;
          if (v < -120) {
            if (this.state !== 'jump' && this.state !== 'double_jump') this.play('jump');
          } else if (v > 260) this.play('fall');
          else this.play('air_loop');
        } else if (wantSlide) this.play('slide');
        else this.play('run');
      }
    }

    this.art.x = this.box.x;
    this.art.y = this.box.y;
    this.art.setScale(this.giant ? 1.35 : 1);

    const flashing = now < this.invulnUntil && !this.boosting && !this.giant;
    this.art.setAlpha(flashing && Math.floor(now / 70) % 2 ? 0.35 : 1);
  }
}
