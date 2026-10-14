// 스테이지 다섯. 테마에 따라 지면 타일과 하늘색이 바뀐다.
// 마지막을 깨면 쭈일리언을 구해 내고, 그때부터 펫으로 데리고 다닐 수 있다.

export const STAGES = [
  {
    id: 1, name: '하뀨하 들판', theme: 'forest', chunks: 18, diff: [1, 2],
    sky: ['#9fd8f5', '#e8f7ff'], hint: '점프만 익히면 돼요',
  },
  {
    id: 2, name: '달콤 언덕', theme: 'dessert', chunks: 20, diff: [1, 3],
    sky: ['#ffd9b0', '#fff2e0'], hint: '슬라이드가 나와요',
  },
  {
    id: 3, name: '구름다리', theme: 'sky', chunks: 22, diff: [2, 4],
    sky: ['#a8d8ff', '#ffe9f2'], hint: '발판이 띄엄띄엄해요',
  },
  {
    id: 4, name: '별밤 숲', theme: 'night', chunks: 24, diff: [3, 5],
    sky: ['#4a4066', '#8e7fa8'], hint: '유령은 보일 때만 밟혀요',
  },
  {
    id: 5, name: '먹구름성', theme: 'night', chunks: 26, diff: [4, 5],
    sky: ['#3b3350', '#6b5f85'], hint: '쭈일리언이 저 끝에 있어요', rescue: true,
  },
];

export const THEME_TILE = {
  forest: 'forest-ground',
  dessert: 'dessert-ground',
  sky: 'sky-ground',
  night: 'night-ground',
};

export const byStage = (id) => STAGES.find((s) => s.id === id) || STAGES[0];
