// 둥근 패널과 글자 상자. 기본 사각형 대신 그림자 깔린 패널을 쓴다.
const INK = 0x7b5a48;

export function panel(scene, x, y, w, h, opt = {}) {
  const {
    fill = 0xfffaf4, alpha = 0.94, line = INK, lw = 4, r = 18,
    shadow = 0x7b5a48, shadowA = 0.22, depth = 50, fixed = true,
  } = opt;
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(shadow, shadowA);
  g.fillRoundedRect(x + 3, y + 5, w, h, r);
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x, y, w, h, r);
  g.lineStyle(lw, line, 1);
  g.strokeRoundedRect(x, y, w, h, r);
  if (fixed) g.setScrollFactor(0);
  return g;
}

export function bar(scene, x, y, w, h, color, opt = {}) {
  const { bg = 0xe6dcd2, line = INK, depth = 51, fixed = true } = opt;
  const back = scene.add.graphics().setDepth(depth);
  back.fillStyle(bg, 1);
  back.fillRoundedRect(x, y, w, h, h / 2);
  back.lineStyle(3, line, 1);
  back.strokeRoundedRect(x, y, w, h, h / 2);
  const fillG = scene.add.graphics().setDepth(depth + 1);
  if (fixed) { back.setScrollFactor(0); fillG.setScrollFactor(0); }
  const draw = (ratio) => {
    fillG.clear();
    const ww = Math.max(0, (w - 6) * Phaser.Math.Clamp(ratio, 0, 1));
    if (ww <= 0) return;
    fillG.fillStyle(color, 1);
    fillG.fillRoundedRect(x + 3, y + 3, ww, h - 6, (h - 6) / 2);
  };
  draw(1);
  return { back, fill: fillG, draw };
}

export function button(scene, x, y, w, h, label, fn, opt = {}) {
  const { fill = 0xffd977, hover = 0xffe7a4, size = '26px', depth = 50 } = opt;
  const g = scene.add.graphics().setDepth(depth);
  const paint = (c) => {
    g.clear();
    g.fillStyle(0x7b5a48, 0.28);
    g.fillRoundedRect(x - w / 2 + 3, y - h / 2 + 6, w, h, 18);
    g.fillStyle(c, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 18);
    g.lineStyle(5, 0x7b5a48, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 18);
  };
  paint(fill);
  const t = scene.add.text(x, y, label, {
    fontFamily: 'Apple SD Gothic Neo, Noto Sans KR, sans-serif',
    fontSize: size, fontStyle: '900', color: '#6b4a3a',
  }).setOrigin(0.5).setDepth(depth + 1);
  const zone = scene.add.zone(x, y, w, h).setInteractive({ useHandCursor: true });
  zone.on('pointerover', () => { paint(hover); t.setScale(1.04); });
  zone.on('pointerout', () => { paint(fill); t.setScale(1); });
  zone.on('pointerup', fn);
  return { g, t, zone };
}
