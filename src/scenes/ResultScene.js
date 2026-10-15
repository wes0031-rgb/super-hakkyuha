import { W, H } from '../config.js?v=1792026900';
import { byId } from '../data/characters.js?v=1792026900';
import { byStage, STAGES } from '../data/stages.js?v=1792026900';
import { makeGradient } from '../level/textures.js?v=1792026900';
import { finishRun, load } from '../save.js?v=1792026900';

import { setupCamera } from '../hidpi.js?v=1792026900';
import { unlock, sfx } from '../audio.js?v=1792026900';
import { button, panel } from '../ui.js?v=1792026900';

const FONT = 'Apple SD Gothic Neo, Noto Sans KR, sans-serif';

export default class ResultScene extends Phaser.Scene {
  constructor() { super('Result'); }

  init(d) {
    this.d = d && d.heroId ? d : {
      cleared: true, score: 12340, tokens: 42, dist: 980, near: 7,
      baseScore: 6800, bonusScore: 5540, bestMult: 3.4,
      heroId: 'jjujebi', stageId: 1,
      missions: [
        { id: 'a', text: '모으는 것 20개 줍기', star: 1, done: true, got: 42, need: 20 },
        { id: 'b', text: '적 12마리 밟기', star: 2, done: false, got: 7, need: 12 },
        { id: 'c', text: '한 번도 안 맞고 끝까지 가기', star: 3, done: false, got: 0, need: 1 },
      ],
    };
  }

