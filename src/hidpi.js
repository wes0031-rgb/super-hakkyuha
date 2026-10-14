// 레티나 대응. 캔버스를 화면 배율만큼 크게 만들고 카메라를 그만큼 확대한다.
// 그래서 게임 좌표는 계속 1280×720 로 쓰면서 그림만 선명해진다.
import { W, H } from './config.js';

export const DPR = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);

// 카메라를 확대하면 보이는 영역이 가운데로 몰린다. 좌상단을 (0,0) 으로 되돌리는 보정값.
export const OFF_X = (W * DPR - W) / 2;
export const OFF_Y = (H * DPR - H) / 2;

export function setupCamera(scene) {
  const cam = scene.cameras.main;
  cam.setZoom(DPR);
  cam.setScroll(-OFF_X, -OFF_Y);
  return cam;
}

// 월드를 가로로 훑는 씬에서 쓴다. x 는 보고 싶은 화면 좌상단의 월드 좌표.
export function scrollTo(scene, x) {
  scene.cameras.main.setScroll(x - OFF_X, -OFF_Y);
}
