/**
 * 포켓몬 스탯 계산 엔진
 * 실제 배틀용 스탯 계산
 */

/**
 * HP 스탯 계산
 */
export function calculateHP(base, iv, ev, level) {
  if (base === 1) return 1; // 디귀
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

/**
 * 기타 스탯 계산 (공격, 방어, 특공, 특방, 스피드)
 */
export function calculateStat(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

/**
 * 성격 보정값
 */
export const NATURE_MODIFIERS = {
  // 성격명: [공격, 방어, 특공, 특방, 스피드]
  'adamant': [1.1, 1.0, 0.9, 1.0, 1.0],    // 고집 (공↑ 특공↓)
  'brave': [1.1, 1.0, 0.9, 1.0, 0.9],      // 용감 (공↑ 스핏↓)
  'lonely': [1.1, 0.9, 1.0, 1.0, 1.0],     // 외로움 (공↑ 방↓)
  'naughty': [1.1, 1.0, 1.0, 0.9, 1.0],    // 개구쟁이 (공↑ 특방↓)
  
  'bold': [0.9, 1.1, 1.0, 1.0, 1.0],       // 대담 (방↑ 공↓)
  'impish': [1.0, 1.1, 0.9, 1.0, 1.0],     // 장난꾸러기 (방↑ 특공↓)
  'lax': [1.0, 1.1, 1.0, 0.9, 1.0],        // 무사태평 (방↑ 특방↓)
  'relaxed': [1.0, 1.1, 1.0, 1.0, 0.9],    // 느긋 (방↑ 스핏↓)
  
  'modest': [0.9, 1.0, 1.1, 1.0, 1.0],     // 차분 (특공↑ 공↓)
  'mild': [1.0, 0.9, 1.1, 1.0, 1.0],       // 온순 (특공↑ 방↓)
  'rash': [1.0, 1.0, 1.1, 0.9, 1.0],       // 덜렁 (특공↑ 특방↓)
  'quiet': [1.0, 1.0, 1.1, 1.0, 0.9],      // 조용 (특공↑ 스핏↓)
  
  'calm': [0.9, 1.0, 1.0, 1.1, 1.0],       // 차분 (특방↑ 공↓)
  'gentle': [1.0, 0.9, 1.0, 1.1, 1.0],     // 얌전 (특방↑ 방↓)
  'careful': [1.0, 1.0, 0.9, 1.1, 1.0],    // 신중 (특방↑ 특공↓)
  'sassy': [1.0, 1.0, 1.0, 1.1, 0.9],      // 건방 (특방↑ 스핏↓)
  
  'timid': [0.9, 1.0, 1.0, 1.0, 1.1],      // 겁쟁이 (스핏↑ 공↓)
  'hasty': [1.0, 0.9, 1.0, 1.0, 1.1],      // 성급 (스핏↑ 방↓)
  'jolly': [1.0, 1.0, 0.9, 1.0, 1.1],      // 명랑 (스핏↑ 특공↓)
  'naive': [1.0, 1.0, 1.0, 0.9, 1.1],      // 천진난만 (스핏↑ 특방↓)
  
  'serious': [1.0, 1.0, 1.0, 1.0, 1.0],    // 성실 (무보정)
  'docile': [1.0, 1.0, 1.0, 1.0, 1.0],     // 노력 (무보정)
  'bashful': [1.0, 1.0, 1.0, 1.0, 1.0],    // 수줍음 (무보정)
  'quirky': [1.0, 1.0, 1.0, 1.0, 1.0],     // 변덕 (무보정)
  'hardy': [1.0, 1.0, 1.0, 1.0, 1.0]       // 노력 (무보정)
};

/**
 * 전체 스탯 계산
 */
export function calculateAllStats(pokemon) {
  const { baseStats, ivs = {}, evs = {}, level = 50 } = pokemon;

  const defaultIV = 31;
  const defaultEV = 0;

  return {
    hp: calculateHP(
      baseStats.hp,
      ivs.hp ?? defaultIV,
      evs.hp ?? defaultEV,
      level
    ),
    attack: calculateStat(
      baseStats.attack,
      ivs.attack ?? defaultIV,
      evs.attack ?? defaultEV,
      level
    ),
    defense: calculateStat(
      baseStats.defense,
      ivs.defense ?? defaultIV,
      evs.defense ?? defaultEV,
      level
    ),
    spAttack: calculateStat(
      baseStats.spAttack,
      ivs.spAttack ?? defaultIV,
      evs.spAttack ?? defaultEV,
      level
    ),
    spDefense: calculateStat(
      baseStats.spDefense,
      ivs.spDefense ?? defaultIV,
      evs.spDefense ?? defaultEV,
      level
    ),
    speed: calculateStat(
      baseStats.speed,
      ivs.speed ?? defaultIV,
      evs.speed ?? defaultEV,
      level
    )
  };
}

/**
 * 랭크 변화 배율
 */
export const STAT_STAGE_MULTIPLIERS = {
  '-6': 2/8, '-5': 2/7, '-4': 2/6, '-3': 2/5, '-2': 2/4, '-1': 2/3,
  '0': 1,
  '1': 3/2, '2': 4/2, '3': 5/2, '4': 6/2, '5': 7/2, '6': 8/2
};

/**
 * 랭크 변화 적용
 */
export function applyStatStage(stat, stage) {
  const multiplier = STAT_STAGE_MULTIPLIERS[Math.max(-6, Math.min(6, stage)).toString()];
  return Math.floor(stat * multiplier);
}
