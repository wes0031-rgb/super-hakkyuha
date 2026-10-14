import { CHUNKS, byTag, normal, validateChunks } from '../data/chunks.js';
import { TILE, ROWS, CHUNK_COLS, GROUND_Y, H, rowY } from '../config.js';
import { THEME_TILE } from '../data/stages.js';

// 작가 에셋은 2배 해상도라 절반으로 줄여 쓴다. 타일 128 → 64.
const S = 0.5;
const TOKEN_S = 0.32;
const POWER_S = 0.36;

export function pickOrder(stage) {
  const [lo0, hi0] = stage.diff;
  const order = [byTag('start')[0]];
  const recent = [];
  const pool = normal();
  const bonus = byTag('bonus');
  const power = byTag('power');
  const heal = byTag('heal');

  for (let i = 1; i < stage.chunks - 1; i++) {
    let pick;
    if (i % 12 === 0) pick = bonus[0];
    else if (i % 13 === 5) {
      // 거대화는 세지만 금방 지루해져서 드물게 나오게 가중치를 낮춘다
      const weighted = power.flatMap((c) => (c.id === 'giant_lane' ? [c] : [c, c]));
      pick = weighted[Math.floor(Math.random() * weighted.length)];
    }
    else if (i % 16 === 9) pick = heal[0];
    else {
      const t = i / stage.chunks;
      const hi = Math.min(hi0, lo0 + Math.floor(t * (hi0 - lo0 + 1)));
      const lo = Math.max(lo0, hi - 1);
      const band = pool.filter((c) => c.diff >= lo && c.diff <= hi && !recent.includes(c.id));
      const use = band.length ? band : pool.filter((c) => c.diff <= hi0 && !recent.includes(c.id));
      pick = use[Math.floor(Math.random() * use.length)] || pool[0];
    }
    recent.push(pick.id);
    if (recent.length > 3) recent.shift();
    order.push(pick);
  }
  order.push(byTag('goal')[0]);
  return order;
}

export function makeGroups(scene) {
  return {
    solid: scene.physics.add.staticGroup(),
    bricks: scene.physics.add.staticGroup(),
    boxes: scene.physics.add.staticGroup(),
    tokens: scene.physics.add.group({ allowGravity: false, immovable: true }),
    powers: scene.physics.add.group({ allowGravity: false, immovable: true }),
    enemies: scene.physics.add.group({ allowGravity: false, immovable: true }),
    hazards: scene.physics.add.group({ allowGravity: false, immovable: true }),
    springs: scene.physics.add.group({ allowGravity: false, immovable: true }),
    puddles: scene.physics.add.group({ allowGravity: false, immovable: true }),
  };
}

