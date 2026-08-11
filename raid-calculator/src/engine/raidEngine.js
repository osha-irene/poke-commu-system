import showdownIntegration from '../lib/showdownIntegration.js';
import { calculateHP } from '../lib/statCalculator.js';

const DEFAULT_BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };

const FIXED_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const FIXED_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

/** 입력 폼 데이터(raw)를 실제 전투에 쓸 수 있는 파생 스탯(maxHP 등)을 가진 객체로 변환 */
export function buildBattlePokemon(raw) {
  // 아군 참가자(position 필드를 가진 커스텀 유닛)는 레벨 50 / 성격 하드 / 도구 없음 / 특성 없음 /
  // 종족값 전부 100 / 개체값 전부 31 / 노력치 전부 0으로 고정. 보스는 입력값을 그대로 사용.
  const isParticipant = 'position' in raw;

  const ivs = isParticipant ? FIXED_IVS : raw.ivs || FIXED_IVS;
  const evs = isParticipant ? FIXED_EVS : raw.evs || FIXED_EVS;
  const level = isParticipant ? 50 : raw.level || 50;

  const speciesInfo = isParticipant ? null : showdownIntegration.getSpecies(raw.species);
  const baseStats = isParticipant ? DEFAULT_BASE_STATS : speciesInfo?.baseStats || DEFAULT_BASE_STATS;
  const types = isParticipant
    ? raw.types && raw.types.length
      ? raw.types
      : ['Normal']
    : speciesInfo?.types || ['Normal'];

  const formulaMaxHP = calculateHP(baseStats.hp, ivs.hp, evs.hp, level);
  const customMaxHP = Number(raw.customMaxHP);
  const maxHP = customMaxHP > 0 ? customMaxHP : formulaMaxHP;

  return {
    ...raw,
    ...(isParticipant ? { nature: 'hardy', item: '', ability: '' } : {}),
    isParticipant,
    nickname: raw.nickname?.trim() || raw.position?.trim() || raw.species || '이름없음',
    baseStats,
    types,
    ivs,
    evs,
    level,
    maxHP,
    currentHP: maxHP,
    fainted: false,
  };
}

function pickDamageValue(damage) {
  if (damage == null) return 0;
  if (!Array.isArray(damage)) return Math.max(0, Math.round(damage));

  const flat = Array.isArray(damage[0]) ? damage.flat() : damage;
  if (flat.length === 0) return 0;

  return Math.round(flat.reduce((sum, v) => sum + v, 0) / flat.length);
}

// 실제 게임의 급소 확률(위력 상승 랭크별): critRatio 1=1/24, 2=1/8, 3=1/2, 4 이상=100%
const CRIT_CHANCE_BY_RATIO = { 1: 1 / 24, 2: 1 / 8, 3: 1 / 2, 4: 1 };

function rollCrit(critRatio) {
  const ratio = Math.min(4, Math.max(1, critRatio || 1));
  return Math.random() < (CRIT_CHANCE_BY_RATIO[ratio] ?? 1 / 24);
}

/** HP를 배틀 로그 표기용 퍼센트 문자열로 변환 (실제 게임 배틀 로그와 동일한 표기) */
function formatHpPercent(current, max) {
  if (!(max > 0)) return `${current}`;
  if (current <= 0) return '0%';
  const percent = Math.max(1, Math.min(100, Math.round((current / max) * 100)));
  return `${percent}%`;
}

/**
 * attacker가 moveId로 defender를 공격, defender의 새 상태와 게임 공식 문구 스타일의 로그 줄들을 반환.
 * (데미지는 항상 평균값 사용, 급소는 기술의 critRatio에 따라 실제 확률로 판정)
 */
function attack(attacker, defender, moveId) {
  const moveInfo = showdownIntegration.getMove(moveId);
  const isCrit = moveInfo ? rollCrit(moveInfo.critRatio) : false;

  const result = showdownIntegration.calculateDamage(
    attacker,
    defender,
    moveId,
    {},
    { ability: attacker.ability, item: attacker.item, isCrit }
  );

  if (!result.moveData) {
    return {
      defender,
      lines: [`${attacker.nickname}의 ${moveId} 사용 실패 (기술을 찾을 수 없음)`],
    };
  }

  const moveData = result.moveData;
  const lines = [`${attacker.nickname}의 ${moveData.name}!`];

  const defenderTypes = defender.types && defender.types.length ? defender.types : ['Normal'];
  const effectiveness = showdownIntegration.getTypeEffectiveness(moveData.type, defenderTypes);

  if (effectiveness === 0) {
    lines.push(`${defender.nickname}에게는 통하지 않았다!`);
    return { damage: 0, defender, lines };
  }

  if (!moveData.basePower) {
    // 변화기술(0위력): 데미지 없이 기술 사용 로그만 남긴다
    return { damage: 0, defender, lines };
  }

  if (result.error) {
    // 타입 상성상 무효는 위에서 이미 걸러졌으니, 여기 도달하는 오류는 계산 불가 케이스
    lines.push(`${defender.nickname}에게는 효과가 없었다...`);
    return { damage: 0, defender, lines };
  }

  if (isCrit) lines.push('급소에 맞았다!');
  if (effectiveness > 1) lines.push('효과가 굉장했다!');
  else if (effectiveness < 1) lines.push('효과가 별로인 듯하다...');

  const dmg = Math.min(defender.currentHP, pickDamageValue(result.damage));
  const nextHP = Math.max(0, defender.currentHP - dmg);
  const fainted = nextHP <= 0;
  const updatedDefender = { ...defender, currentHP: nextHP, fainted };

  lines.push(`${defender.nickname}에게 피해를 입혔다! (HP ${formatHpPercent(nextHP, defender.maxHP)})`);
  if (fainted) lines.push(`${defender.nickname}은(는) 쓰러졌다!`);

  return { damage: dmg, defender: updatedDefender, lines };
}

