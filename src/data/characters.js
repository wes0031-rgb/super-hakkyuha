// 하뀨하 9명. id 는 에셋 폴더명과 같다.
// token 은 그 캐릭터로 달릴 때 깔리는 수집물이다. 캐릭터마다 화면이 달라진다.

export const CHARACTERS = [
  {
    id: 'jjujebi', name: '쮸제비', member: '지우', token: 'snowflake', tint: 0x9fd6f5,
    skill: '얼음 발판', desc: '공중에서 한 번 더 디딜 수 있어요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 1 },
  },
  {
    id: 'bingping', name: '빙핑', member: '카르멘', token: 'bone', tint: 0xff9ebd,
    skill: '눈덩이 굴리기', desc: '부스트가 오래 가요',
    stats: { air: 1, token: 1, boost: 1.6, extraAir: 0 },
  },
  {
    id: 'toramui', name: '토라뮈', member: '유하', token: 'ribbon', tint: 0xffaecb,
    skill: '깡총 점프', desc: '두 번째 점프가 더 높아요',
    stats: { air: 1.3, token: 1, boost: 1, extraAir: 0 },
  },
  {
    id: 'stelnyang', name: '스텔냥', member: '스텔라', token: 'note', tint: 0xffd45c,
    skill: '음파 공격', desc: '가끔 앞의 적이 알아서 물러나요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 0, sonic: true },
  },
  {
    id: 'nosungi', name: '노숭이', member: '에이나', token: 'flower', tint: 0xf6a35c,
    skill: '덩굴 매달리기', desc: '슬라이드하는 동안 안 다쳐요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 0, slideInvuln: true },
  },
  {
    id: 'peanut', name: '정땅콩', member: '이안', token: 'seed', tint: 0xa8cf7a,
    skill: '구르기 돌진', desc: '슬라이드로 쿠키 블록을 부숴요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 0, slideBreak: true },
  },
  {
    id: 'alssong', name: '알쏭햄쏭', member: '예온', token: 'heart', tint: 0xffc24d,
    skill: '볼주머니 저장', desc: '모으는 것마다 점수를 더 받아요',
    stats: { air: 1, token: 1.4, boost: 1, extraAir: 0 },
  },
  {
    id: 'palabella', name: '팔라벨라', member: '마스코트', token: 'clover', tint: 0x8fc4e8,
    skill: '네잎클로버', desc: '멀리 있는 것도 끌어당겨요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 0, magnet: 210 },
  },
  {
    id: 'zzulien', name: '쭈일리언', member: '주은', token: 'paw', tint: 0xb58fd8,
    skill: '별의 기운', desc: '공중에서 한 번 더 디딜 수 있어요',
    stats: { air: 1, token: 1, boost: 1, extraAir: 1 },
    needRescue: true,       // 먹구름성을 깨야 열린다
  },
];

export const byId = (id) => CHARACTERS.find((c) => c.id === id);
export const PLAYABLE = CHARACTERS.filter((c) => !c.needRescue);

// 플레이에 실제로 쓰는 것만 싣는다. hello · sleepy 는 아직 안 쓴다.
export const MOTIONS = [
  'idle', 'run', 'jump', 'double_jump', 'slide', 'land', 'stomp', 'head_bump',
  'hit', 'down_revive', 'victory', 'boost', 'giant',
  'air_loop', 'spring_jump', 'fall', 'surprise', 'slip', 'stun',
  'power_up', 'game_over',
];