// 청크 하나를 세운다. 만든 것들을 배열로 돌려줘서 나중에 치울 수 있게 한다.
export function buildChunk(scene, G, chunk, ci, stage, tokenKey) {
  const groundKey = THEME_TILE[stage.theme] || 'forest-ground';
  const made = [];
  let goalX = 0;

  const bob = (o, dy, dur, rot = 0) => {
    scene.tweens.add({
      targets: o, y: o.y - dy, angle: rot, duration: dur, yoyo: true,
      repeat: -1, ease: 'Sine.easeInOut',
    });
  };

  {
    const ox = ci * CHUNK_COLS * TILE;
    for (let r = 0; r < ROWS; r++) {
      const row = chunk.rows[r];
      for (let c = 0; c < CHUNK_COLS; c++) {
        const ch = row[c];
        if (ch === '.') continue;
        const x = ox + c * TILE + TILE / 2;
        const yTop = rowY(r);
        const yMid = yTop + TILE / 2;
        const yBot = yTop + TILE;

        switch (ch) {
          case 'G': {
            const t = G.solid.create(x, yMid, groundKey).setScale(S);
            t.refreshBody();
            made.push(t);
            made.push(scene.add.image(x, yBot, groundKey).setOrigin(0.5, 0).setScale(S)
              .setDepth(-1).setTint(0xdcd0c0));
            made.push(scene.add.image(x, yBot + TILE, groundKey).setOrigin(0.5, 0).setScale(S)
              .setDepth(-1).setTint(0xc4b8a8));
            break;
          }
          case '=': {
            const t = G.solid.create(x, yTop + 16, 'sky-platform').setScale(S);
            made.push(t);
            t.body.setSize(96, 33).setOffset(0, 0);
            t.refreshBody();
            break;
          }
          case '#': {
            const b = G.bricks.create(x, yMid, 'blk-cookie').setScale(S);
            made.push(b);
            b.refreshBody();
            break;
          }
          case 'B': {
            const b = G.boxes.create(x, yMid, 'blk-item').setScale(S);
            made.push(b);
            b.setData('full', true);
            b.refreshBody();
            break;
          }
          case 'o': {
            const o = G.tokens.create(x, yMid, tokenKey).setScale(TOKEN_S);
            made.push(o);
            o.body.setCircle(70, 30, 30);
            o.setData('baseY', o.y);
            bob(o, 7, 900, 6);
            break;
          }
          case 'm': {
            const e = G.enemies.create(x, yBot, 'enm-slime').setOrigin(0.5, 1).setScale(S);
            made.push(e);
            e.body.setSize(190, 150).setOffset(25, 50);
            e.setData('kind', 'slime');
            e.setData('homeX', x);
            e.setData('chase', chunk.diff >= 4 && (ci + c) % 3 === 0);
            e.setVelocityX(-82);
            scene.tweens.add({
              targets: e, scaleX: S * 0.96, scaleY: S * 1.05, duration: 300,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            break;
          }
          case 'b': {
            const e = G.enemies.create(x, yMid, 'enm-bee1').setScale(S);
            made.push(e);
            e.body.setSize(170, 140).setOffset(35, 30);
            e.setData('kind', 'bee');
            e.setData('baseY', e.y);
            scene.tweens.add({
              targets: e, y: e.y - 26, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            break;
          }
          case 'g': {
            const e = G.enemies.create(x, yMid, 'enm-ghost').setScale(S);
            made.push(e);
            e.body.setSize(160, 170).setOffset(20, 20);
            e.setData('kind', 'ghost');
            // 너무 옅어지면 사라진 줄 안다. 윤곽은 남도록 0.45 까지만
            scene.tweens.add({
              targets: e, alpha: 0.45, y: e.y - 20, duration: 1500,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            break;
          }
          case 'c': {
            const e = G.enemies.create(x, yBot, 'enm-chestnut').setOrigin(0.5, 1).setScale(S);
            made.push(e);
            e.body.setSize(160, 160).setOffset(20, 30);
            e.setData('kind', 'chestnut');
            scene.tweens.add({ targets: e, angle: -360, duration: 1400, repeat: -1 });
            break;
          }
          case 's': {
            const o = G.hazards.create(x, yBot, 'obs-spikes').setOrigin(0.5, 1).setScale(S);
            made.push(o);
            o.body.setSize(210, 90).setOffset(17, 40);
            o.setData('kind', 'spike');
            break;
          }
          case 'h': {
            const o = G.hazards.create(x, 10, 'obs-hanging').setOrigin(0.5, 0).setScale(S);
            made.push(o);
            o.body.setSize(120, 380).setOffset(20, 20);
            o.setData('kind', 'hang');
            scene.tweens.add({
              targets: o, angle: 6, duration: 1200, yoyo: true, repeat: -1,
              ease: 'Sine.easeInOut',
            });
            break;
          }
          case 't': {
            const o = G.hazards.create(x, yBot, 'obs-tall').setOrigin(0.5, 1).setScale(S);
            made.push(o);
            o.body.setSize(150, 330).setOffset(25, 20);
            o.setData('kind', 'tall');
            break;
          }
          case 'p': {
            const o = G.springs.create(x, yBot, 'obs-spring').setOrigin(0.5, 1).setScale(S);
            made.push(o);
            o.body.setSize(150, 120).setOffset(5, 44);
            break;
          }
          case 'w': {
            const o = G.puddles.create(x, yBot, 'obs-puddle').setOrigin(0.5, 1).setScale(S);
            made.push(o);
            o.body.setSize(260, 60).setOffset(10, 40);
            scene.tweens.add({
              targets: o, scaleX: S * 0.97, scaleY: S * 1.06, duration: 500,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            break;
          }
          case '1': case '2': case '3': case '4': case '5': case '6': {
            const kinds = { 1: 'boost', 2: 'double', 3: 'giant', 4: 'heal', 5: 'magnet', 6: 'shield' };
            const kind = kinds[ch];
            const o = G.powers.create(x, yMid, `pw-${kind}`).setScale(POWER_S);
            made.push(o);
            o.body.setCircle(80, 20, 20);
            o.setData('kind', kind);
            scene.tweens.add({
              targets: o, scaleX: POWER_S * 1.05, scaleY: POWER_S * 0.96, duration: 1200,
              yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
            });
            break;
          }
          case 'F': {
            goalX = x;
            scene.flagX = x;
            break;
          }
          default: break;
        }
      }
    }
  }
  return { made, goalX };
}

export function buildWorld(scene, order, stage, tokenKey) {
  const errs = validateChunks();
  if (errs.length) console.warn('[청크 규칙 위반]', errs);
  const G = makeGroups(scene);
  let goalX = 0;
  order.forEach((chunk, ci) => {
    const r = buildChunk(scene, G, chunk, ci, stage, tokenKey);
    if (r.goalX) goalX = r.goalX;
  });
  const width = order.length * CHUNK_COLS * TILE;
  return { groups: G, width, goalX: goalX || width - 200 };
}

// 끝없이 달리기 — 난이도를 거리에 따라 올리고 같은 청크가 붙지 않게 한다
export function endlessPick(i, recent) {
  const pool = normal();
  if (i === 0) return byTag('start')[0];
  if (i % 14 === 6) return byTag('power')[Math.floor(Math.random() * byTag('power').length)];
  if (i % 22 === 12) return byTag('heal')[0];
  if (i % 23 === 14) return byTag('bonus')[0];
  const hi = Math.min(5, 1 + Math.floor(i / 4));
  const lo = Math.max(1, hi - 2);
  const band = pool.filter((c) => c.diff >= lo && c.diff <= hi && !recent.includes(c.id));
  const use = band.length ? band : pool.filter((c) => !recent.includes(c.id));
  return use[Math.floor(Math.random() * use.length)] || pool[0];
}
