// 레티나 대응. 캔버스를 화면 배율만큼 크게 만들고 카메라를 그만큼 확대한다.
// 게임 좌표는 계속 1280×720 로 쓰면서 그림만 선명해진다.
//
// 카메라 확대는 기본이 '가운데 기준'이라 그대로 쓰면 화면이 통째로 밀린다.
// setOrigin(0, 0) 으로 좌상단 기준으로 바꿔야 월드도 UI 도 제자리에 온다.

export const DPR = Math.min((typeof window !== 'undefined' && window.devicePixelRatio) || 1, 2);

export function setupCamera(scene) {
  const cam = scene.cameras.main;
  cam.setOrigin(0, 0);
  cam.setZoom(DPR);
  cam.setScroll(0, 0);
  return cam;
}

// 월드를 가로로 훑는 씬에서 쓴다. x 는 화면 좌상단에 오게 할 월드 좌표.
export function scrollTo(scene, x) {
  scene.cameras.main.setScroll(x, 0);
}
