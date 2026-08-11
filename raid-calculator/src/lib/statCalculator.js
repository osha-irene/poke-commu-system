/**
 * 포켓몬 스탯 계산 엔진 (poke-commu-system의 src/battle/stat-calculator.js 이식본)
 */

export function calculateHP(base, iv, ev, level) {
  if (base === 1) return 1; // 디귀
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + level + 10;
}

export function calculateStat(base, iv, ev, level) {
  return Math.floor(((2 * base + iv + Math.floor(ev / 4)) * level) / 100) + 5;
}

export const NATURE_MODIFIERS = {
  adamant: [1.1, 1.0, 0.9, 1.0, 1.0],
  brave: [1.1, 1.0, 0.9, 1.0, 0.9],
  lonely: [1.1, 0.9, 1.0, 1.0, 1.0],
  naughty: [1.1, 1.0, 1.0, 0.9, 1.0],

  bold: [0.9, 1.1, 1.0, 1.0, 1.0],
  impish: [1.0, 1.1, 0.9, 1.0, 1.0],
  lax: [1.0, 1.1, 1.0, 0.9, 1.0],
  relaxed: [1.0, 1.1, 1.0, 1.0, 0.9],

  modest: [0.9, 1.0, 1.1, 1.0, 1.0],
  mild: [1.0, 0.9, 1.1, 1.0, 1.0],
  rash: [1.0, 1.0, 1.1, 0.9, 1.0],
  quiet: [1.0, 1.0, 1.1, 1.0, 0.9],

  calm: [0.9, 1.0, 1.0, 1.1, 1.0],
  gentle: [1.0, 0.9, 1.0, 1.1, 1.0],
  careful: [1.0, 1.0, 0.9, 1.1, 1.0],
  sassy: [1.0, 1.0, 1.0, 1.1, 0.9],

  timid: [0.9, 1.0, 1.0, 1.0, 1.1],
  hasty: [1.0, 0.9, 1.0, 1.0, 1.1],
  jolly: [1.0, 1.0, 0.9, 1.0, 1.1],
  naive: [1.0, 1.0, 1.0, 0.9, 1.1],

  serious: [1.0, 1.0, 1.0, 1.0, 1.0],
  docile: [1.0, 1.0, 1.0, 1.0, 1.0],
  bashful: [1.0, 1.0, 1.0, 1.0, 1.0],
  quirky: [1.0, 1.0, 1.0, 1.0, 1.0],
  hardy: [1.0, 1.0, 1.0, 1.0, 1.0],
};

export function calculateAllStats(pokemon) {
  const { baseStats, ivs = {}, evs = {}, level = 50 } = pokemon;

  const defaultIV = 31;
  const defaultEV = 0;

  return {
    hp: calculateHP(baseStats.hp, ivs.hp ?? defaultIV, evs.hp ?? defaultEV, level),
    attack: calculateStat(baseStats.attack, ivs.attack ?? defaultIV, evs.attack ?? defaultEV, level),
    defense: calculateStat(baseStats.defense, ivs.defense ?? defaultIV, evs.defense ?? defaultEV, level),
    spAttack: calculateStat(baseStats.spAttack, ivs.spAttack ?? defaultIV, evs.spAttack ?? defaultEV, level),
    spDefense: calculateStat(baseStats.spDefense, ivs.spDefense ?? defaultIV, evs.spDefense ?? defaultEV, level),
    speed: calculateStat(baseStats.speed, ivs.speed ?? defaultIV, evs.speed ?? defaultEV, level),
  };
}

export const STAT_STAGE_MULTIPLIERS = {
  '-6': 2 / 8, '-5': 2 / 7, '-4': 2 / 6, '-3': 2 / 5, '-2': 2 / 4, '-1': 2 / 3,
  0: 1,
  1: 3 / 2, 2: 4 / 2, 3: 5 / 2, 4: 6 / 2, 5: 7 / 2, 6: 8 / 2,
};

export function applyStatStage(stat, stage) {
  const multiplier = STAT_STAGE_MULTIPLIERS[Math.max(-6, Math.min(6, stage)).toString()];
  return Math.floor(stat * multiplier);
}
