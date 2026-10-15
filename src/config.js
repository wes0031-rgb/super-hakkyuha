// 게임 전역 수치. 간격 규칙이 전부 여기서 나오므로 고칠 땐 게임설계.md 도 같이 본다.

export const W = 1280;
export const H = 720;
export const TILE = 64;

// 바닥 칸(행 8)의 윗면. 그 아래는 흙으로 채운다.
export const GROUND_Y = 576;
export const ROWS = 9;

export const SPEED_MIN = 470;      // 시작 속도
export const SPEED_MAX = 780;      // 끝까지 가면 이 속도
export const SPEED_RAMP = 0.0028;  // 1px 전진할 때마다 붙는 속도

export const GRAVITY = 2900;
export const JUMP_V = 1070;        // 1단 점프 — 발판 3칸(192px) 에 겨우 닿는 값
export const JUMP2_V = 790;        // 2단 점프
export const JUMP_CUT = 0.45;      // 버튼을 떼면 상승 속도에 곱한다
export const SPRING_V = 1560;      // 스프링을 밟았을 때
export const COYOTE_MS = 95;      // 발판에서 떨어진 뒤에도 점프를 받아주는 시간
export const BUFFER_MS = 120;      // 착지 직전 입력을 기억하는 시간

export const HERO_W = 58;
export const HERO_H = 140;
export const HERO_SLIDE_H = 58;

export const HP_MAX = 100;
export const HP_HIT = 34;      // 세 번 맞으면 쓰러진다
export const HP_PIT = 50;      // 떨어지면 더 아프다
export const HP_HEART = 1;
export const REVIVE_HP = 50;
export const INVULN_MS = 1300;

export const BOOST_MS = 3000;
export const GIANT_MS = 3800;
export const MAGNET_MS = 7000;
export const SLIP_MS = 700;
export const STUN_MS = 900;

// 지면보다 이만큼 아래로 내려가면 추락으로 본다.
// 더 늦게 잡으면 지면 타일 밑으로 들어가 버려서 점프해도 머리가 막힌다.
export const FALL_Y = GROUND_Y + 92;

export const TOKEN_SCORE = 100;

// 점수 배율 — 적극적으로 움직여야 오르고, 가만히 달리면 깎인다.
// 생존과 점수를 다른 목표로 갈라 놓는 장치다.
export const MULT_MAX = 5;
export const MULT_HOLD = 2600;     // 마지막 행동 뒤 유지되는 시간
export const MULT_DECAY = 0.0011;  // 그 뒤 1ms 당 깎이는 양
export const MULT_GAIN = {
  token: 0.1, stomp: 0.4, near: 0.3, brick: 0.2, spring: 0.2, power: 0.5,
};
// 이어 밟을수록 가파르게. 마리오가 100→200→400→800→…으로 올리는 이유다
export const STOMP_SCORE = [200, 400, 800, 1600, 3200, 6000, 10000];

export const CHUNK_COLS = 12;

export const COLORS = {
  sky1: 0x9fd8f5, sky2: 0xe8f7ff,
  hill: 0xbfe8c0, hill2: 0xa4dca8,
  soil: 0xdcb888, soilTop: 0xa4dca8,
  line: 0x7b5a48, ink: 0x6b4a3a,
  heart: 0xff7fa4, gold: 0xffd977,
  cloudBad: 0x9a90b8, cloudBadInk: 0x4c4160,
  berry: 0xd9a7e8, berryInk: 0x6b4a7a,
};

// 화면 좌표 변환 — 행 0 이 맨 위, 행 8 이 지면
export const rowY = (r) => GROUND_Y + (r - (ROWS - 1)) * TILE;