  create() {
    setupCamera(this);
    this.input.on('pointerdown', () => { unlock(); sfx.click(); });

    const { cleared, score, tokens, heroId, stageId, missions = [], dist = 0, near = 0,
      baseScore = 0, bonusScore = 0, bestMult = 1 } = this.d;
    const endless = stageId === 'endless';
    const char = byId(heroId);
    const stage = endless ? { name: '끝없이 달리기' } : byStage(stageId);
    const prev = load();
    const before = endless ? prev.bestDist : (prev.best[stageId] || 0);
    const r = finishRun({ stageId, heroId, score, tokens, missions, cleared, dist });
    const news = r.news;
    const gotStars = r.gotStars;
    const cur = endless ? dist : score;
    const isNewBest = cur > before && before > 0;

    const key = cleared || endless ? 'sky_win' : 'sky_lose';
    makeGradient(this, key, W, H,
      cleared || endless ? '#ffd9e8' : '#6b6080',
      cleared || endless ? '#eafbe9' : '#cfc7dd');
    this.add.image(0, 0, key).setOrigin(0, 0).setDepth(-20);
    this.add.image(150, 96, 'bg_cloud').setScale(0.85).setAlpha(cleared || endless ? 1 : 0.5);
    this.add.image(1110, 78, 'bg_cloud').setScale(0.7).setAlpha(cleared || endless ? 1 : 0.5);

    const title = endless ? `${dist}m 달렸어요`
      : (cleared ? `${stage.name} 클리어!` : '다시 가 볼까요');
    this.add.text(W / 2, 62, title, {
      fontFamily: FONT, fontSize: '48px', fontStyle: '900', color: '#ffffff',
      stroke: cleared || endless ? '#7b5a48' : '#4c4160', strokeThickness: 11,
    }).setOrigin(0.5);

    this.add.image(W / 2, 236, `base-${heroId}`).setOrigin(0.5, 1).setScale(0.21);
    this.add.text(W / 2, 240, `${char.name} · ${char.skill}`, {
      fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: '#8a6a56',
    }).setOrigin(0.5, 0);

    // 점수
    let y = 272;
    panel(this, W / 2 - 320, y, 640, 96, { fixed: false, depth: -2 });
    this.add.text(W / 2 - 296, y + 14, endless ? '달린 거리' : '점수', {
      fontFamily: FONT, fontSize: '14px', fontStyle: '700', color: '#9a7b68',
    });
    this.add.text(W / 2 - 296, y + 34, endless ? `${dist}m` : String(score).padStart(6, '0'), {
      fontFamily: FONT, fontSize: '34px', fontStyle: '900', color: '#6b4a3a',
    });
    this.add.image(W / 2 + 36, y + 50, `tok-${char.token}`).setScale(0.13);
    this.add.text(W / 2 + 60, y + 32, `${tokens}개`, {
      fontFamily: FONT, fontSize: '28px', fontStyle: '900', color: '#6b4a3a',
    });
    if (near > 0) {
      this.add.text(W / 2 + 150, y + 20, '아슬아슬', {
        fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#5aa9e6',
      });
      this.add.text(W / 2 + 150, y + 38, `${near}번`, {
        fontFamily: FONT, fontSize: '24px', fontStyle: '900', color: '#6b4a3a',
      });
    }
    if (bonusScore > 0) {
      this.add.text(W / 2 + 206, y + 20, '배율 보너스', {
        fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#b07a20',
      });
      this.add.text(W / 2 + 206, y + 38, `+${bonusScore.toLocaleString()}`, {
        fontFamily: FONT, fontSize: '24px', fontStyle: '900', color: '#ff9f1c',
      });
      this.add.text(W / 2 + 206, y + 68, `최고 ×${bestMult.toFixed(1)}`, {
        fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#9a7b68',
      });
    }
    if (isNewBest) {
      const nb = this.add.text(W / 2 + 230, y + 46, '최고 기록!', {
        fontFamily: FONT, fontSize: '19px', fontStyle: '900', color: '#ffffff',
        stroke: '#e2577f', strokeThickness: 7,
      }).setOrigin(0.5);
      this.tweens.add({ targets: nb, scale: 1.12, duration: 420, yoyo: true, repeat: -1 });
    } else if (before > 0) {
      const gap = before - cur;
      this.add.text(W / 2 - 230, y + 70,
        gap > 0
          ? (endless ? `최고까지 ${gap}m` : `최고까지 ${gap.toLocaleString()}점`)
          : '최고 기록과 같아요', {
          fontFamily: FONT, fontSize: '15px', fontStyle: '700', color: '#9a7b68',
        }).setOrigin(0.5);
    }
    y += 108;

    // 미션
    if (missions.length) {
      const h = 34 + missions.length * 22;
      panel(this, W / 2 - 300, y, 600, h, { fixed: false, depth: -2 });
      this.add.text(W / 2 - 278, y + 10, gotStars ? `미션 · 별 ${gotStars}개 받았어요` : '미션', {
        fontFamily: FONT, fontSize: '14px', fontStyle: '900',
        color: gotStars ? '#b07a20' : '#9a7b68',
      });
      missions.forEach((m, i) => {
        const my = y + 32 + i * 22;
        this.add.text(W / 2 - 278, my, m.done ? '★' : '○', {
          fontFamily: FONT, fontSize: '15px', fontStyle: '900',
          color: m.done ? '#ff9f1c' : '#c8b6a4',
        });
        this.add.text(W / 2 - 254, my, m.text, {
          fontFamily: FONT, fontSize: '14px', fontStyle: '700',
          color: m.done ? '#6b4a3a' : '#a89684',
        });
        if (!m.done && m.need > 1) {
          this.add.text(W / 2 + 278, my, `${Math.min(m.got, m.need)}/${m.need}`, {
            fontFamily: FONT, fontSize: '13px', fontStyle: '700', color: '#b9a594',
          }).setOrigin(1, 0);
        }
      });
      y += h + 12;
    }

    // 구해 내서 열린 캐릭터
    if (news.length) {
      const h = 80;
      panel(this, W / 2 - 300, y, 600, h,
        { fill: 0xf0e4ff, line: 0x8f6bbf, fixed: false, depth: -2 });
      this.add.text(W / 2 - 278, y + 10, '구해 냈어요', {
        fontFamily: FONT, fontSize: '13px', fontStyle: '900', color: '#8f6bbf',
      });
      news.forEach((id, i) => {
        const x = W / 2 - 272 + i * 240;
        const s2 = this.add.image(x + 26, y + h - 8, `base-${id}`)
          .setOrigin(0.5, 1).setScale(0.095);
        this.add.text(x + 66, y + 30, byId(id).name, {
          fontFamily: FONT, fontSize: '18px', fontStyle: '900', color: '#6b4a3a',
        });
        this.add.text(x + 66, y + 54, '이제 같이 달릴 수 있어요', {
          fontFamily: FONT, fontSize: '12px', fontStyle: '700', color: '#8f6bbf',
        });
        this.tweens.add({
          targets: s2, y: y + h - 16, duration: 540, yoyo: true,
          repeat: -1, ease: 'Sine.easeInOut',
        });
      });
      y += h + 12;
    }

    const next = endless ? null : STAGES.find((st) => st.id === stageId + 1);
    const y0 = Math.min(Math.max(y + 34, 600), H - 56);
    if (cleared && next) {
      this.btn(W / 2 - 312, y0, `다음 · ${next.name}`, 268,
        () => this.scene.start('Play', { ...this.d, stageId: next.id }));
      this.btn(W / 2, y0, '다시 하기', 268, () => this.scene.start('Play', this.d));
      this.btn(W / 2 + 312, y0, '스테이지', 268, () => this.scene.start('Stage'));
    } else {
      this.btn(W / 2 - 160, y0, '다시 하기', 296, () => this.scene.start('Play', this.d));
      this.btn(W / 2 + 160, y0, '스테이지 고르기', 296, () => this.scene.start('Stage'));
    }

    this.input.keyboard.once('keydown-SPACE', () => this.scene.start('Play', this.d));
    this.input.keyboard.once('keydown-R', () => this.scene.start('Play', this.d));
  }

  btn(x, y, label, w, fn) {
    button(this, x, y, w, 62, label, fn, { size: w > 280 ? '22px' : '20px' });
  }
}
