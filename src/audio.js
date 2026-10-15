// 소리. 음원 파일 없이 Web Audio 로 그때그때 만들어 낸다.
// 브라우저 정책 때문에 첫 입력이 있어야 소리가 난다.

let ctx = null;
let master = null;
let musicGain = null;
let musicTimer = null;
let muted = false;
let musicSet = null;
let musicRate = 1;
let musicStep = 0;
let musicTick = null;
let currentGap = 0;

function ready() {
  if (ctx) return true;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return false;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);
  musicGain = ctx.createGain();
  musicGain.gain.value = 0.16;
  musicGain.connect(master);
  return true;
}

export function unlock() {
  if (!ready()) return;
  if (ctx.state === 'suspended') ctx.resume();
}

export function setMuted(on) {
  muted = on;
  if (master) master.gain.value = on ? 0 : 0.55;
}

export function isMuted() { return muted; }

// 기본 한 음
function tone(freq, dur, opt = {}) {
  if (!ready() || muted) return;
  const { type = 'sine', to = freq, vol = 0.3, delay = 0, bend = 'exp', dest = master } = opt;
  const t0 = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to !== freq) {
    if (bend === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur);
    else osc.frequency.linearRampToValueAtTime(Math.max(1, to), t0 + dur);
  }
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0005, t0 + dur);
  osc.connect(g).connect(dest);
  osc.start(t0);
  osc.stop(t0 + dur + 0.04);
}

// 짧은 잡음 — 밟기·착지에 쓴다
function noise(dur, opt = {}) {
  if (!ready() || muted) return;
  const { vol = 0.22, lp = 1800, delay = 0 } = opt;
  const t0 = ctx.currentTime + delay;
  const n = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = lp;
  const g = ctx.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

const SC = [0, 2, 4, 7, 9];   // 5음 음계 — 어떤 음을 겹쳐도 안 어긋난다
const hz = (semi) => 440 * Math.pow(2, semi / 12);

export const sfx = {
  jump() { tone(420, 0.16, { type: 'triangle', to: 760, vol: 0.26 }); },
  double() {
    tone(620, 0.16, { type: 'triangle', to: 1080, vol: 0.24 });
    tone(930, 0.12, { type: 'sine', to: 1400, vol: 0.12, delay: 0.03 });
  },
  land() { noise(0.09, { vol: 0.16, lp: 900 }); },
  // 이어 먹을수록 음이 올라간다
  token(combo = 0) {
    const semi = SC[Math.min(combo, 12) % SC.length] + Math.floor(Math.min(combo, 12) / SC.length) * 12;
    tone(hz(semi) * 2, 0.11, { type: 'triangle', vol: 0.2 });
    tone(hz(semi) * 4, 0.07, { type: 'sine', vol: 0.08, delay: 0.015 });
  },
  stomp() {
    noise(0.12, { vol: 0.3, lp: 2600 });
    tone(220, 0.16, { type: 'square', to: 90, vol: 0.18 });
  },
  bump() { tone(180, 0.1, { type: 'square', to: 120, vol: 0.2 }); noise(0.07, { vol: 0.14, lp: 1200 }); },
  break_() { noise(0.2, { vol: 0.3, lp: 3400 }); },
  hurt() { tone(360, 0.3, { type: 'sawtooth', to: 90, vol: 0.26 }); },
  spring() { tone(260, 0.22, { type: 'square', to: 1300, vol: 0.24 }); },
  slip() { tone(900, 0.3, { type: 'sine', to: 300, vol: 0.14 }); },
  power() {
    [0, 4, 7, 12].forEach((s, i) => tone(hz(s) * 2, 0.16, { type: 'triangle', vol: 0.2, delay: i * 0.06 }));
  },
  heal() { [0, 7, 12].forEach((s, i) => tone(hz(s) * 2, 0.2, { type: 'sine', vol: 0.18, delay: i * 0.08 })); },
  revive() { [12, 7, 0, 7, 12].forEach((s, i) => tone(hz(s) * 2, 0.18, { type: 'triangle', vol: 0.2, delay: i * 0.1 })); },
  goal() {
    [0, 4, 7, 12, 16, 19].forEach((s, i) => {
      tone(hz(s) * 2, 0.26, { type: 'triangle', vol: 0.24, delay: i * 0.11 });
      tone(hz(s) * 4, 0.2, { type: 'sine', vol: 0.08, delay: i * 0.11 + 0.02 });
    });
  },
  fail() { [0, -3, -7, -12].forEach((s, i) => tone(hz(s) * 2, 0.3, { type: 'sawtooth', vol: 0.2, delay: i * 0.14 })); },
  click() { tone(880, 0.06, { type: 'triangle', vol: 0.16 }); },
};

// 배경 음악 — 테마마다 다른 음계로 아르페지오를 돌린다
const THEME_SET = {
  forest: { root: -5, pat: [0, 4, 7, 11, 7, 4], bpm: 124, wave: 'triangle' },
  dessert: { root: -2, pat: [0, 5, 9, 12, 9, 5], bpm: 118, wave: 'triangle' },
  sky: { root: 0, pat: [0, 7, 12, 16, 12, 7], bpm: 112, wave: 'sine' },
  night: { root: -7, pat: [0, 3, 7, 10, 7, 3], bpm: 104, wave: 'triangle' },
};

export function startMusic(theme = 'forest') {
  if (!ready() || musicTimer) return;
  musicSet = THEME_SET[theme] || THEME_SET.forest;
  musicRate = 1;
  musicStep = 0;
  const play = () => {
    const set = musicSet;
    const step = 60 / (set.bpm * musicRate) / 2;
    if (!muted) {
      const i = musicStep;
      const semi = set.root + set.pat[i % set.pat.length];
      tone(hz(semi) * 2, step * 1.6, { type: set.wave, vol: 0.1, dest: musicGain });
      if (i % 6 === 0) tone(hz(set.root - 12), step * 3, { type: 'sine', vol: 0.14, dest: musicGain });
      if (i % 12 === 6) tone(hz(semi + 12) * 2, step, { type: 'sine', vol: 0.05, dest: musicGain });
      // 빨라질수록 사이에 한 음이 더 낀다
      if (musicRate > 1.18 && i % 2 === 1) {
        tone(hz(semi + 7) * 2, step * 0.8, { type: 'sine', vol: 0.05, dest: musicGain });
      }
    }
    musicStep++;
  };
  musicTick = play;
  play();
  currentGap = 60 / musicSet.bpm / 2 * 1000;
  musicTimer = setInterval(play, currentGap);
}

// 배율이 오를수록 음악이 빨라진다. 1 ~ 1.35 사이.
export function setMusicRate(r) {
  const next = Math.max(0.8, Math.min(1.35, r));
  if (Math.abs(next - musicRate) < 0.02) return;
  musicRate = next;
  if (!musicTimer || !musicTick) return;
  clearInterval(musicTimer);
  currentGap = 60 / (musicSet.bpm * musicRate) / 2 * 1000;
  musicTimer = setInterval(musicTick, currentGap);
}

export function stopMusic() {
  if (musicTimer) { clearInterval(musicTimer); musicTimer = null; }
  musicTick = null;
}
