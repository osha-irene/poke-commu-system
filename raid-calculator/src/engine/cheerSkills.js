/** 규칙 IV장(포지션 & 응원) 기반 포지션별 응원 스킬 정의 */

export const CHEER_MAX_USES = 2;

export const POSITION_TO_CHEER_GROUP = {
  철벽: 'tank',
  칼춤: 'sword',
  도우미: 'healer',
};

export const POSITION_OPTIONS = Object.keys(POSITION_TO_CHEER_GROUP);

export const CHEER_SKILLS = {
  tank: [
    { id: 'ironwall', name: '철통 방어', desc: '3턴 동안 모든 아군의 방어/특방 1.5배' },
    { id: 'guard', name: '뒤는 맡기라고', desc: '이번 턴 공격 대상을 자신으로 고정' },
  ],
  sword: [
    { id: 'pumpup', name: '힘내라 힘', desc: '3턴 동안 자신의 공격/특공 1.5배' },
    { id: 'finisher', name: '끝내버려', desc: '다음 턴 물리/특수공격 3배, 그 다음 턴은 행동불가 (마지막 턴 사용 불가)' },
  ],
  healer: [
    { id: 'healcry', name: '치유의 함성', desc: '모든 아군 체력 50% 회복' },
    { id: 'cleanse', name: '만전 태세', desc: '모든 아군 상태이상/얽매임 효과 회복' },
  ],
};

export function getCheerSkillsForPosition(position) {
  const group = POSITION_TO_CHEER_GROUP[position];
  return group ? CHEER_SKILLS[group] : [];
}

export function findCheerSkill(position, cheerId) {
  return getCheerSkillsForPosition(position).find((s) => s.id === cheerId) || null;
}
