// 포지션별 응원 정의 (레이드 시스템 가이드 IV장 기준). 실제 효과는 engine의
// executeParticipantCheer 스위치문에 하드코딩되어 있고, 여기 desc는 UI 표시용이다.
export const POSITION_CHEERS = {
  철벽: [
    { id: 'ironwall', name: '철통 방어', desc: '3턴 동안 같은 조 아군 전체 방어/특수방어 1.5배' },
    { id: 'guard', name: '뒤는 맡기라고', desc: '이번 턴 보스의 공격 대상을 자신으로 고정해 대신 받아낸다' },
  ],
  칼춤: [
    { id: 'pumpup', name: '힘내라 힘', desc: '3턴 동안 자신의 공격/특수공격 1.5배' },
    {
      id: 'finisher',
      name: '끝내버려',
      desc: '다음 턴 자신의 물리/특수공격이 3배가 되지만, 그 턴이 끝나면 1턴 행동 불가 (마지막 라운드에는 사용 불가)',
    },
  ],
  도우미: [
    { id: 'healcry', name: '치유의 함성', desc: '같은 조 아군 전체 체력을 최대 체력의 50%만큼 회복 (회복봉인 상태는 제외)' },
    {
      id: 'cleanse',
      name: '만전 태세',
      desc: '같은 조 아군 전체의 상태이상·헤롱헤롱·도발·앵콜·트집·회복봉인·사슬묶기를 회복 (혼란/씨뿌리기/조이기는 제외)',
    },
  ],
};

export const POSITION_OPTIONS = Object.keys(POSITION_CHEERS);

export const CHEER_MAX_USES = 2;
// 이전 이름 호환용 별칭
export const MAX_CHEERS_PER_PARTICIPANT = CHEER_MAX_USES;

export function findCheerSkill(position, cheerId) {
  return (POSITION_CHEERS[position] || []).find((c) => c.id === cheerId) || null;
}

export const STAT_LABEL = {
  atk: '공격',
  def: '방어',
  spa: '특수공격',
  spd: '특수방어',
  spe: '스피드',
  accuracy: '명중률',
  evasion: '회피율',
};

export const STATUS_LABEL = { brn: '화상', psn: '독', tox: '맹독', par: '마비', slp: '잠듦', frz: '얼음' };
