// 포지션별 응원 정의 (레이드 시스템 가이드 기준)
// scope: 'team' = 아군 전체, 'self' = 시전자 자신, 'team-heal' = 아군 전체 회복,
//        'team-cure' = 아군 전체 상태이상 회복, 'self-flag' = 단순 표식(강제 유도는 미구현)
export const POSITION_CHEERS = {
  철벽: [
    {
      id: 'iron-wall',
      name: '철통 방어',
      scope: 'team',
      stats: ['def', 'spd'],
      amount: 1,
      duration: 3,
      desc: '3턴 동안 아군 전체 방어/특수방어 1.5배',
    },
    {
      id: 'leave-it-to-me',
      name: '뒤는 맡기라고',
      scope: 'self-flag',
      flag: 'targetLock',
      duration: 1,
      desc: '이번 턴 보스의 공격 대상을 자신으로 유도(표식만 남김, 실제 대상 지정은 수동)',
    },
  ],
  칼춤: [
    {
      id: 'power-up',
      name: '힘내라 힘',
      scope: 'self',
      stats: ['atk', 'spa'],
      amount: 1,
      duration: 3,
      desc: '3턴 동안 자신의 공격/특수공격 1.5배',
    },
    {
      id: 'finish-it',
      name: '끝내버려',
      scope: 'self',
      stats: ['atk', 'spa'],
      amount: 4,
      duration: 2,
      skipNext: true,
      desc: '2턴 동안 자신의 공격/특수공격 3배, 이후 1턴 행동 불가',
    },
  ],
  도우미: [
    {
      id: 'healing-cry',
      name: '치유의 함성',
      scope: 'team-heal',
      amount: 0.5,
      desc: '아군 전체 체력을 최대 체력의 50%만큼 회복',
    },
    {
      id: 'full-restore',
      name: '만전 태세',
      scope: 'team-cure',
      desc: '아군 전체 상태이상 및 도발/앵콜 등 회복',
    },
  ],
};

export const POSITION_OPTIONS = Object.keys(POSITION_CHEERS);

export const MAX_CHEERS_PER_PARTICIPANT = 2;

export const STAT_LABEL = { atk: '공격', def: '방어', spa: '특수공격', spd: '특수방어', spe: '스피드' };

export const STATUS_LABEL = { brn: '화상', psn: '독', tox: '맹독', par: '마비', slp: '잠듦', frz: '얼음' };
