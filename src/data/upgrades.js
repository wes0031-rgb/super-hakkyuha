// 모은 것으로 올리는 능력치. 단계마다 값이 붙고 값이 오른다.
export const UPGRADES = [
  {
    id: 'boost', name: '부스트 시간', icon: 'pw-boost', max: 5, cost: [60, 120, 220, 380, 600],
    step: 0.5, unit: '초', base: 3,
    desc: (lv) => `부스트가 ${(3 + lv * 0.5).toFixed(1)}초 이어져요`,
  },
  {
    id: 'magnet', name: '자석 시간', icon: 'pw-magnet', max: 5, cost: [60, 120, 220, 380, 600],
    step: 0.8, unit: '초', base: 7,
    desc: (lv) => `자석이 ${(7 + lv * 0.8).toFixed(1)}초 이어져요`,
  },
  {
    id: 'giant', name: '거대화 시간', icon: 'pw-giant', max: 5, cost: [80, 150, 260, 420, 660],
    step: 0.4, unit: '초', base: 3.8,
    desc: (lv) => `거대화가 ${(3.8 + lv * 0.4).toFixed(1)}초 이어져요`,
  },
  {
    id: 'hp', name: '튼튼함', icon: 'pw-heal', max: 5, cost: [80, 160, 280, 460, 700],
    step: 12, unit: '', base: 100,
    desc: (lv) => `체력이 ${100 + lv * 12} 로 시작해요`,
  },
  {
    id: 'revive', name: '부활 횟수', icon: 'pw-shield', max: 2, cost: [400, 1200],
    step: 1, unit: '번', base: 1,
    desc: (lv) => `쓰러져도 ${1 + lv}번 다시 일어나요`,
  },
  {
    id: 'value', name: '점수 보너스', icon: 'pw-double', max: 5, cost: [100, 200, 340, 540, 820],
    step: 0.1, unit: '배', base: 1,
    desc: (lv) => `줍는 점수가 ${(1 + lv * 0.1).toFixed(1)}배예요`,
  },
];

export const byUp = (id) => UPGRADES.find((u) => u.id === id);
export const costOf = (u, lv) => (lv >= u.max ? null : u.cost[lv]);
export const valueOf = (u, lv) => u.base + u.step * lv;
