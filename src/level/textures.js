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
