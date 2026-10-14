// 작가 에셋에 없는 것만 코드로 그린다 — 히어로 물리 박스, 배경 구름·언덕, 깃발, 새장.
import { HERO_W, HERO_H } from '../config.js';

const INK = 0x7b5a48;

function g(scene) {
  return scene.make.graphics({ x: 0, y: 0, add: false });
}

// Graphics 의 fillGradientStyle 은 WebGL 에서만 먹는다. 캔버스 텍스처로 구워 둔다.
export function makeGradient(scene, key, w, h, top, bottom) {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.createCanvas(key, w, h);
  if (!tex) return key;
  const ctx = tex.getContext();
  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, top);
  grd.addColorStop(1, bottom);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);
  tex.refresh();
  return key;
}

export function buildTextures(scene) {
  // 히어로 물리 바디 — 보이지 않는 사각형
  let gr = g(scene);
  gr.fillStyle(0xffffff, 0).fillRect(0, 0, HERO_W, HERO_H);
  gr.generateTexture('hbox', HERO_W, HERO_H);
  gr.destroy();

  // 배경 구름
  gr = g(scene);
  gr.fillStyle(0xffffff, 1);
  gr.fillCircle(40, 46, 26);
  gr.fillCircle(78, 36, 34);
  gr.fillCircle(118, 48, 24);
  gr.fillRect(40, 48, 78, 24);
  gr.lineStyle(4, INK, 1);
  gr.strokeCircle(40, 46, 26);
  gr.strokeCircle(78, 36, 34);
  gr.strokeCircle(118, 48, 24);
  gr.generateTexture('bg_cloud', 160, 80);
  gr.destroy();

  // 배경 언덕 — 테마마다 색을 입혀 쓴다
  gr = g(scene);
  gr.fillStyle(0xffffff, 1);
  gr.fillEllipse(180, 170, 360, 240);
  gr.lineStyle(5, INK, 1);
  gr.strokeEllipse(180, 170, 360, 240);
  gr.generateTexture('bg_hill', 360, 180);
  gr.destroy();

  // 깃발
  gr = g(scene);
  gr.lineStyle(10, INK, 1);
  gr.beginPath().moveTo(14, 8).lineTo(14, 300).strokePath();
  gr.fillStyle(0xff7fa4, 1);
  gr.beginPath(); gr.moveTo(14, 18); gr.lineTo(14, 72); gr.lineTo(84, 45);
  gr.closePath(); gr.fillPath();
  gr.lineStyle(5, INK, 1); gr.strokePath();
  gr.generateTexture('i_flag', 90, 310);
  gr.destroy();

  // 먼지
  gr = g(scene);
  gr.fillStyle(0xffffff, 1).fillCircle(16, 16, 15);
  gr.generateTexture('fx_puff', 32, 32);
  gr.destroy();

  // 발밑 그림자
  gr = g(scene);
  for (let i = 10; i >= 1; i--) {
    gr.fillStyle(0x3a2a20, 0.055 * i / 10 + 0.01);
    gr.fillEllipse(70, 24, 130 * i / 10, 40 * i / 10);
  }
  gr.generateTexture('fx_shadow', 140, 48);
  gr.destroy();

  // 먼 산 실루엣 — 테마마다 색을 입혀 쓴다
  gr = g(scene);
  gr.fillStyle(0xffffff, 1);
  gr.beginPath();
  gr.moveTo(0, 220);
  gr.lineTo(120, 60); gr.lineTo(210, 150); gr.lineTo(300, 30);
  gr.lineTo(400, 160); gr.lineTo(500, 90); gr.lineTo(600, 220);
  gr.closePath(); gr.fillPath();
  gr.generateTexture('bg_far', 600, 220);
  gr.destroy();

  // 나무 — 잎이 캔버스를 넘지 않게 여백을 둔다
  gr = g(scene);
  gr.fillStyle(0xc9a17a, 1).fillRoundedRect(69, 116, 22, 62, 8);
  gr.lineStyle(5, INK, 1).strokeRoundedRect(69, 116, 22, 62, 8);
  gr.fillStyle(0xffffff, 1);
  gr.fillCircle(80, 74, 44);
  gr.fillCircle(48, 98, 30);
  gr.fillCircle(112, 98, 30);
  gr.lineStyle(5, INK, 1);
  gr.strokeCircle(80, 74, 44);
  gr.strokeCircle(48, 98, 30);
  gr.strokeCircle(112, 98, 30);
  gr.generateTexture('bg_tree', 160, 182);
  gr.destroy();

  // 덤불
  gr = g(scene);
  gr.fillStyle(0xffffff, 1);
  gr.fillCircle(40, 46, 26);
  gr.fillCircle(72, 38, 32);
  gr.fillCircle(104, 48, 24);
  gr.fillRect(40, 48, 64, 26);
  gr.lineStyle(5, INK, 1);
  gr.strokeCircle(40, 46, 26);
  gr.strokeCircle(72, 38, 32);
  gr.strokeCircle(104, 48, 24);
  gr.generateTexture('bg_bush', 144, 78);
  gr.destroy();

  // 달
  gr = g(scene);
  gr.fillStyle(0xfff4c4, 1).fillCircle(60, 60, 48);
  gr.fillStyle(0xf2e2a8, 1);
  gr.fillCircle(44, 46, 11);
  gr.fillCircle(76, 70, 8);
  gr.fillCircle(52, 80, 6);
  gr.generateTexture('bg_moon', 120, 120);
  gr.destroy();

  // 새장 — 쭈일리언 구출 연출
  gr = g(scene);
  gr.fillStyle(0xefe9fb, 1).fillRoundedRect(6, 24, 108, 100, 14);
  gr.lineStyle(6, 0x4c4160, 1).strokeRoundedRect(6, 24, 108, 100, 14);
  gr.fillStyle(0xb8aed4, 1).fillRoundedRect(22, 6, 76, 20, 8);
  gr.lineStyle(6, 0x4c4160, 1).strokeRoundedRect(22, 6, 76, 20, 8);
  gr.lineStyle(5, 0x4c4160, 1);
  [34, 60, 86].forEach((x) => gr.beginPath().moveTo(x, 24).lineTo(x, 124).strokePath());
  gr.generateTexture('i_cage', 120, 130);
  gr.destroy();
}
