// 콘테스트 자동 판정 엔진 - 규칙 상수 & 순수 계산 헬퍼 (CommonJS 포팅본, src/contest/contestRules.js와 동일 로직 유지)
// 근거: 커뮤니티 콘테스트 규칙(오메가루비·알파사파이어 라이브 룰 기반, src/data/communityContent.js "## 콘테스트" 참고)
const CONTEST_TYPES = ['귀여움', '근사함', '강인함', '슬기로움', '아름다움'];

const CONTEST_PENALTY_TYPES = {
  '귀여움': ['근사함', '강인함'],
  '근사함': ['귀여움', '슬기로움'],
  '강인함': ['귀여움', '아름다움'],
  '슬기로움': ['근사함', '아름다움'],
  '아름다움': ['강인함', '슬기로움'],
};

const CONDITION_KEY_BY_CONTEST_TYPE = {
  '근사함': 'elegance',
  '귀여움': 'cuteness',
  '아름다움': 'beauty',
  '슬기로움': 'intelligence',
  '강인함': 'strength',
};

const MAX_STARS = 3;

const rollDie = (sides = 6) => 1 + Math.floor(Math.random() * sides);
const roll2d6 = () => rollDie(6) + rollDie(6);
const roll1d100 = () => rollDie(100);

const isPenaltyMove = (moveContestType, contestType) =>
  !!moveContestType && (CONTEST_PENALTY_TYPES[contestType] || []).includes(moveContestType);

const isMatchingMove = (moveContestType, contestType) => moveContestType === contestType;

const getPenaltyMultiplier = (moveContestType, contestType) =>
  isPenaltyMove(moveContestType, contestType) ? 0.5 : 1;

const calcNervousChance = ({ position, totalParticipants, conditionValue = 0, stars = 0 }) => {
  let chance = 10 + position * 5;
  if (position === totalParticipants - 1) chance += 10;
  chance -= Math.floor(conditionValue / 10) * 5;
  chance -= stars * 10;
  return Math.max(0, Math.min(100, chance));
};

const rollNervous = (chance) => roll1d100() <= chance;

module.exports = {
  CONTEST_TYPES,
  CONTEST_PENALTY_TYPES,
  CONDITION_KEY_BY_CONTEST_TYPE,
  MAX_STARS,
  rollDie,
  roll2d6,
  roll1d100,
  isPenaltyMove,
  isMatchingMove,
  getPenaltyMultiplier,
  calcNervousChance,
  rollNervous,
};
