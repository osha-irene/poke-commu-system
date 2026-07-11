// 콘테스트 자동 판정 엔진 - 규칙 상수 & 순수 계산 헬퍼
// 근거: 커뮤니티 콘테스트 규칙(오메가루비·알파사파이어 라이브 룰 기반, src/data/communityContent.js "## 콘테스트" 참고)

export const CONTEST_TYPES = ['귀여움', '근사함', '강인함', '슬기로움', '아름다움'];

// 콘테스트 타입별 "패널티 타입"(해당 타입 기술 사용 시 어필/방해 절반 획득).
// 유저가 전달한 원본 표가 5개 타입 × 2개 패널티로 평탄화되어 있던 것을 순서대로 페어링해 복원.
// (각 타입이 in-degree/out-degree 2로 완전히 대칭 검증됨 — 확실치 않으면 이 객체만 수정하면 됨)
export const CONTEST_PENALTY_TYPES = {
  '귀여움': ['근사함', '강인함'],
  '근사함': ['귀여움', '슬기로움'],
  '강인함': ['귀여움', '아름다움'],
  '슬기로움': ['근사함', '아름다움'],
  '아름다움': ['강인함', '슬기로움'],
};

// 콘테스트 타입 ↔ 포켓몬 condition 필드 매핑 (PokemonDetailPanel.jsx 기준)
export const CONDITION_KEY_BY_CONTEST_TYPE = {
  '근사함': 'elegance',
  '귀여움': 'cuteness',
  '아름다움': 'beauty',
  '슬기로움': 'intelligence',
  '강인함': 'strength',
};

export const MAX_STARS = 3;
export const MAX_APPLAUSE = 4;

export const rollDie = (sides = 6) => 1 + Math.floor(Math.random() * sides);
export const roll2d6 = () => rollDie(6) + rollDie(6);
export const roll1d100 = () => rollDie(100);

export const isPenaltyMove = (moveContestType, contestType) =>
  !!moveContestType && (CONTEST_PENALTY_TYPES[contestType] || []).includes(moveContestType);

export const isMatchingMove = (moveContestType, contestType) => moveContestType === contestType;

export const getPenaltyMultiplier = (moveContestType, contestType) =>
  isPenaltyMove(moveContestType, contestType) ? 0.5 : 1;

/**
 * 긴장 확률(%) 계산.
 * 기본 10% + 순서(0-index)당 5% + 마지막 순서면 +20% - (일치 컨디션/10)*5% - 보유 ☆*10%
 */
export const calcNervousChance = ({ position, totalParticipants, conditionValue = 0, stars = 0 }) => {
  let chance = 10 + position * 5;
  if (position === totalParticipants - 1) chance += 20;
  chance -= Math.floor(conditionValue / 10) * 5;
  chance -= stars * 10;
  return Math.max(0, Math.min(100, chance));
};

export const rollNervous = (chance) => roll1d100() <= chance;
