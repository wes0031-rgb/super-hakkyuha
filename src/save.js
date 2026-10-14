// 진행 저장. 브라우저 localStorage 하나만 쓴다.
const KEY = 'super-hakkyuha';

const EMPTY = {
  cleared: [],
  unlocked: [],      // 구해 내서 열린 캐릭터
  best: {},          // 스테이지별 최고 점수
  bestDist: 0,       // 끝없이 달리기 최고 거리
  stars: 0,
  doneMissions: [],
  bank: 0,           // 모은 것 — 업그레이드에 쓴다
  upgrades: {},      // id → 단계
  lastHero: 'jjujebi',
};

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...EMPTY };
    return { ...EMPTY, ...JSON.parse(raw) };
  } catch (e) {
    return { ...EMPTY };
  }
}

export function save(data) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch (e) { /* 무시 */ }
}

export function lv(id) { return load().upgrades[id] || 0; }

export function maxOpen() {
  const d = load();
  return d.cleared.length ? Math.max(...d.cleared) + 1 : 1;
}

export function endlessOpen() {
  return load().cleared.includes(1);
}

// 한 판이 끝나면 부른다. 새로 들어온 펫과 별을 돌려준다.
export function finishRun({ stageId, heroId, score, tokens, missions, cleared, dist }) {
  const d = load();
  const news = [];
  let gotStars = 0;

  d.bank += tokens;

  for (const m of missions || []) {
    if (!m.done) continue;
    if (!d.doneMissions.includes(m.id)) {
      d.doneMissions.push(m.id);
      d.stars += m.star;
      gotStars += m.star;
    }
  }

  if (stageId === 'endless') {
    if (dist > d.bestDist) d.bestDist = dist;
  } else if (cleared) {
    if (!d.cleared.includes(stageId)) d.cleared.push(stageId);
    if (stageId === 5 && !d.unlocked.includes('zzulien')) {
      d.unlocked.push('zzulien');
      news.push('zzulien');
    }
    if (!d.best[stageId] || score > d.best[stageId]) d.best[stageId] = score;
  }

  d.lastHero = heroId;
  save(d);
  return { news, gotStars };
}

export function buy(id, cost) {
  const d = load();
  if (d.bank < cost) return false;
  d.bank -= cost;
  d.upgrades[id] = (d.upgrades[id] || 0) + 1;
  save(d);
  return true;
}

export function setLast(heroId) {
  const d = load();
  d.lastHero = heroId;
  save(d);
}

export function isUnlocked(id) {
  return load().unlocked.includes(id);
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
}