function aliveNotActed(participants, actedIds) {
  return participants.filter((p) => p && !p.fainted && !actedIds.includes(p.id));
}

/**
 * 이번 라운드에 아직 행동하지 않은 생존 참가자가 더 이상 없으면 라운드를 마무리한다.
 * (로그에 라운드 종료/다음 라운드 시작 표시를 남기고, 라운드 카운터를 올리고, 행동 기록을 초기화)
 */
function finalizeRoundIfComplete(state) {
  if (state.status !== 'ongoing') return state;

  const remaining = aliveNotActed(state.participants, state.actedParticipantIds);
  if (remaining.length > 0) return state;

  const finishedRound = state.round + 1;
  const log = [
    ...state.log,
    {
      round: finishedRound,
      phase: 'end',
      text: `--- ${finishedRound}라운드 종료 (보스 HP ${state.boss.currentHP}/${state.boss.maxHP}) ---`,
    },
  ];

  if (finishedRound >= (state.maxRounds || 100)) {
    return { ...state, round: finishedRound, status: 'timeout', log };
  }

  const nextRound = finishedRound + 1;
  log.push({ round: nextRound, phase: 'start', text: `--- ${nextRound}라운드 시작 ---` });

  return { ...state, round: finishedRound, status: 'ongoing', actedParticipantIds: [], log };
}

/** 참가자 한 명의 행동을 즉시 실행 (이번 라운드에 이미 행동했으면 무시) */
export function executeParticipantAction(state, participantId, moveId) {
  if (state.status !== 'ongoing' || !moveId || participantId == null) return state;
  if (state.actedParticipantIds.includes(participantId)) return state;

  const idx = state.participants.findIndex((p) => p && p.id === participantId && !p.fainted);
  if (idx === -1) return state;

  const roundNum = state.round + 1;
  const result = attack(state.participants[idx], state.boss, moveId);
  const boss = result.defender;
  const log = [
    ...state.log,
    ...result.lines.map((text) => ({ round: roundNum, phase: 'participant', text })),
  ];

  const next = {
    ...state,
    boss,
    actedParticipantIds: [...state.actedParticipantIds, participantId],
    log,
  };

  if (boss.currentHP <= 0) {
    return {
      ...next,
      status: 'win',
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (보스 HP 0/${boss.maxHP}) ---` }],
    };
  }

  return finalizeRoundIfComplete(next);
}

/**
 * 보스 행동을 즉시 실행. 라운드 진행과 무관하게 원하는 만큼 반복 실행 가능.
 * targetId로 'random'을 넘기면 그 시점에 살아있는 참가자 중 무작위로 대상을 고른다.
 */
export function executeBossAction(state, moveId, targetId) {
  if (state.status !== 'ongoing' || !moveId || targetId == null) return state;

  let resolvedTargetId = targetId;
  if (targetId === 'random') {
    const aliveParticipants = state.participants.filter((p) => p && !p.fainted);
    if (aliveParticipants.length === 0) return state;
    resolvedTargetId = aliveParticipants[Math.floor(Math.random() * aliveParticipants.length)].id;
  }

  const idx = state.participants.findIndex((p) => p && p.id === resolvedTargetId && !p.fainted);
  if (idx === -1) return state;

  const roundNum = state.round + 1;
  const result = attack(state.boss, state.participants[idx], moveId);
  const participants = state.participants.map((p, i) => (i === idx ? result.defender : p));
  const log = [
    ...state.log,
    ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text })),
  ];

  const next = { ...state, participants, log };

  if (!participants.some((p) => p && !p.fainted)) {
    return {
      ...next,
      status: 'loss',
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
    };
  }

  return finalizeRoundIfComplete(next);
}

/** 보스/참가자 입력 폼 데이터로부터 새 전투 상태 생성 */
export function createInitialBattleState({ boss, participants, maxRounds = 100 }) {
  return {
    boss: buildBattlePokemon(boss),
    participants: participants.map((p) => (p && p.position && p.position.trim() ? buildBattlePokemon(p) : null)),
    round: 0,
    status: 'ongoing',
    maxRounds,
    log: [{ round: 1, phase: 'start', text: '--- 1라운드 시작 ---' }],
    actedParticipantIds: [],
  };
}
