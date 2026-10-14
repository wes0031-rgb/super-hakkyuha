// 한 판에 세 개씩 무작위로 준다.
// 일부러 효율이 떨어지는 쪽을 시키는 게 핵심이다. 그래야 기계적으로 달리지 않는다.
//
// stat — PlayScene 이 세는 값의 이름
// need — 목표치, star — 깼을 때 주는 별

const M = (id, text, stat, need, star) => ({ id, text, stat, need, star });

export const MISSIONS = [
  // 쉬움 — 별 1
  M('token20', '모으는 것 20개 줍기', 'tokens', 20, 1),
  M('stomp5', '적 5마리 밟기', 'stomps', 5, 1),
  M('double8', '2단 점프 8번 하기', 'doubles', 8, 1),
  M('dist600', '600m 달리기', 'dist', 600, 1),
  M('brick4', '쿠키 블록 4개 부수기', 'bricks', 4, 1),

  // 보통 — 별 2
  M('token45', '모으는 것 45개 줍기', 'tokens', 45, 2),
  M('stomp12', '적 12마리 밟기', 'stomps', 12, 2),
  M('combo10', '한 번에 10연속 줍기', 'bestCombo', 10, 2),
  M('slide4', '슬라이드로 매달린 것 4개 지나기', 'slides', 4, 2),
  M('spring4', '스프링 4번 밟기', 'springs', 4, 2),
  M('double18', '2단 점프 18번 하기', 'doubles', 18, 2),
  M('power3', '파워업 3개 먹기', 'powers', 3, 2),

  // 어려움 — 별 3
  M('nohit', '한 번도 안 맞고 끝까지 가기', 'noHit', 1, 3),
  M('token70', '모으는 것 70개 줍기', 'tokens', 70, 3),
  M('combo20', '한 번에 20연속 줍기', 'bestCombo', 20, 3),
  M('nopower', '파워업 하나도 안 먹고 깨기', 'noPower', 1, 3),
  M('stomp20', '적 20마리 밟기', 'stomps', 20, 3),
];

// 스테이지가 올라갈수록 어려운 쪽을 섞는다
export function rollMissions(stageId, done = []) {
  const easy = MISSIONS.filter((m) => m.star === 1);
  const mid = MISSIONS.filter((m) => m.star === 2);
  const hard = MISSIONS.filter((m) => m.star === 3);
  const pickFrom = (pool, used) => {
    const fresh = pool.filter((m) => !used.includes(m.id) && !done.includes(m.id));
    const use = fresh.length ? fresh : pool.filter((m) => !used.includes(m.id));
    return use[Math.floor(Math.random() * use.length)];
  };
  const out = [];
  const used = [];
  const plan = stageId <= 1 ? [easy, easy, mid]
    : stageId <= 3 ? [easy, mid, mid]
      : [mid, mid, hard];
  for (const pool of plan) {
    const m = pickFrom(pool, used);
    if (!m) continue;
    used.push(m.id);
    out.push(m);
  }
  return out;
}
