// 진행 저장. 브라우저 localStorage 하나만 쓴다.
const KEY = 'super-hakkyuha';

const EMPTY = { cleared: [], pets: ['palabella'], best: {}, lastHero: 'jjujebi', lastPet: 'palabella' };

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

export function isCleared(stageId) {
  return load().cleared.includes(stageId);
}

export function maxOpen() {
  const d = load();
  return d.cleared.length ? Math.max(...d.cleared) + 1 : 1;
}

// 클리어 처리 — 쓴 캐릭터가 펫 목록에 들어오고, 5 를 깨면 쭈일리언을 구해 낸다.
export function clearStage(stageId, heroId, score) {
  const d = load();
  const news = [];
  if (!d.cleared.includes(stageId)) d.cleared.push(stageId);
  if (!d.pets.includes(heroId)) { d.pets.push(heroId); news.push(heroId); }
  if (stageId === 5 && !d.pets.includes('zzulien')) { d.pets.push('zzulien'); news.push('zzulien'); }
  if (!d.best[stageId] || score > d.best[stageId]) d.best[stageId] = score;
  d.lastHero = heroId;
  save(d);
  return news;
}

export function setLast(heroId, petId) {
  const d = load();
  d.lastHero = heroId;
  d.lastPet = petId;
  save(d);
}

export function reset() {
  try { localStorage.removeItem(KEY); } catch (e) { /* 무시 */ }
}
