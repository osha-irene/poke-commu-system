import showdownIntegration from '../lib/showdownIntegration.js';
import { calculateHP, calculateStat, applyStatStage, NATURE_MODIFIERS } from '../lib/statCalculator.js';
import { STAT_LABEL, STATUS_LABEL, findCheerSkill, CHEER_MAX_USES } from '../lib/cheers.js';
import { resolutionSpeed } from '../lib/turnOrder.js';
import { isMoveBanned } from './bannedMoves.js';
import {
  emptyField,
  emptySideConditions,
  getField,
  getSideConditions,
  detectFieldEffect,
  isFieldMove,
  applyFieldEffect,
  buildFieldOptions,
  hasTailwind,
  isTrickRoom,
  weatherChipTick,
  grassyHealTick,
  tickFieldDurations,
  isGravity,
  WEATHER_DURATION,
  TERRAIN_DURATION,
  WEATHER_LABELS,
  TERRAIN_LABELS,
} from './fieldConditions.js';
import {
  abilityBlocksStatus,
  abilityBlocksFlinch,
  abilityBlocksConfusion,
  abilityBlocksAttract,
  abilityBlocksTaunt,
  priorityBonus,
  movesLast,
  firstChance,
  multiHitCount,
  residualHpChange,
  residualSelfStatus,
  immuneToStatusDamage,
  checkEndure,
  entryFieldFromAbility,
  hasIntimidate,
  abilityId,
  itemId,
  ignoresAbilities,
  hasSereneGrace,
  hasMagicBounce,
  blocksSecondaryLabel,
  onHitReactions,
  onKOBoost,
  onBelowHalf,
  endOfRoundBoost,
  itemAddsFlinch,
  hasShellBell,
  drainBonus,
  gripClawTurns,
  blocksSecondary,
  blocksStatDrop,
  hasContrary,
  hasSimple,
  onStatDropRetaliate,
  fieldDurationBonus,
  critStageBonus,
  noContact,
} from './traits.js';
import {
  isChargeMove,
  chargeTurnBoost,
  chargeTurnLine,
  chargeSkipped,
  causesRecharge,
  isProtectMove,
  breaksProtect,
  protectContactPunish,
  PROTECT_MOVES,
  ENDURE_MOVE,
  WIDE_GUARD_MOVE,
  QUICK_GUARD_MOVE,
  fixedDamage,
  isOHKO,
  ohkoAccuracy,
  counterKind,
  conditionalPowerMult,
  isFirstTurnOnly,
  isFutureMove,
  isWishMove,
  isHaze,
  isPartyCure,
  isReflectableStatus,
  rankManip,
  typeLoss,
  groundsTarget,
} from './moveMechanics.js';

// 냉동 상태에서 사용하면 스스로 해동되는 기술 (실제 게임 규칙)
const SELF_THAW_MOVES = new Set([
  'flamewheel',
  'sacredfire',
  'flareblitz',
  'fusionflare',
  'scald',
  'steameruption',
  'burnup',
  'pyroball',
  'matchagotcha',
]);

/** 우선도 일괄 처리 정렬용 스피드: 실효 스피드(성격·랭크·마비)에 순풍(2배)까지 반영 */
export function orderingSpeed(state, entity) {
  const spe = resolutionSpeed(entity);
  return hasTailwind(state, entity) ? spe * 2 : spe;
}
export { isTrickRoom };

// 범위기: allAdjacentFoes = 상대 전체, allAdjacent = 상대+아군 전체(지진/파도타기/폭발 등)
export function isSpreadMove(moveData) {
  return !!moveData && (moveData.target === 'allAdjacent' || moveData.target === 'allAdjacentFoes');
}
/** allAdjacent(지진/파도타기 등)만 아군까지 휩쓴다 */
function hitsAllies(moveData) {
  return !!moveData && moveData.target === 'allAdjacent';
}

// 우선도 일괄 처리에서 응원(철통방어/힘내라힘/치유의함성 등)에 부여하는 가상 우선도.
// 실제 게임엔 없는 개념이라, 규칙상 "응원은 그 라운드 다른 행동보다 먼저"에 맞춰 웬만한
// 선제공격기(신속 +2, 속임수 +3, 은혜갚기류 +4, 도우미 +5)보다 위·+6 미만인 5.5로 둔다.
export const CHEER_PRIORITY = 5.5;

const DEFAULT_BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
const FIXED_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const EMPTY_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const EMPTY_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
// 응원(철통방어/힘내라힘)이 임시로 걸 수 있는 스탯 — 라운드 전환마다 buffTimers를 감소시켜 만료시킨다
const BUFF_STATS = ['atk', 'def', 'spa', 'spd'];

/** 입력 폼 데이터(raw)를 실제 전투에 쓸 수 있는 파생 상태를 가진 객체로 변환 */
export function buildBattlePokemon(raw) {
  // 아군 참가자(position 필드를 가진 커스텀 유닛)는 레벨 50 / 성격 하드 / 도구 없음 / 특성 없음 /
  // 개체값 전부 31로 고정. 종족값/타입/노력치/기술/포지션/성별/조는 직접 입력값을 사용.
  // 보스는 이 고정 규칙 없이 입력값을 그대로 사용하되, HP 배수(hpMultiplier)만 별도 적용.
  const isParticipant = 'position' in raw;

  const ivs = isParticipant ? FIXED_IVS : raw.ivs || FIXED_IVS;
  const evs = raw.evs || EMPTY_EVS;
  const level = isParticipant ? 50 : raw.level || 50;
  const baseStats = raw.baseStats || DEFAULT_BASE_STATS;
  const types = raw.types && raw.types.length ? raw.types : ['Normal'];

  const baseMaxHP = calculateHP(baseStats.hp, ivs.hp, evs.hp, level);
  const hpMultiplier = !isParticipant && Number(raw.hpMultiplier) > 0 ? Number(raw.hpMultiplier) : 1;
  const maxHP = Math.max(1, Math.round(baseMaxHP * hpMultiplier));

  return {
    ...raw,
    ...(isParticipant ? { nature: 'hardy', item: '', ability: '' } : {}),
    isParticipant,
    nickname: raw.nickname?.trim() || raw.position?.trim() || '이름없음',
    baseStats,
    types,
    ivs,
    evs,
    level,
    moves: (raw.moves || []).filter(Boolean),
    baseMaxHP,
    maxHP,
    // 상태이상/조이기 데미지 틱은 레이드용으로 부풀린 maxHP가 아니라 이 "정상 배틀 기준" 체력을
    // 기준으로 계산한다 (규칙 V장 2항)
    formulaMaxHP: baseMaxHP,
    currentHP: maxHP,
    fainted: false,
    boosts: { ...EMPTY_BOOSTS },
    buffTimers: {},
    status: '',
    toxicCounter: 0,
    sleepTurns: 0, // 잠듦 남은 턴 (0이 되는 행동 시도에서 기상)
    drowsyTurns: 0, // 하품: 0이 되는 라운드 전환에 잠듦
    aquaRing: false,
    ingrain: false,
    lastMoveId: null,
    // 혼란/씨뿌리기/조이기/도발/앵콜/트집/회복봉인/헤롱헤롱/사슬묶기
    confusionTurns: 0,
    leechSeed: null,
    bindTurns: 0,
    tauntTurns: 0,
    encoreTurns: 0,
    encoreMove: null,
    tormentActive: false,
    healBlockTurns: 0,
    attractActive: false,
    disableTurns: 0,
    disableMove: null,
    // 풀죽음: 이번 턴에 아직 행동하지 않았고 더 빠른 상대의 풀죽음 부가효과에 맞으면 true.
    // 다음 행동 시도(resolveActionGate / 보스 배치 처리)에서 소모되고 라운드 전환 때도 초기화된다.
    flinched: false,
    // 모으기/재충전/대타출동/방어/카운터용 상태 (라운드 전환 시 protect·enduring·damagedThisRound·lastDamageTaken 초기화)
    chargingMove: null,
    mustRecharge: false,
    substitute: null, // { hp }
    protectedThisRound: null, // { type }
    protectStreak: 0,
    enduringThisRound: false,
    damagedThisRound: false,
    lastDamageTaken: null, // { amount, category }
    lastMoveFailed: false,
    hasActedEver: false,
    // 응원(뒤는맡기라고/끝내버려) 관련
    redirectActive: false,
    pendingFinisher: false,
    finisherTimer: 0,
    mustSkipTurn: false,
    cheerUsed: 0,
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

// 명중률/회피율 랭크 배율표 (실제 게임 공식, -6 ~ +6 스테이지)
const ACCURACY_STAGE_MULTIPLIER = [3 / 9, 3 / 8, 3 / 7, 3 / 6, 3 / 5, 3 / 4, 1, 4 / 3, 5 / 3, 2, 7 / 3, 8 / 3, 3];

/**
 * 기술의 명중 여부를 판정한다. accuracy: true(=alwaysHit, 스매쉬다운/에어로블래스트류처럼
 * "명중 판정 자체가 없는" 기술)는 랭크와 무관하게 항상 명중.
 * 그 외에는 (시전자 명중률 랭크 - 상대 회피율 랭크, ignoreEvasion 기술은 상대 회피율 무시)를
 * 배율로 환산해 기본 명중률에 곱한 확률로 판정한다.
 */
function rollAccuracy(moveData, attacker, defender, gravity) {
  if (moveData.alwaysHit || moveData.accuracy == null) return true;

  const accStage = attacker.boosts?.accuracy || 0;
  const evaStage = moveData.ignoreEvasion ? 0 : defender.boosts?.evasion || 0;
  const stage = clampStage(accStage - evaStage);
  const multiplier = ACCURACY_STAGE_MULTIPLIER[stage + 6];
  let acc = moveData.accuracy;
  if (gravity) acc = acc * (5 / 3); // 중력: 명중률 5/3배
  const hitChance = Math.min(100, acc * multiplier);

  return Math.random() * 100 < hitChance;
}

/** HP를 배틀 로그 표기용 퍼센트 문자열로 변환 (실제 게임 배틀 로그와 동일한 표기) */
function formatHpPercent(current, max) {
  if (!(max > 0)) return `${current}`;
  if (current <= 0) return '0%';
  const percent = Math.max(1, Math.min(100, Math.round((current / max) * 100)));
  return `${percent}%`;
}

function clampStage(v) {
  return Math.max(-6, Math.min(6, v));
}

const NATURE_STAT_IDX = { atk: 0, def: 1, spa: 2, spd: 3, spe: 4 };
/** 랭크 변화까지 반영한 실효 스탯 (힘흡수 회복량 등에 사용) */
function calcBoostedStat(entity, stat) {
  const raw = calculateStat(entity.baseStats[stat], entity.ivs[stat], entity.evs[stat], entity.level);
  const nat = (NATURE_MODIFIERS[String(entity.nature || 'hardy').toLowerCase()] || NATURE_MODIFIERS.hardy)[
    NATURE_STAT_IDX[stat]
  ];
  let v = Math.floor(raw * nat);
  v = applyStatStage(v, entity.boosts?.[stat] || 0);
  return v;
}

/**
 * 랭크 변화 적용. 심술꾸러기(contrary) 부호 반전, 단순(simple) 2배.
 * opts.fromOpponent=true면 상대가 거는 저하 → 클리어바디/맑은부적류가 막고 오기/승기로 역상승.
 * opts.lines 배열이 주어지면 특성 발동 문구를 push한다. 항상 새 pokemon만 반환.
 */
function applyStatDeltas(pokemon, deltas, opts = {}) {
  let eff = { ...deltas };
  if (hasContrary(pokemon)) eff = Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, -v]));
  if (hasSimple(pokemon)) eff = Object.fromEntries(Object.entries(eff).map(([k, v]) => [k, v * 2]));

  if (opts.fromOpponent && Object.values(eff).some((v) => v < 0)) {
    if (blocksStatDrop(pokemon)) {
      if (opts.lines) opts.lines.push(`${pokemon.nickname}은(는) 특성으로 능력이 떨어지지 않는다!`);
      eff = Object.fromEntries(Object.entries(eff).filter(([, v]) => v > 0));
    } else {
      const retal = onStatDropRetaliate(pokemon);
      if (retal) {
        Object.entries(retal).forEach(([k, v]) => (eff[k] = (eff[k] || 0) + v));
        if (opts.lines) opts.lines.push(`${pokemon.nickname}의 특성으로 능력이 크게 올랐다!`);
      }
    }
  }

  const boosts = { ...pokemon.boosts };
  Object.entries(eff).forEach(([stat, delta]) => {
    if (delta) boosts[stat] = clampStage((boosts[stat] || 0) + delta);
  });
  return { ...pokemon, boosts };
}

/** 응원(철통방어/힘내라힘)처럼 정해진 랭크값을 N턴 동안 고정으로 거는 버프 (라운드 전환마다 buffTimers 감소, 0되면 원복) */
function applyStatBuff(participant, buffs, turns) {
  const boosts = { ...participant.boosts };
  const buffTimers = { ...participant.buffTimers };
  Object.entries(buffs).forEach(([stat, stage]) => {
    boosts[stat] = stage;
    buffTimers[stat] = turns;
  });
  return { ...participant, boosts, buffTimers };
}

function describeStatChange(nickname, deltas) {
  return Object.entries(deltas)
    .filter(([, delta]) => delta)
    .map(([stat, delta]) => `${nickname}의 ${STAT_LABEL[stat] || stat}이(가) ${delta > 0 ? '올랐다' : '떨어졌다'}!`);
}

/** 회복기(생명의물방울/자기재생 등)를 entity 본인에게 적용하고, 회복량을 최대체력 대비 %로 로그에 남긴다 */
function applyHealToEntity(entity, healSpec) {
  if (!entity || entity.fainted) return { entity, lines: [] };

  if (entity.healBlockTurns > 0) {
    return { entity, lines: [`${entity.nickname}은(는) 회복 봉인 상태라 회복할 수 없다!`] };
  }

  const healFrac = Array.isArray(healSpec) ? healSpec[0] / healSpec[1] : healSpec;
  if (!(healFrac > 0)) return { entity, lines: [] };

  const rawHeal = Math.max(1, Math.round(entity.maxHP * healFrac));
  const nextHP = Math.min(entity.maxHP, entity.currentHP + rawHeal);
  const actualHeal = nextHP - entity.currentHP;

  if (actualHeal <= 0) {
    return { entity, lines: [`${entity.nickname}은(는) 이미 HP가 가득하다!`] };
  }

  const healPercent = Math.round((actualHeal / entity.maxHP) * 100);
  const line =
    `${entity.nickname}의 HP가 ${healPercent}% 회복했다! (+${actualHeal}, ` +
    `현재 HP ${formatHpPercent(nextHP, entity.maxHP)})`;

  return { entity: { ...entity, currentHP: nextHP }, lines: [line] };
}

function isStatusImmune(status, types) {
  if (status === 'brn' && types.includes('Fire')) return true;
  if ((status === 'psn' || status === 'tox') && (types.includes('Poison') || types.includes('Steel'))) return true;
  if (status === 'frz' && types.includes('Ice')) return true;
  return false;
}

/** 타입/특성으로 status 획득이 막히는 이유 문자열, 안 막히면 null */
function statusImmuneReason(target, status, state, ignoreAbility) {
  if (isStatusImmune(status, target.types || [])) return `${target.nickname}에게는 효과가 없다!`;
  if (!ignoreAbility && abilityBlocksStatus(target, status, state))
    return `${target.nickname}은(는) 특성으로 상태이상에 걸리지 않는다!`;
  return null;
}

/** status를 target에 실제로 부여한 새 객체 (잠듦이면 1~3턴 카운터도 세팅) */
function withStatus(target, status) {
  const patch = { status, toxicCounter: status === 'tox' ? 1 : 0 };
  if (status === 'slp') patch.sleepTurns = 1 + Math.floor(Math.random() * 3);
  return { ...target, ...patch };
}

/** 기술의 volatileStatus(혼란/씨뿌리기/조이기/도발/앵콜/트집/회복봉인/사슬묶기)를 target에 적용 */
function applyVolatileStatus(target, volatileId, lines, sourceAttacker) {
  if (!target || target.fainted || !volatileId) return target;

  switch (volatileId) {
    case 'confusion':
      if (target.confusionTurns > 0) return target;
      if (abilityBlocksConfusion(target)) {
        lines.push(`${target.nickname}은(는) 마이페이스로 혼란에 빠지지 않는다!`);
        return target;
      }
      lines.push(`${target.nickname}은(는) 혼란에 빠졌다!`);
      return { ...target, confusionTurns: 1 + Math.floor(Math.random() * 4) };
    case 'flinch':
      if (target.flinched) return target;
      if (abilityBlocksFlinch(target)) {
        lines.push(`${target.nickname}은(는) 정신력으로 풀죽지 않는다!`);
        return target;
      }
      lines.push(`${target.nickname}은(는) 풀죽었다!`);
      return { ...target, flinched: true };
    case 'yawn':
      if (target.status || target.drowsyTurns > 0) return target;
      if (abilityBlocksStatus(target, 'slp')) return target;
      lines.push(`${target.nickname}은(는) 하품을 했다!`);
      return { ...target, drowsyTurns: 2 };
    case 'aquaring':
      if (target.aquaRing) return target;
      lines.push(`${target.nickname}은(는) 아쿠아링을 둘렀다!`);
      return { ...target, aquaRing: true };
    case 'substitute': {
      if (target.substitute) {
        lines.push(`${target.nickname}은(는) 이미 분신이 있다!`);
        return target;
      }
      const cost = Math.floor(target.maxHP / 4);
      if (target.currentHP <= cost) {
        lines.push(`${target.nickname}은(는) HP가 부족해 분신을 만들 수 없다!`);
        return target;
      }
      lines.push(`${target.nickname}은(는) 분신을 만들었다!`);
      return { ...target, currentHP: target.currentHP - cost, substitute: { hp: cost } };
    }
    case 'ingrain':
      if (target.ingrain) return target;
      lines.push(`${target.nickname}은(는) 땅에 뿌리를 내렸다!`);
      return { ...target, ingrain: true };
    case 'leechseed':
      if (target.leechSeed || (target.types || []).includes('Grass')) return target;
      lines.push(`${target.nickname}에게 씨앗이 심어졌다!`);
      return {
        ...target,
        leechSeed: {
          sourceIsBoss: !sourceAttacker.isParticipant,
          sourceId: sourceAttacker.isParticipant ? sourceAttacker.id : null,
        },
      };
    case 'partiallytrapped':
      if (target.bindTurns > 0) return target;
      lines.push(`${target.nickname}은(는) 조여져 빠져나갈 수 없게 되었다!`);
      return { ...target, bindTurns: 4 + Math.floor(Math.random() * 2) };
    case 'taunt':
      if (target.tauntTurns > 0) return target;
      if (abilityBlocksTaunt(target)) {
        lines.push(`${target.nickname}에게는 효과가 없다!`);
        return target;
      }
      lines.push(`${target.nickname}은(는) 도발에 걸렸다!`);
      return { ...target, tauntTurns: 3 };
    case 'encore':
      if (target.encoreTurns > 0 || !target.lastMoveId) return target;
      lines.push(`${target.nickname}에게 앵콜이 걸렸다!`);
      return { ...target, encoreTurns: 3, encoreMove: target.lastMoveId };
    case 'torment':
      if (target.tormentActive) return target;
      lines.push(`${target.nickname}은(는) 트집이 났다!`);
      return { ...target, tormentActive: true };
    case 'healblock':
      if (target.healBlockTurns > 0) return target;
      lines.push(`${target.nickname}은(는) 회복 봉인 상태가 되었다!`);
      return { ...target, healBlockTurns: 5 };
    case 'disable':
      if (target.disableTurns > 0 || !target.lastMoveId) return target;
      lines.push(`${target.nickname}의 기술이 사슬묶였다!`);
      return { ...target, disableTurns: 4, disableMove: target.lastMoveId };
    default:
      return target;
  }
}

/**
 * attacker가 moveId로 defender를 공격. 데미지뿐 아니라 랭크 변화/상태이상/변화상태까지 반영한
 * attacker/defender의 새 상태와 게임 공식 문구 스타일의 로그 줄들을 반환.
 * (데미지는 항상 평균값 사용, 급소는 기술의 critRatio에 따라 실제 확률로 판정)
 */
function attack(attacker, defender, moveId, options = {}) {
  const moveInfo = showdownIntegration.getMove(moveId);
  const isCrit = moveInfo ? rollCrit(moveInfo.critRatio) : false;

  // 날씨/필드/사이드컨디션(리플렉터·빛의장막·오로라베일·순풍)은 @smogon/calc에 넘겨 데미지 배율에 반영
  const fld = options.field || {};
  const dmgFieldState = {
    gameType: 'Singles',
    weather: fld.weather || undefined,
    terrain: fld.terrain || undefined,
    attackerSide: { isTailwind: !!fld.attackerTailwind },
    defenderSide: {
      isReflect: !!fld.defenderReflect,
      isLightScreen: !!fld.defenderLightScreen,
      isAuroraVeil: !!fld.defenderAuroraVeil,
    },
  };

  // 연속기(씨기관총 등 [2,5])는 실제 타수를 굴려서 @smogon/calc에 넘긴다 (스킬링크/구애의주사위면 5회)
  const moveInfoForHits = moveInfo || showdownIntegration.getMove(moveId);
  const rolledHits = multiHitCount(moveInfoForHits, attacker);

  const result = showdownIntegration.calculateDamage(
    attacker,
    defender,
    moveId,
    dmgFieldState,
    { ability: attacker.ability, item: attacker.item, isCrit, hits: rolledHits || undefined }
  );

  if (!result.moveData) {
    return {
      attacker,
      defender,
      lines: [`${attacker.nickname}의 ${moveId} 사용 실패 (기술을 찾을 수 없음)`],
    };
  }

  const moveData = result.moveData;
  moveData._wasCrit = isCrit;
  const lines = [`${attacker.nickname}의 ${moveData.name}!`];
  let nextAttacker = { ...attacker, lastMoveId: moveData.id, hasActedEver: true, lastMoveFailed: false };
  let nextDefender = defender;
  const roundNum = options.roundNum || 1;
  const ignoreAbility = ignoresAbilities(attacker) || !!options.ignoreAbility;

  // ── 모으기(2턴) 기술 ──
  if (isChargeMove(moveData)) {
    if (nextAttacker.chargingMove === moveData.id) {
      nextAttacker = { ...nextAttacker, chargingMove: null }; // 이번이 발동 턴
    } else {
      const skip = chargeSkipped(moveData, nextAttacker, fld.weather);
      if (!skip) {
        const boost = chargeTurnBoost(moveData);
        if (boost) nextAttacker = applyStatDeltas(nextAttacker, boost);
        lines.push(chargeTurnLine(nextAttacker, moveData));
        if (boost) lines.push(...describeStatChange(nextAttacker.nickname, boost));
        return { attacker: { ...nextAttacker, chargingMove: moveData.id }, defender: nextDefender, lines };
      }
      if (skip === 'item') {
        nextAttacker = { ...nextAttacker, item: '' };
        lines.push(`${nextAttacker.nickname}은(는) 파워허브로 곧바로 공격했다!`);
      }
    }
  }

  // ── 첫 턴 한정(페인트/기습의일격 등)은 1라운드에만 성공 ──
  if (isFirstTurnOnly(moveData) && roundNum > 1) {
    lines.push(`${nextAttacker.nickname}의 ${moveData.name}은(는) 지금은 통하지 않는다!`);
    return { attacker: { ...nextAttacker, lastMoveFailed: true }, defender: nextDefender, lines };
  }

  // ── 상대가 이번 라운드에 방어했는가 ──
  if (!(moveData.target === 'self' || moveData.target === 'allies' || moveData.target === 'allySide') &&
      nextDefender.protectedThisRound && !breaksProtect(moveData)) {
    const pt = nextDefender.protectedThisRound.type;
    const blocked =
      pt === 'wideguard' ? isSpreadMove(moveData) : pt === 'quickguard' ? (moveData.priority || 0) > 0 : true;
    if (blocked) {
      lines.push(`${nextDefender.nickname}은(는) 방어했다!`);
      const isContact = moveData.flags && moveData.flags.contact && !noContact(nextAttacker, moveData);
      if (isContact && moveData.basePower) {
        const pun = protectContactPunish(pt, nextAttacker);
        if (pun) {
          if (pun.chip) {
            const c = Math.max(1, Math.floor((nextAttacker.formulaMaxHP || nextAttacker.maxHP) * pun.chip));
            const hp = Math.max(0, nextAttacker.currentHP - c);
            nextAttacker = { ...nextAttacker, currentHP: hp, fainted: hp <= 0 };
          }
          if (pun.status && !nextAttacker.status && !statusImmuneReason(nextAttacker, pun.status, options.state, ignoreAbility)) {
            nextAttacker = withStatus(nextAttacker, pun.status);
          }
          if (pun.boosts) nextAttacker = applyStatDeltas(nextAttacker, pun.boosts, { fromOpponent: true, lines });
          lines.push(pun.line);
        }
      }
      return { attacker: nextAttacker, defender: nextDefender, lines };
    }
  }

  // ── 대타출동(Substitute) ──
  if (!(moveData.target === 'self' || moveData.target === 'allies' || moveData.target === 'allySide') &&
      nextDefender.substitute && !(moveData.flags && (moveData.flags.sound || moveData.flags.bypasssub))) {
    if (moveData.category !== 'Status') {
      const fdSub = fixedDamage(moveData, nextAttacker, nextDefender);
      let d;
      if (isOHKO(moveData)) d = nextDefender.substitute.hp; // 일격기는 분신 즉시 파괴
      else if (fdSub != null) d = fdSub;
      else {
        const rd = pickDamageValue(result.damage);
        d = options.isSpread ? Math.floor(rd * 0.75) : rd;
      }
      const subHP = nextDefender.substitute.hp - d;
      if (subHP <= 0) {
        nextDefender = { ...nextDefender, substitute: null };
        lines.push(`${nextDefender.nickname}의 분신이 사라졌다!`);
      } else {
        nextDefender = { ...nextDefender, substitute: { hp: subHP } };
        lines.push(`${nextDefender.nickname}의 분신이 공격을 받아냈다!`);
      }
      return { attacker: nextAttacker, defender: nextDefender, lines, damage: 0 };
    }
    lines.push(`${nextDefender.nickname}의 분신에 가로막혔다!`);
    return { attacker: nextAttacker, defender: nextDefender, lines };
  }

  // 자신/자신의 조를 대상으로 하는 기술(회복기 등)은 "상대"라는 개념 자체가 없으므로
  // defender(보스 또는 더미로 넘어온 자기 자신)와의 타입 상성으로 무효 판정을 하면 안 된다
  // (생명의물방울(물)을 상대가 비행/땅 타입이라 "통하지 않았다"로 씹어버리는 등의 오류 방지)
  // 날씨/필드/트릭룸/사이드컨디션 설치기는 target이 'all'/'allySide'라 "상대"가 없다 — 상성·명중 판정 스킵
  const fieldFx = detectFieldEffect(moveData);
  const isSelfOrTeamTargeted =
    !!fieldFx ||
    moveData.target === 'self' ||
    moveData.target === 'allies' ||
    moveData.target === 'allySide';
  const defenderTypes = defender.types && defender.types.length ? defender.types : ['Normal'];
  const gravityOn = options.state ? isGravity(options.state) : false;
  // 중력/천개의화살/스매쉬다운/접지 상태면 땅 기술이 비행 타입에도 명중
  const grounded = gravityOn || defender.grounded || groundsTarget(moveData);
  const effTypes = grounded && moveData.type === 'Ground' ? defenderTypes.filter((t) => t !== 'Flying') : defenderTypes;
  let effectiveness = isSelfOrTeamTargeted
    ? 1
    : showdownIntegration.getTypeEffectiveness(moveData.type, effTypes.length ? effTypes : ['Normal']);
  // 프리즈드라이: 얼음 기술이지만 물 타입에 효과가 굉장 (얼음↔물 0.5배를 2배로 뒤집음)
  if (!isSelfOrTeamTargeted && moveData.id === 'freezedry' && defenderTypes.includes('Water')) {
    effectiveness *= 4;
  }
  // 배짱(scrappy): 노말·격투 기술이 고스트 타입에도 명중
  if (
    !isSelfOrTeamTargeted &&
    !ignoresAbilities(attacker) &&
    abilityId(attacker) === 'scrappy' &&
    (moveData.type === 'Normal' || moveData.type === 'Fighting') &&
    defenderTypes.includes('Ghost') &&
    effectiveness === 0
  ) {
    effectiveness = showdownIntegration.getTypeEffectiveness(moveData.type, defenderTypes.filter((t) => t !== 'Ghost'));
  }

  // 데미지 기술(고정 데미지·일격기 포함)만 타입 무효(0배)로 "통하지 않았다". 변화기술은 타입 상성을 무시하되
  // 전기자석파(전기)는 땅 타입에, 가루/포자 기술은 풀 타입에 무효.
  const isDamagingMove = moveData.category !== 'Status';
  if (!isSelfOrTeamTargeted) {
    if (isDamagingMove && effectiveness === 0) {
      lines.push(`${defender.nickname}에게는 통하지 않았다!`);
      return { attacker: nextAttacker, defender, lines };
    }
    if (!isDamagingMove) {
      if (moveData.id === 'thunderwave' && defenderTypes.includes('Ground')) {
        lines.push(`${defender.nickname}에게는 통하지 않았다!`);
        return { attacker: nextAttacker, defender, lines };
      }
      if (moveData.flags && moveData.flags.powder && defenderTypes.includes('Grass')) {
        lines.push(`${defender.nickname}에게는 효과가 없다! (풀 타입)`);
        return { attacker: nextAttacker, defender, lines };
      }
    }
  }

  // 명중 판정: accuracy: true(=alwaysHit)인 기술이 아니면 시전자 명중률 랭크 - 상대 회피율 랭크를
  // 배율로 환산해 기본 명중률에 곱한 확률로 판정한다 (자신/자신의 조 대상 기술은 애초에 빗나가지 않음)
  if (!isSelfOrTeamTargeted && !rollAccuracy(moveData, nextAttacker, defender, gravityOn)) {
    lines.push(`${nextAttacker.nickname}의 공격이 빗나갔다!`);

    // 옥탄포화/스틸빔: 명중 성공 여부와 무관하게 자신이 최대 HP의 절반을 잃는다
    if (moveData.mindBlownRecoil) {
      const selfDmg = Math.max(1, Math.ceil(nextAttacker.maxHP / 2));
      const selfHP = Math.max(0, nextAttacker.currentHP - selfDmg);
      const selfFainted = selfHP <= 0;
      lines.push(
        `${nextAttacker.nickname}은(는) 반동으로 최대 HP의 절반을 잃었다! (-${selfDmg}, 현재 HP ${formatHpPercent(selfHP, nextAttacker.maxHP)})`
      );
      if (selfFainted) lines.push(`${nextAttacker.nickname}은(는) 쓰러졌다!`);
      nextAttacker = { ...nextAttacker, currentHP: selfHP, fainted: selfFainted };
    }

    // 하이점프킥/점프킥: 빗나갔을 때만 발동하는 추락 피해 (원래 입혔을 데미지의 절반, 상대 최대체력 절반이 상한)
    if (moveData.hasCrashDamage && moveData.basePower) {
      const wouldBeDmg = pickDamageValue(result.damage);
      const crashCap = Math.floor((defender.maxHP || wouldBeDmg) / 2);
      const crashDmg = Math.max(1, Math.min(Math.floor(wouldBeDmg / 2), crashCap));
      const crashHP = Math.max(0, nextAttacker.currentHP - crashDmg);
      const crashFainted = crashHP <= 0;
      lines.push(
        `${nextAttacker.nickname}은(는) 추락 피해를 입었다! (-${crashDmg}, 현재 HP ${formatHpPercent(crashHP, nextAttacker.maxHP)})`
      );
      if (crashFainted) lines.push(`${nextAttacker.nickname}은(는) 쓰러졌다!`);
      nextAttacker = { ...nextAttacker, currentHP: crashHP, fainted: crashFainted };
    }

    return { attacker: nextAttacker, defender, lines };
  }

  // 헤롱헤롱(Attract): 서로 성별이 다를 때만 효과가 있음
  if (moveData.id === 'attract') {
    const aGender = attacker.gender;
    const dGender = defender.gender;
    if (abilityBlocksAttract(defender)) {
      lines.push(`${defender.nickname}은(는) 둔감으로 헤롱헤롱해지지 않는다!`);
    } else if (!aGender || !dGender || aGender === dGender) {
      lines.push(`${defender.nickname}에게는 효과가 없다!`);
    } else {
      nextDefender = { ...defender, attractActive: true };
      lines.push(`${defender.nickname}은(는) ${attacker.nickname}에게 반했다!`);
    }
    return { attacker: nextAttacker, defender: nextDefender, lines };
  }

  // ── 카운터/미러코트/메탈버스트: basePower가 0이지만 데미지기 (반사) ──
  const ckEarly = counterKind(moveData);
  if (ckEarly) {
    const taken = nextAttacker.lastDamageTaken;
    const ok =
      taken &&
      (ckEarly === 'any' ||
        (ckEarly === 'physical' && taken.category === 'Physical') ||
        (ckEarly === 'special' && taken.category === 'Special'));
    if (!ok) {
      lines.push(`${nextAttacker.nickname}의 ${moveData.name}은(는) 실패했다!`);
      return { attacker: { ...nextAttacker, lastMoveFailed: true }, defender, lines };
    }
    const cdmg = Math.min(defender.currentHP, Math.max(1, Math.floor(taken.amount * (ckEarly === 'any' ? 1.5 : 2))));
    const chp = Math.max(0, defender.currentHP - cdmg);
    nextDefender = { ...defender, currentHP: chp, fainted: chp <= 0, damagedThisRound: true };
    lines.push(`${defender.nickname}에게 ${cdmg}의 피해로 되받아쳤다! (HP ${formatHpPercent(chp, defender.maxHP)})`);
    if (chp <= 0) lines.push(`${defender.nickname}은(는) 쓰러졌다!`);
    return { attacker: nextAttacker, defender: nextDefender, lines, damage: cdmg };
  }

  if (!isDamagingMove) {
    // 변화기술: 랭크 변화/상태이상/변화상태/회복/날씨·필드·사이드컨디션 설치만 적용 (데미지 없음)

    // 날씨/필드(터레인)/트릭룸/사이드컨디션 설치 — 실제 반영은 호출부(executeParticipant/BossAction)에서
    // state.field / state.sideConditions 에 applyFieldEffect로 처리하고, 여기서는 감지 결과만 넘긴다
    if (fieldFx) {
      return { attacker: nextAttacker, defender: nextDefender, lines, fieldEffects: fieldFx };
    }

    // ── 방어류(방어·판별·킹실드·니들가드·와이드가드·순풍가드·버티기) ──
    if (isProtectMove(moveData) || moveData.id === WIDE_GUARD_MOVE || moveData.id === QUICK_GUARD_MOVE) {
      const streak = nextAttacker.protectStreak || 0;
      const success = streak === 0 || Math.random() < Math.pow(1 / 3, streak);
      if (!success) {
        lines.push(`${nextAttacker.nickname}은(는) 방어에 실패했다!`);
        return { attacker: { ...nextAttacker, protectStreak: 0, lastMoveFailed: true }, defender: nextDefender, lines };
      }
      if (moveData.id === ENDURE_MOVE) {
        lines.push(`${nextAttacker.nickname}은(는) 버틸 준비를 했다!`);
        return { attacker: { ...nextAttacker, enduringThisRound: true, protectStreak: streak + 1 }, defender: nextDefender, lines };
      }
      const ptype =
        moveData.id === WIDE_GUARD_MOVE ? 'wideguard' : moveData.id === QUICK_GUARD_MOVE ? 'quickguard' : moveData.id;
      lines.push(`${nextAttacker.nickname}은(는) 방어 태세를 취했다!`);
      return {
        attacker: { ...nextAttacker, protectedThisRound: { type: ptype }, protectStreak: streak + 1 },
        defender: nextDefender,
        lines,
        sideProtect: ptype === 'wideguard' || ptype === 'quickguard' ? { type: ptype } : null,
      };
    }

    // ── 매직미러: 상대가 건 반사 가능한 변화기술을 되돌린다 ──
    if (
      !ignoreAbility &&
      hasMagicBounce(nextDefender) &&
      isReflectableStatus(moveData) &&
      !(moveData.target === 'self' || moveData.target === 'allies' || moveData.target === 'allySide')
    ) {
      lines.push(`${nextDefender.nickname}은(는) 매직미러로 ${moveData.name}을(를) 되돌렸다!`);
      if (moveData.boosts) nextAttacker = applyStatDeltas(nextAttacker, moveData.boosts, { fromOpponent: true, lines });
      if (moveData.status && !nextAttacker.status && !statusImmuneReason(nextAttacker, moveData.status, options.state, ignoreAbility)) {
        nextAttacker = withStatus(nextAttacker, moveData.status);
        lines.push(`${nextAttacker.nickname}은(는) ${STATUS_LABEL[moveData.status] || moveData.status} 상태가 되었다!`);
      }
      if (moveData.volatileStatus) nextAttacker = applyVolatileStatus(nextAttacker, moveData.volatileStatus, lines, nextDefender);
      return { attacker: nextAttacker, defender: nextDefender, lines };
    }

    // ── 명경지수(Haze): 모든 랭크 변화 초기화 (호출부에서 필드 전체에 반영) ──
    if (isHaze(moveData)) {
      lines.push('모든 포켓몬의 능력 변화가 사라졌다!');
      return { attacker: { ...nextAttacker, boosts: { ...EMPTY_BOOSTS } }, defender: nextDefender, lines, hazeAll: true };
    }
    // ── 아로마테라피/치유방울: 상태이상 치유 (호출부에서 팀 전체에 반영) ──
    if (isPartyCure(moveData)) {
      lines.push('상쾌한 향기가 감돈다!');
      return {
        attacker: { ...nextAttacker, status: '', toxicCounter: 0, sleepTurns: 0 },
        defender: nextDefender,
        lines,
        partyCure: true,
      };
    }
    // ── 지연기: 미래예지/파멸의소원, 희망사항 (호출부에서 예약) ──
    if (isFutureMove(moveData)) {
      lines.push(`${nextAttacker.nickname}은(는) 미래를 향해 힘을 보냈다!`);
      return { attacker: nextAttacker, defender: nextDefender, lines, futureMove: { moveId: moveData.id } };
    }
    if (isWishMove(moveData)) {
      lines.push(`${nextAttacker.nickname}은(는) 소원을 빌었다!`);
      return { attacker: nextAttacker, defender: nextDefender, lines, wish: { heal: Math.floor(nextAttacker.maxHP / 2) } };
    }
    // ── 힘흡수(Strength Sap): 대상 공격 -1, 그 공격 수치만큼 회복 ──
    if (rankManip(moveData) === 'sap-atk') {
      const atkStat = calcBoostedStat(nextDefender, 'atk');
      nextDefender = applyStatDeltas(nextDefender, { atk: -1 }, { fromOpponent: true, lines });
      lines.push(`${nextDefender.nickname}의 공격이 떨어졌다!`);
      if (nextAttacker.healBlockTurns > 0) {
        lines.push(`${nextAttacker.nickname}은(는) 회복 봉인 상태다!`);
      } else {
        const healed = Math.min(nextAttacker.maxHP, nextAttacker.currentHP + Math.max(1, atkStat));
        if (healed > nextAttacker.currentHP) lines.push(`${nextAttacker.nickname}의 HP가 회복됐다! (+${healed - nextAttacker.currentHP})`);
        nextAttacker = { ...nextAttacker, currentHP: healed };
      }
      return { attacker: nextAttacker, defender: nextDefender, lines };
    }
    // ── 심리술(Psych Up): 대상 랭크 복사 ──
    if (rankManip(moveData) === 'copy-target') {
      lines.push(`${nextAttacker.nickname}은(는) ${nextDefender.nickname}의 능력 변화를 복사했다!`);
      return { attacker: { ...nextAttacker, boosts: { ...nextDefender.boosts } }, defender: nextDefender, lines };
    }
    // ── 뒤엎기(Topsy-Turvy): 대상 랭크 부호 반전 ──
    if (rankManip(moveData) === 'invert-target') {
      const inv = Object.fromEntries(Object.entries(nextDefender.boosts || {}).map(([k, v]) => [k, -v]));
      lines.push(`${nextDefender.nickname}의 능력 변화가 뒤집혔다!`);
      return { attacker: nextAttacker, defender: { ...nextDefender, boosts: inv }, lines };
    }

    if (moveData.boosts) {
      if (moveData.target === 'self') {
        nextAttacker = applyStatDeltas(nextAttacker, moveData.boosts);
        lines.push(...describeStatChange(nextAttacker.nickname, moveData.boosts));
      } else if (fld.defenderMist && Object.values(moveData.boosts).some((v) => v < 0)) {
        // 하얀 안개: 상대 진영이 걸어오는 능력 저하를 막는다 (상승은 그대로 적용)
        const positives = Object.fromEntries(Object.entries(moveData.boosts).filter(([, v]) => v > 0));
        lines.push(`${nextDefender.nickname}은(는) 하얀 안개에 보호받아 능력이 떨어지지 않는다!`);
        if (Object.keys(positives).length) {
          nextDefender = applyStatDeltas(nextDefender, positives);
          lines.push(...describeStatChange(nextDefender.nickname, positives));
        }
      } else {
        nextDefender = applyStatDeltas(nextDefender, moveData.boosts, { fromOpponent: true, lines });
        lines.push(...describeStatChange(nextDefender.nickname, moveData.boosts));
      }
    }

    if (moveData.status) {
      const immReason = statusImmuneReason(nextDefender, moveData.status, options.state, ignoreAbility);
      if (moveData.target !== 'self' && fld.defenderSafeguard) {
        lines.push(`${nextDefender.nickname}은(는) 신비의 부적에 보호받고 있다!`);
      } else if (nextDefender.status) {
        lines.push(`${nextDefender.nickname}에게는 효과가 없다! (이미 상태이상)`);
      } else if (immReason) {
        lines.push(immReason);
      } else {
        nextDefender = withStatus(nextDefender, moveData.status);
        lines.push(`${nextDefender.nickname}은(는) ${STATUS_LABEL[moveData.status] || moveData.status} 상태가 되었다!`);
      }
    }

    if (moveData.volatileStatus) {
      if (moveData.target === 'self') {
        nextAttacker = applyVolatileStatus(nextAttacker, moveData.volatileStatus, lines, nextAttacker);
      } else if (moveData.volatileStatus === 'confusion' && fld.defenderSafeguard) {
        lines.push(`${nextDefender.nickname}은(는) 신비의 부적에 보호받고 있다!`);
      } else {
        nextDefender = applyVolatileStatus(nextDefender, moveData.volatileStatus, lines, nextAttacker);
      }
    }

    // 생명의물방울/구애플로럴/자기재생 등: 자신(또는 자신의 조)을 회복시킨다. 팀 전체로 퍼지는
    // 부분(target === 'allies')은 executeParticipantAction에서 이 결과를 받은 뒤 같은 조 전체에
    // 추가로 적용한다 — 여기서는 시전자 본인 몫만 계산한다.
    if (moveData.heal) {
      const healResult = applyHealToEntity(nextAttacker, moveData.heal);
      nextAttacker = healResult.entity;
      lines.push(...healResult.lines);
    }

    // 잠자기: 다른 상태이상을 잠듦으로 덮어쓰고 체력 완전 회복 + 2턴 수면 (쇼다운 데이터엔 heal 값이 없어 별도 처리)
    let restHandled = false;
    if (moveData.id === 'rest') {
      restHandled = true;
      if (nextAttacker.healBlockTurns > 0) {
        lines.push(`${nextAttacker.nickname}은(는) 회복 봉인 상태라 잠들 수 없다!`);
      } else if (nextAttacker.currentHP >= nextAttacker.maxHP) {
        lines.push(`${nextAttacker.nickname}은(는) 이미 HP가 가득하다!`);
      } else {
        nextAttacker = { ...nextAttacker, currentHP: nextAttacker.maxHP, status: 'slp', sleepTurns: 2, toxicCounter: 0 };
        lines.push(`${nextAttacker.nickname}은(는) 잠들어서 체력을 모두 회복했다!`);
      }
    }

    if (!restHandled && !moveData.boosts && !moveData.status && !moveData.volatileStatus && !moveData.heal) {
      lines.push(`${defender.nickname}에게는 별다른 효과가 없었다.`);
    }

    return { attacker: nextAttacker, defender: nextDefender, lines };
  }

  if (result.error) {
    lines.push(`${defender.nickname}에게는 효과가 없었다...`);
    return { attacker: nextAttacker, defender, lines };
  }

  if (isCrit) lines.push('급소에 맞았다!');
  if (effectiveness > 1) lines.push('효과가 굉장했다!');
  else if (effectiveness < 1) lines.push('효과가 별로인 듯하다...');

  let selfFaintFromMove = false;
  let dmg;
  const fd = fixedDamage(moveData, nextAttacker, defender);
  const ck = counterKind(moveData);
  if (isOHKO(moveData)) {
    // 일격기: 명중식으로 판정, 맞으면 즉시 기절
    const acc = ohkoAccuracy(nextAttacker, defender);
    if (acc <= 0 || Math.random() * 100 >= acc) {
      lines.push(`${nextAttacker.nickname}의 공격이 빗나갔다!`);
      return { attacker: { ...nextAttacker, lastMoveFailed: true }, defender, lines };
    }
    dmg = defender.currentHP;
    lines.push('일격필살!');
  } else if (fd != null) {
    dmg = Math.min(defender.currentHP, Math.max(0, fd));
    if (moveData.id === 'finalgambit') selfFaintFromMove = true;
    if (dmg === 0) {
      lines.push(`${defender.nickname}에게는 효과가 없었다...`);
      return { attacker: nextAttacker, defender, lines };
    }
  } else if (ck) {
    // 카운터/미러코트/메탈버스트: 이번 라운드에 받은 데미지를 되돌린다
    const taken = nextAttacker.lastDamageTaken;
    const ok =
      taken &&
      (ck === 'any' || (ck === 'physical' && taken.category === 'Physical') || (ck === 'special' && taken.category === 'Special'));
    if (!ok) {
      lines.push(`${nextAttacker.nickname}의 ${moveData.name}은(는) 실패했다!`);
      return { attacker: { ...nextAttacker, lastMoveFailed: true }, defender, lines };
    }
    dmg = Math.min(defender.currentHP, Math.max(1, Math.floor(taken.amount * (ck === 'any' ? 1.5 : 2))));
  } else {
    const rawDmg = pickDamageValue(result.damage);
    dmg = options.isSpread ? Math.floor(rawDmg * 0.75) : rawDmg;
    const mult = conditionalPowerMult(moveData, nextAttacker, defender, {
      attackerFirst: options.attackerFirst,
      defenderActed: options.defenderActed,
      defenderDamagedThisRound: defender.damagedThisRound,
      attackerDamagedThisRound: nextAttacker.damagedThisRound,
      allyFaintedLastRound: options.allyFaintedLastRound,
    });
    if (mult !== 1) dmg = Math.round(dmg * mult);
    dmg = Math.min(defender.currentHP, dmg);
  }

  // 옹골참/기합의띠/기합의머리띠/버티기: 쓰러질 타격을 맞아도 HP 1로 버틴다
  const endure = checkEndure(defender, dmg, defender.currentHP >= defender.maxHP);
  if (endure.survive) dmg = defender.currentHP - 1;

  const nextHP = Math.max(0, defender.currentHP - dmg);
  const fainted = nextHP <= 0;
  nextDefender = { ...defender, currentHP: nextHP, fainted };
  if (endure.survive && endure.consumesItem) nextDefender.item = '';

  // 불꽃 타입 공격을 맞은 냉동 상태 대상은 해동된다
  if (!fainted && defender.status === 'frz' && moveData.type === 'Fire' && dmg > 0) {
    nextDefender.status = '';
    lines.push(`${defender.nickname}의 얼음이 녹았다!`);
  }

  lines.push(`${defender.nickname}에게 피해를 입혔다! (HP ${formatHpPercent(nextHP, defender.maxHP)})`);
  if (endure.survive) lines.push(endure.line);
  if (fainted) lines.push(`${defender.nickname}은(는) 쓰러졌다!`);

  // 이번 라운드 피격 기록 (카운터/눈사태/불의보복/앙갚음용)
  nextDefender = {
    ...nextDefender,
    damagedThisRound: true,
    lastDamageTaken: { amount: dmg, category: moveData.category },
  };

  // 클리어스모그: 데미지 + 대상 랭크 초기화
  if (rankManip(moveData) === 'reset-target' && !fainted) {
    nextDefender = { ...nextDefender, boosts: { ...EMPTY_BOOSTS } };
    lines.push(`${nextDefender.nickname}의 능력 변화가 사라졌다!`);
  }
  // 스펙트럴테프트: 대상 플러스 랭크를 훔쳐 자신에게
  if (rankManip(moveData) === 'steal-target') {
    const stolen = Object.fromEntries(Object.entries(nextDefender.boosts || {}).filter(([, v]) => v > 0));
    if (Object.keys(stolen).length) {
      nextAttacker = applyStatDeltas(nextAttacker, stolen);
      const dboost = { ...nextDefender.boosts };
      Object.keys(stolen).forEach((k) => (dboost[k] = 0));
      nextDefender = { ...nextDefender, boosts: dboost };
      lines.push(`${nextAttacker.nickname}은(는) ${nextDefender.nickname}의 능력 변화를 빼앗았다!`);
    }
  }
  // 천개의화살/스매쉬다운: 비행 대상 접지
  if (groundsTarget(moveData) && (nextDefender.types || []).includes('Flying')) {
    lines.push(`${nextDefender.nickname}은(는) 땅으로 떨어졌다!`);
    nextDefender = { ...nextDefender, grounded: true };
  }

  // 피격 시 방어 측 특성/도구 반응 (정전기·까칠한피부·약점보험·지구력·무른껍질·까칠한바위 등)
  const isContactHit =
    moveData.flags && moveData.flags.contact && !noContact(nextAttacker, moveData);
  const reactions = onHitReactions(
    nextDefender,
    nextAttacker,
    moveData,
    dmg,
    isContactHit,
    fainted,
    effectiveness > 1,
    ignoreAbility
  );
  if (reactions.attackerPatch) {
    const p = reactions.attackerPatch;
    if (p._chip) {
      const hp = Math.max(0, nextAttacker.currentHP - p._chip);
      nextAttacker = { ...nextAttacker, currentHP: hp, fainted: hp <= 0 };
    }
    if (p.status && !nextAttacker.status) nextAttacker = withStatus(nextAttacker, p.status);
    if (p.attractActive) nextAttacker = { ...nextAttacker, attractActive: true };
    if (p.boosts) nextAttacker = applyStatDeltas(nextAttacker, p.boosts, { fromOpponent: true, lines });
  }
  if (reactions.defenderPatch) {
    const p = reactions.defenderPatch;
    if (p.boosts) nextDefender = applyStatDeltas(nextDefender, p.boosts);
    if (p.item !== undefined) nextDefender = { ...nextDefender, item: p.item };
  }
  lines.push(...reactions.lines);

  // 킹스록/예리한이빨: 원래 풀죽음 없는 공격에 10% 풀죽음 추가
  if (!fainted && itemAddsFlinch(nextAttacker, moveData) && Math.random() < 0.1) {
    nextDefender = applyVolatileStatus(nextDefender, 'flinch', lines, nextAttacker);
  }
  // 조가비방울: 입힌 데미지의 1/8 회복
  if (dmg > 0 && hasShellBell(nextAttacker) && nextAttacker.healBlockTurns <= 0) {
    const h = Math.max(1, Math.floor(dmg / 8));
    const hp = Math.min(nextAttacker.maxHP, nextAttacker.currentHP + h);
    if (hp > nextAttacker.currentHP) {
      lines.push(`${nextAttacker.nickname}은(는) 조가비방울로 체력을 회복했다! (+${hp - nextAttacker.currentHP})`);
      nextAttacker = { ...nextAttacker, currentHP: hp };
    }
  }
  // 상대를 쓰러뜨렸을 때 특성(자기과신·비스트부스트 등)
  if (fainted) {
    const ko = onKOBoost(nextAttacker);
    if (ko) {
      nextAttacker = applyStatDeltas(nextAttacker, ko.boosts);
      lines.push(`${nextAttacker.nickname}의 ${ko.label}(으)로 능력이 올랐다!`);
    }
  } else {
    // HP 절반 밑으로 떨어졌을 때 특성(벌서크·분노의껍질)
    const bh = onBelowHalf(nextDefender, defender.currentHP);
    if (bh) {
      nextDefender = applyStatDeltas(nextDefender, bh.boosts);
      lines.push(`${nextDefender.nickname}의 ${bh.label}이(가) 발동했다!`);
    }
  }
  // 파괴광선류: 다음 행동 재충전
  if (causesRecharge(moveData)) {
    nextAttacker = { ...nextAttacker, mustRecharge: true };
  }
  // 번업/더블쇼크: 사용 후 해당 타입 상실
  const lostType = typeLoss(moveData);
  if (lostType && (nextAttacker.types || []).includes(lostType) && dmg > 0) {
    nextAttacker = { ...nextAttacker, types: nextAttacker.types.filter((t) => t !== lostType) };
    lines.push(`${nextAttacker.nickname}은(는) ${lostType} 타입을 잃었다!`);
  }
  // 목숨걸기: 시전자도 쓰러진다
  if (selfFaintFromMove) {
    nextAttacker = { ...nextAttacker, currentHP: 0, fainted: true };
    lines.push(`${nextAttacker.nickname}은(는) 쓰러졌다!`);
  }

  // 흡수(기가드레인/드레인킥 등): 입힌 데미지의 일정 비율만큼 자신을 회복
  if (moveData.drain && dmg > 0) {
    if (nextAttacker.healBlockTurns > 0) {
      lines.push(`${nextAttacker.nickname}은(는) 회복 봉인 상태라 흡수할 수 없다!`);
    } else {
      const [num, den] = moveData.drain;
      const rawHeal = Math.max(1, Math.round((dmg * num * drainBonus(nextAttacker)) / den));
      const healedHP = Math.min(nextAttacker.maxHP, nextAttacker.currentHP + rawHeal);
      const actualHeal = healedHP - nextAttacker.currentHP;
      if (actualHeal > 0) {
        const healPercent = Math.round((actualHeal / nextAttacker.maxHP) * 100);
        lines.push(
          `${nextAttacker.nickname}은(는) 체력을 흡수했다! HP가 ${healPercent}% 회복했다! ` +
            `(+${actualHeal}, 현재 HP ${formatHpPercent(healedHP, nextAttacker.maxHP)})`
        );
        nextAttacker = { ...nextAttacker, currentHP: healedHP };
      }
    }
  }

  // 반동(테이크다운/플레어드라이브/브레이브버드 등): 입힌 데미지의 일정 비율만큼 자신도 피해를 입는다
  if (moveData.recoil && dmg > 0) {
    const [rNum, rDen] = moveData.recoil;
    const recoilDmg = Math.max(1, Math.round((dmg * rNum) / rDen));
    const recoilHP = Math.max(0, nextAttacker.currentHP - recoilDmg);
    const recoilFainted = recoilHP <= 0;
    lines.push(
      `${nextAttacker.nickname}은(는) 반동으로 피해를 입었다! (-${recoilDmg}, 현재 HP ${formatHpPercent(recoilHP, nextAttacker.maxHP)})`
    );
    if (recoilFainted) lines.push(`${nextAttacker.nickname}은(는) 쓰러졌다!`);
    nextAttacker = { ...nextAttacker, currentHP: recoilHP, fainted: recoilFainted };
  }

  // 자폭급 반동(옥탄포화/스틸빔 등): 명중 성공 여부와 무관하게 최대 HP의 절반을 자신이 잃는다
  // (이 계산기는 명중 실패를 시뮬레이션하지 않으므로 사실상 매번 적용됨)
  if (moveData.mindBlownRecoil) {
    const selfDmg = Math.max(1, Math.ceil(nextAttacker.maxHP / 2));
    const selfHP = Math.max(0, nextAttacker.currentHP - selfDmg);
    const selfFainted = selfHP <= 0;
    lines.push(
      `${nextAttacker.nickname}은(는) 반동으로 최대 HP의 절반을 잃었다! (-${selfDmg}, 현재 HP ${formatHpPercent(selfHP, nextAttacker.maxHP)})`
    );
    if (selfFainted) lines.push(`${nextAttacker.nickname}은(는) 쓰러졌다!`);
    nextAttacker = { ...nextAttacker, currentHP: selfHP, fainted: selfFainted };
  }

  // 확정 자기효과(오버히트/드래곤에너지/파워제네레이터/절대영도킥 등: secondary의 "확률부가효과"와
  // 달리 명중만 하면 무조건 적용되는 자신 랭크변화 — 상대가 이 공격으로 기절해도 그대로 적용된다)
  if (moveData.self?.boosts) {
    const selfChance = moveData.self.chance ?? 100;
    if (Math.random() * 100 < selfChance) {
      nextAttacker = applyStatDeltas(nextAttacker, moveData.self.boosts);
      lines.push(...describeStatChange(nextAttacker.nickname, moveData.self.boosts));
    }
  }

  // 부가효과(덤벼들기의 공격 랭크 하락처럼 확률로 발동하는 랭크변화/상태이상/변화상태)
  // 천진난만(serenegrace) 특성이면 확률 2배, 반짝가루망토(covertcloak) 소지 대상이면 무효
  if (moveData.secondary && !fainted && blocksSecondary(nextDefender)) {
    lines.push(`${nextDefender.nickname}은(는) ${blocksSecondaryLabel(nextDefender)}(으)로 부가효과를 막았다!`);
  }
  if (moveData.secondary && !fainted && !blocksSecondary(nextDefender)) {
    let chance = moveData.secondary.chance ?? 100;
    if (hasSereneGrace(nextAttacker)) chance = Math.min(100, chance * 2);
    if (Math.random() * 100 < chance) {
      if (moveData.secondary.self?.boosts) {
        nextAttacker = applyStatDeltas(nextAttacker, moveData.secondary.self.boosts);
        lines.push(...describeStatChange(nextAttacker.nickname, moveData.secondary.self.boosts));
      }
      if (moveData.secondary.boosts) {
        if (fld.defenderMist && Object.values(moveData.secondary.boosts).some((v) => v < 0)) {
          const positives = Object.fromEntries(Object.entries(moveData.secondary.boosts).filter(([, v]) => v > 0));
          lines.push(`${nextDefender.nickname}은(는) 하얀 안개에 보호받아 능력이 떨어지지 않는다!`);
          if (Object.keys(positives).length) {
            nextDefender = applyStatDeltas(nextDefender, positives);
            lines.push(...describeStatChange(nextDefender.nickname, positives));
          }
        } else {
          nextDefender = applyStatDeltas(nextDefender, moveData.secondary.boosts, { fromOpponent: true, lines });
          lines.push(...describeStatChange(nextDefender.nickname, moveData.secondary.boosts));
        }
      }
      if (moveData.secondary.status) {
        if (fld.defenderSafeguard) {
          lines.push(`${nextDefender.nickname}은(는) 신비의 부적에 보호받고 있다!`);
        } else if (!nextDefender.status && !statusImmuneReason(nextDefender, moveData.secondary.status, options.state, ignoreAbility)) {
          nextDefender = withStatus(nextDefender, moveData.secondary.status);
          lines.push(
            `${nextDefender.nickname}은(는) ${STATUS_LABEL[moveData.secondary.status] || moveData.secondary.status} 상태가 되었다!`
          );
        }
      }
      if (moveData.secondary.volatileStatus) {
        if (moveData.secondary.volatileStatus === 'confusion' && fld.defenderSafeguard) {
          lines.push(`${nextDefender.nickname}은(는) 신비의 부적에 보호받고 있다!`);
        } else {
          nextDefender = applyVolatileStatus(nextDefender, moveData.secondary.volatileStatus, lines, nextAttacker);
        }
      }
    }
  }

  return { attacker: nextAttacker, defender: nextDefender, lines, damage: dmg };
}

function aliveNotActed(participants, actedIds) {
  return participants.filter((p) => p && !p.fainted && !actedIds.includes(p.id));
}

/** 화상/독/맹독 잔여 데미지 (라운드 종료 시 1회). 레이드 체력 배수가 아닌 원래 최대 체력 기준으로 계산 */
function applyStatusTick(entity) {
  if (!entity || entity.fainted || !entity.status) return { entity, lines: [] };
  // 포이즌힐: 독/맹독 잔여 데미지 무효 (회복은 라운드 종료 residualHpChange에서 처리)
  if (immuneToStatusDamage(entity)) {
    const toxicCounter = entity.status === 'tox' ? (entity.toxicCounter || 0) + 1 : entity.toxicCounter;
    return { entity: { ...entity, toxicCounter }, lines: [] };
  }

  const baseline = entity.formulaMaxHP || entity.maxHP;
  let dmg = 0;
  if (entity.status === 'brn') dmg = Math.max(1, Math.floor(baseline / 16));
  else if (entity.status === 'psn') dmg = Math.max(1, Math.floor(baseline / 8));
  else if (entity.status === 'tox') dmg = Math.max(1, Math.floor((baseline * ((entity.toxicCounter || 0) + 1)) / 16));
  else return { entity, lines: [] };

  const toxicCounter = entity.status === 'tox' ? (entity.toxicCounter || 0) + 1 : entity.toxicCounter;
  const currentHP = Math.max(0, entity.currentHP - dmg);
  const fainted = currentHP <= 0;
  const lines = [
    `${entity.nickname}은(는) ${STATUS_LABEL[entity.status] || entity.status}(으)로 피해를 입었다! ` +
      `(HP ${formatHpPercent(currentHP, entity.maxHP)})${fainted ? ` — ${entity.nickname} 기절` : ''}`,
  ];

  return { entity: { ...entity, currentHP, toxicCounter, fainted }, lines };
}

/**
 * 라운드 전환 시 조이기 데미지 틱 + 도발/앵콜/회복봉인/사슬묶기 지속시간을 갱신한다.
 * (혼란/마비/수면/냉동/헤롱헤롱은 매 행동 시도마다 resolveActionGate에서 처리)
 */
function advanceEntityVolatiles(entity) {
  if (!entity || entity.fainted) return { entity, lines: [] };

  const lines = [];
  let currentHP = entity.currentHP;
  let fainted = entity.fainted;
  let bindTurns = entity.bindTurns || 0;

  if (bindTurns > 0) {
    const dmg = Math.max(1, Math.floor((entity.formulaMaxHP || entity.maxHP) / 8));
    currentHP = Math.max(0, currentHP - dmg);
    fainted = currentHP <= 0;
    lines.push(`${entity.nickname}은(는) 조임 데미지를 입었다! (-${dmg})`);
    if (fainted) lines.push(`${entity.nickname}은(는) 쓰러졌다!`);
    bindTurns -= 1;
    if (bindTurns <= 0 && !fainted) lines.push(`${entity.nickname}의 조이기가 풀렸다!`);
  }

  const tauntTurns = Math.max(0, (entity.tauntTurns || 0) - 1);

  let encoreTurns = entity.encoreTurns || 0;
  let encoreMove = entity.encoreMove;
  if (encoreTurns > 0) {
    encoreTurns -= 1;
    if (encoreTurns <= 0) {
      encoreMove = null;
      if (!fainted) lines.push(`${entity.nickname}의 앵콜이 풀렸다!`);
    }
  }

  const healBlockTurns = Math.max(0, (entity.healBlockTurns || 0) - 1);

  let disableTurns = entity.disableTurns || 0;
  let disableMove = entity.disableMove;
  if (disableTurns > 0) {
    disableTurns -= 1;
    if (disableTurns <= 0) disableMove = null;
  }

  // 잠듦: 라운드 전환마다 1턴 감소, 0이 되면 기상
  let status = entity.status;
  let sleepTurns = entity.sleepTurns || 0;
  if (status === 'slp' && sleepTurns > 0) {
    sleepTurns -= 1;
    if (sleepTurns <= 0 && !fainted) {
      status = '';
      lines.push(`${entity.nickname}은(는) 눈을 떴다!`);
    }
  }

  // 하품: 카운트가 끝나면 잠듦 (이미 다른 상태이상이면 무효)
  let drowsyTurns = entity.drowsyTurns || 0;
  if (drowsyTurns > 0) {
    drowsyTurns -= 1;
    if (drowsyTurns <= 0 && !status && !fainted) {
      status = 'slp';
      sleepTurns = 1 + Math.floor(Math.random() * 3);
      lines.push(`${entity.nickname}은(는) 잠들어 버렸다!`);
    }
  }

  // 가속 등 라운드 종료 시 스탯이 오르는 특성
  let outEntity = {
    ...entity,
    currentHP,
    fainted,
    bindTurns,
    tauntTurns,
    encoreTurns,
    encoreMove,
    healBlockTurns,
    disableTurns,
    disableMove,
    drowsyTurns,
    status,
    sleepTurns,
    flinched: false,
    // 라운드 전환 시 리셋되는 "이번 라운드" 상태
    protectedThisRound: null,
    protectStreak: entity.protectedThisRound ? entity.protectStreak : 0,
    enduringThisRound: false,
    damagedThisRound: false,
    lastDamageTaken: null,
  };
  if (!fainted) {
    const eob = endOfRoundBoost(outEntity);
    if (eob) {
      outEntity = applyStatDeltas(outEntity, eob.boosts);
      lines.push(`${outEntity.nickname}의 ${eob.label}(으)로 스피드가 올랐다!`);
    }
    // 하얀허브: 내려간 능력치를 원래대로
    if (itemId(outEntity) === 'whiteherb' && Object.values(outEntity.boosts || {}).some((v) => v < 0)) {
      const b = { ...outEntity.boosts };
      Object.keys(b).forEach((k) => (b[k] = Math.max(0, b[k])));
      outEntity = { ...outEntity, boosts: b, item: '' };
      lines.push(`${outEntity.nickname}은(는) 하얀허브로 능력을 되돌렸다!`);
    }
  }

  return { entity: outEntity, lines };
}

/**
 * 라운드 전환 시 참가자별 응원 버프/지속효과를 갱신한다.
 * - 철통방어/힘내라힘(3턴 버프): 매 라운드 전환마다 1씩 감소, 0이 되면 스탯 원복
 * - 끝내버려: 시전한 다음 라운드에 물공/특공 3배(+4스택)가 발동하고, 그 버프가 끝나는 라운드
 *   전환 시 "다음 턴 행동불가"가 걸린다 (mustSkipTurn)
 * - 뒤는맡기라고(redirectActive)는 보스 행동 1회(이번 턴)만 받아내면 바로 해제되지만(executeBossAction에서
 *   처리), 그 전에 라운드가 넘어가 버리면 여기서 안전장치로 한 번 더 해제한다
 */
function advanceParticipantTurnState(p) {
  if (!p) return { participant: p, logs: [] };

  const boosts = { ...(p.boosts || {}) };
  const buffTimers = { ...(p.buffTimers || {}) };
  let pendingFinisher = p.pendingFinisher;
  let finisherTimer = p.finisherTimer || 0;
  let mustSkipTurn = false;
  const logs = [];

  BUFF_STATS.forEach((stat) => {
    if (buffTimers[stat] > 0) {
      buffTimers[stat] -= 1;
      if (buffTimers[stat] <= 0) {
        boosts[stat] = 0;
        buffTimers[stat] = 0;
      }
    }
  });

  if (finisherTimer > 0) {
    finisherTimer -= 1;
    if (finisherTimer <= 0) {
      boosts.atk = 0;
      boosts.spa = 0;
      mustSkipTurn = true;
      logs.push(`${p.nickname}은(는) 반동으로 이번 턴 행동할 수 없다!`);
    }
  } else if (pendingFinisher) {
    boosts.atk = 4;
    boosts.spa = 4;
    finisherTimer = 1;
    pendingFinisher = false;
    logs.push(`${p.nickname}의 힘이 폭발한다! (물리/특수공격 3배)`);
  }

  const buffed = {
    ...p,
    boosts,
    buffTimers,
    pendingFinisher,
    finisherTimer,
    mustSkipTurn,
    redirectActive: false,
  };

  const volatileTick = advanceEntityVolatiles(buffed);

  return { participant: volatileTick.entity, logs: [...logs, ...volatileTick.lines] };
}

/** 씨뿌리기: 걸려있는 대상의 체력을 깎아 심은 쪽(참가자 또는 보스)에게 회복시켜준다 */
function applyLeechSeedDrain(boss, participants) {
  let nextBoss = boss;
  let nextParticipants = participants;
  const lines = [];

  if (nextBoss.leechSeed && !nextBoss.fainted) {
    const dmg = Math.max(1, Math.floor((nextBoss.formulaMaxHP || nextBoss.maxHP) / 8));
    const nextHP = Math.max(0, nextBoss.currentHP - dmg);
    const fainted = nextHP <= 0;
    lines.push(`${nextBoss.nickname}은(는) 씨뿌리기로 체력을 빨렸다! (-${dmg})`);
    if (fainted) lines.push(`${nextBoss.nickname}은(는) 쓰러졌다!`);

    const sourceId = nextBoss.leechSeed.sourceId;
    nextBoss = { ...nextBoss, currentHP: nextHP, fainted };

    if (sourceId != null) {
      const srcIdx = nextParticipants.findIndex((p) => p && p.id === sourceId && !p.fainted);
      if (srcIdx !== -1) {
        const src = nextParticipants[srcIdx];
        const healed = Math.min(src.maxHP, src.currentHP + dmg);
        if (healed > src.currentHP) lines.push(`${src.nickname}은(는) 체력을 흡수했다! (+${healed - src.currentHP})`);
        nextParticipants = nextParticipants.map((p, i) => (i === srcIdx ? { ...p, currentHP: healed } : p));
      }
    }
  }

  nextParticipants = nextParticipants.map((p) => {
    if (!p || p.fainted || !p.leechSeed) return p;
    const dmg = Math.max(1, Math.floor((p.formulaMaxHP || p.maxHP) / 8));
    const nextHP = Math.max(0, p.currentHP - dmg);
    const fainted = nextHP <= 0;
    lines.push(`${p.nickname}은(는) 씨뿌리기로 체력을 빨렸다! (-${dmg})`);
    if (fainted) lines.push(`${p.nickname}은(는) 쓰러졌다!`);

    if (p.leechSeed.sourceIsBoss && !nextBoss.fainted) {
      const healed = Math.min(nextBoss.maxHP, nextBoss.currentHP + dmg);
      if (healed > nextBoss.currentHP) lines.push(`${nextBoss.nickname}은(는) 체력을 흡수했다! (+${healed - nextBoss.currentHP})`);
      nextBoss = { ...nextBoss, currentHP: healed };
    }

    return { ...p, currentHP: nextHP, fainted };
  });

  return { boss: nextBoss, participants: nextParticipants, lines };
}

/**
 * attack()이 돌려준 부수 효과 플래그(명경지수/파티치유/와이드가드/희망사항/미래예지)를 state에 반영.
 * actor는 그 기술을 쓴 주체(참가자 또는 보스).
 */
function applyResultSideEffects(state, result, actor, roundNum) {
  if (!result) return state;
  let next = state;
  const teamKey = actor && actor.isParticipant ? actor.team || '' : null; // null = 보스
  const isSameSide = (p) =>
    p && !p.fainted && (teamKey === null ? !p.isParticipant : (p.team || '') === teamKey);

  if (result.hazeAll) {
    next = {
      ...next,
      boss: { ...next.boss, boosts: { ...EMPTY_BOOSTS }, buffTimers: {} },
      participants: next.participants.map((p) => (p ? { ...p, boosts: { ...EMPTY_BOOSTS }, buffTimers: {} } : p)),
    };
  }
  if (result.partyCure) {
    next =
      teamKey === null
        ? { ...next, boss: { ...next.boss, status: '', toxicCounter: 0, sleepTurns: 0 } }
        : {
            ...next,
            participants: next.participants.map((p) =>
              isSameSide(p) ? { ...p, status: '', toxicCounter: 0, sleepTurns: 0 } : p
            ),
          };
  }
  if (result.sideProtect && teamKey !== null) {
    next = {
      ...next,
      participants: next.participants.map((p) =>
        isSameSide(p) ? { ...p, protectedThisRound: { type: result.sideProtect.type } } : p
      ),
    };
  }
  if (result.wish) {
    next = { ...next, pendingWish: { team: teamKey || '', boss: teamKey === null, heal: result.wish.heal, turns: 1 } };
  }
  if (result.futureMove && actor) {
    next = {
      ...next,
      pendingFutureSight: {
        targetBoss: teamKey !== null, // 참가자가 쓰면 보스가 대상
        turns: 2,
        moveId: result.futureMove.moveId,
        snapshot: {
          baseStats: actor.baseStats,
          ivs: actor.ivs,
          evs: actor.evs,
          level: actor.level,
          nature: actor.nature,
          types: actor.types,
          boosts: { ...actor.boosts },
          ability: actor.ability,
          item: actor.item,
          nickname: actor.nickname,
        },
      },
    };
  }
  return next;
}

/**
 * 라운드를 명시적으로 종료하고 다음 라운드로 넘어간다. 참가자가 다 행동하지 않았어도(보스 행동을
 * 더 하고 싶을 수 있으므로) 강제로 끝내지 않고, 사용자가 이 함수를 호출했을 때만 라운드가 넘어간다
 * — 보스는 라운드 진행과 무관하게 언제든 원하는 만큼 행동할 수 있다.
 */
export function endRound(state) {
  if (state.status !== 'ongoing') return state;

  const finishedRound = state.round + 1;
  let log = [...state.log];

  // 1) 상태이상(화상/독/맹독) 잔여 데미지 — 배수 곱하기 전 원래 체력 기준, 라운드 종료 시 1회만 적용
  const bossTick = applyStatusTick(state.boss);
  let boss = bossTick.entity;
  log.push(...bossTick.lines.map((text) => ({ round: finishedRound, phase: 'status', text })));

  let participants = state.participants.map((p) => {
    if (!p) return p;
    const tick = applyStatusTick(p);
    log.push(...tick.lines.map((text) => ({ round: finishedRound, phase: 'status', text })));
    return tick.entity;
  });

  // 1-1) 모래바람/싸라기눈 턴종료 피해 + 그래스필드 회복 + 특성/도구/변화상태 지속 회복·피해 + 화염/맹독구슬
  const field = getField(state);
  const residualTick = (entity) => {
    if (!entity) return entity;
    let e = entity;
    const chip = weatherChipTick(e, field.weather);
    log.push(...chip.lines.map((text) => ({ round: finishedRound, phase: 'status', text })));
    e = chip.entity;
    const heal = grassyHealTick(e, field.terrain);
    log.push(...heal.lines.map((text) => ({ round: finishedRound, phase: 'status', text })));
    e = heal.entity;

    if (!e.fainted) {
      const res = residualHpChange(e, state);
      if (res.delta) {
        const currentHP = Math.max(0, Math.min(e.maxHP, e.currentHP + res.delta));
        if (currentHP !== e.currentHP) {
          const fainted = currentHP <= 0;
          e = { ...e, currentHP, fainted };
          log.push(
            ...res.lines.map((text) => ({ round: finishedRound, phase: 'status', text })),
            ...(fainted ? [{ round: finishedRound, phase: 'status', text: `${e.nickname}은(는) 쓰러졌다!` }] : [])
          );
        }
      }
      const selfStat = residualSelfStatus(e);
      if (selfStat) {
        e = withStatus(e, selfStat.status);
        log.push({ round: finishedRound, phase: 'status', text: selfStat.line });
      }
    }
    return e;
  };
  boss = residualTick(boss);
  participants = participants.map(residualTick);

  // 희망사항: 예약 라운드가 되면 같은 조(또는 보스)를 회복
  let pendingWish = state.pendingWish || null;
  if (pendingWish) {
    pendingWish = { ...pendingWish, turns: pendingWish.turns - 1 };
    if (pendingWish.turns <= 0) {
      const healTarget = (p) =>
        p && !p.fainted && p.currentHP < p.maxHP && (pendingWish.boss ? !p.isParticipant : (p.team || '') === pendingWish.team);
      const doHeal = (p) => {
        if (!healTarget(p)) return p;
        const hp = Math.min(p.maxHP, p.currentHP + pendingWish.heal);
        log.push({ round: finishedRound, phase: 'status', text: `${p.nickname}의 소원이 이루어졌다! (+${hp - p.currentHP})` });
        return { ...p, currentHP: hp };
      };
      if (pendingWish.boss) boss = doHeal(boss);
      else participants = participants.map(doHeal);
      pendingWish = null;
    }
  }

  // 미래예지/파멸의소원: 2라운드 뒤 보스에게 지연 데미지
  let pendingFutureSight = state.pendingFutureSight || null;
  if (pendingFutureSight) {
    pendingFutureSight = { ...pendingFutureSight, turns: pendingFutureSight.turns - 1 };
    if (pendingFutureSight.turns <= 0 && pendingFutureSight.targetBoss && !boss.fainted) {
      const snap = { ...pendingFutureSight.snapshot, currentHP: 1, maxHP: 999, fainted: false };
      const r = showdownIntegration.calculateDamage(snap, boss, pendingFutureSight.moveId, {}, {});
      const fdmg = Math.min(boss.currentHP, pickDamageValue(r.damage));
      const hp = Math.max(0, boss.currentHP - fdmg);
      log.push({ round: finishedRound, phase: 'status', text: `미래에서 보낸 공격이 ${boss.nickname}을(를) 덮쳤다! (-${fdmg})` });
      boss = { ...boss, currentHP: hp, fainted: hp <= 0 };
      pendingFutureSight = null;
    }
  }

  log.push({
    round: finishedRound,
    phase: 'end',
    text: `--- ${finishedRound}라운드 종료 (보스 HP ${formatHpPercent(boss.currentHP, boss.maxHP)}) ---`,
  });

  if (boss.currentHP <= 0) {
    return { ...state, boss, participants, round: finishedRound, status: 'win', log };
  }
  if (!participants.some((p) => p && !p.fainted)) {
    return { ...state, boss, participants, round: finishedRound, status: 'loss', log };
  }
  if (finishedRound >= (state.maxRounds || 6)) {
    return { ...state, boss, participants, round: finishedRound, status: 'timeout', log };
  }

  // 2) 다음 라운드로 전환: 응원/버프 만료, 조이기·도발·앵콜·회복봉인·사슬묶기 지속시간 감소, 씨뿌리기 흡수
  const nextRound = finishedRound + 1;

  const advanced = participants.map((p) => advanceParticipantTurnState(p));
  participants = advanced.map((a) => a.participant);
  const statusLogs = advanced.flatMap((a) => a.logs);

  const bossVolatileTick = advanceEntityVolatiles(boss);
  boss = bossVolatileTick.entity;

  const leech = applyLeechSeedDrain(boss, participants);
  boss = leech.boss;
  participants = leech.participants;

  // 날씨/필드/트릭룸/사이드컨디션 지속시간 감소 + 만료 로그
  const fieldTick = tickFieldDurations(getField(state), getSideConditions(state));

  log.push({ round: nextRound, phase: 'start', text: `--- ${nextRound}라운드 시작 ---` });
  log = [
    ...log,
    ...statusLogs.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...bossVolatileTick.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...leech.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...fieldTick.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
  ];

  // 끝내버려 반동 등으로 다음 라운드에 행동 불가한 참가자는 자동으로 "행동 완료" 처리해 선택지에서 뺀다
  const skippedIds = participants.filter((p) => p && !p.fainted && p.mustSkipTurn).map((p) => p.id);
  skippedIds.forEach((id) => {
    const p = participants.find((x) => x && x.id === id);
    if (p) log.push({ round: nextRound, phase: 'status', text: `${p.nickname}은(는) 이번 턴 행동할 수 없다!` });
  });

  return {
    ...state,
    boss,
    participants,
    field: fieldTick.field,
    sideConditions: fieldTick.sideConditions,
    pendingWish,
    pendingFutureSight,
    round: finishedRound,
    status: 'ongoing',
    actedParticipantIds: skippedIds,
    log,
  };
}

/** 이번 라운드에 아직 행동하지 않은 생존 참가자 수 (UI에서 "라운드 종료" 전 안내용) */
export function countUnactedParticipants(state) {
  return aliveNotActed(state.participants, state.actedParticipantIds).length;
}

/** 마비/수면/냉동/헤롱헤롱/혼란처럼 행동 시도 자체를 가로막는 상태를 판정한다 */
function resolveActionGate(attacker, moveId) {
  const lines = [];
  let a = attacker;

  if (a.flinched) {
    lines.push(`${a.nickname}은(는) 풀죽어서 움직일 수 없다!`);
    return { attacker: { ...a, flinched: false }, canAct: false, lines };
  }

  // 재충전: 파괴광선·기가임팩트 등을 쓴 다음 행동은 날아간다
  if (a.mustRecharge) {
    lines.push(`${a.nickname}은(는) 반동으로 움직일 수 없다! (재충전)`);
    return { attacker: { ...a, mustRecharge: false }, canAct: false, lines };
  }

  // 잠듦: 라운드 전환 때 sleepTurns가 1씩 줄고(advanceEntityVolatiles), 0이 되는 전환에서 깬다.
  // 여기(행동 시도)에서는 자고 있으면 무조건 행동 불가 — 보스가 라운드당 여러 번 행동해도 잠은 유지된다.
  if (a.status === 'slp') {
    lines.push(`${a.nickname}은(는) 쿨쿨 잠들어 있다.`);
    return { attacker: a, canAct: false, lines };
  }

  if (a.status === 'frz') {
    const moveInfo = moveId ? showdownIntegration.getMove(moveId) : null;
    if (moveInfo && SELF_THAW_MOVES.has(moveInfo.id)) {
      lines.push(`${a.nickname}의 얼음이 ${moveInfo.name}(으)로 녹았다!`);
      a = { ...a, status: '' };
    } else if (Math.random() < 0.2) {
      lines.push(`${a.nickname}의 얼음이 녹았다!`);
      a = { ...a, status: '' };
    } else {
      lines.push(`${a.nickname}은(는) 얼어붙어서 움직일 수 없다!`);
      return { attacker: a, canAct: false, lines };
    }
  }

  if (a.attractActive && Math.random() < 0.5) {
    lines.push(`${a.nickname}은(는) 헤롱헤롱해서 움직일 수 없었다!`);
    return { attacker: a, canAct: false, lines };
  }

  if (a.confusionTurns > 0) {
    const turns = a.confusionTurns - 1;
    a = { ...a, confusionTurns: turns };
    if (turns <= 0) lines.push(`${a.nickname}의 혼란이 풀렸다!`);

    if (Math.random() < 1 / 3) {
      const base = a.formulaMaxHP || a.maxHP;
      const dmg = Math.max(1, Math.floor(base / 8));
      const nextHP = Math.max(0, a.currentHP - dmg);
      const fainted = nextHP <= 0;
      lines.push(`${a.nickname}은(는) 혼란으로 자신을 공격했다! (-${dmg})`);
      if (fainted) lines.push(`${a.nickname}은(는) 쓰러졌다!`);
      a = { ...a, currentHP: nextHP, fainted };
      return { attacker: a, canAct: false, lines };
    }
  }

  if (a.status === 'par' && Math.random() < 0.25) {
    lines.push(`${a.nickname}은(는) 몸이 저려서 움직일 수 없다!`);
    return { attacker: a, canAct: false, lines };
  }

  return { attacker: a, canAct: true, lines };
}

/** 도발/사슬묶기/트집/앵콜처럼 "행동은 가능하지만 이 기술은 못 쓴다/다른 기술을 강제로 써야 한다"를 판정 */
function checkMoveLegality(attacker, moveId, moveInfo) {
  const lines = [];

  if (attacker.encoreTurns > 0 && attacker.encoreMove) {
    if (attacker.encoreMove !== moveInfo.id) {
      lines.push(`${attacker.nickname}은(는) 앵콜 상태라 ${moveInfo.name} 대신 이전 기술을 사용한다!`);
    }
    return { blocked: false, finalMoveId: attacker.encoreMove, lines };
  }

  if (attacker.disableTurns > 0 && attacker.disableMove === moveInfo.id) {
    lines.push(`${attacker.nickname}의 ${moveInfo.name}은(는) 사슬묶여 사용할 수 없다!`);
    return { blocked: true, finalMoveId: moveId, lines };
  }

  if (attacker.tauntTurns > 0 && moveInfo.category === 'Status') {
    lines.push(`${attacker.nickname}은(는) 도발에 걸려 변화기술을 사용할 수 없다!`);
    return { blocked: true, finalMoveId: moveId, lines };
  }

  if (attacker.tormentActive && attacker.lastMoveId && attacker.lastMoveId === moveInfo.id) {
    lines.push(`${attacker.nickname}은(는) 트집 때문에 같은 기술을 연속으로 사용할 수 없다!`);
    return { blocked: true, finalMoveId: moveId, lines };
  }

  return { blocked: false, finalMoveId: moveId, lines };
}

/**
 * 참가자 한 명의 행동을 즉시 실행 (이번 라운드에 이미 행동했거나 금지 기술이면 무시).
 * targetParticipantId가 주어지면(도우미 응원기처럼 아군을 지정할 수 있는 기술) 보스 대신
 * 그 참가자를 대상으로 기술을 사용한다 — 자기 자신을 지정하는 것도 허용한다.
 */
export function executeParticipantAction(state, participantId, moveId, targetParticipantId) {
  if (state.status !== 'ongoing' || !moveId || participantId == null) return state;
  if (state.actedParticipantIds.includes(participantId)) return state;

  const idx = state.participants.findIndex((p) => p && p.id === participantId && !p.fainted);
  if (idx === -1) return state;

  const roundNum = state.round + 1;
  const moveInfo = showdownIntegration.getMove(moveId);

  if (moveInfo && isMoveBanned(moveInfo.id)) {
    return {
      ...state,
      log: [
        ...state.log,
        {
          round: roundNum,
          phase: 'participant',
          text: `${state.participants[idx].nickname}은(는) ${moveInfo.name}을(를) 레이드에서 사용할 수 없다!`,
        },
      ],
    };
  }

  const gate = resolveActionGate(state.participants[idx], moveId);
  let participants = state.participants.map((p, i) => (i === idx ? gate.attacker : p));
  let log = [...state.log, ...gate.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

  if (!gate.canAct) {
    return { ...state, participants, actedParticipantIds: [...state.actedParticipantIds, participantId], log };
  }

  let finalMoveId = moveId;
  if (moveInfo) {
    const legality = checkMoveLegality(participants[idx], moveId, moveInfo);
    log = [...log, ...legality.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];
    if (legality.blocked) {
      return { ...state, participants, actedParticipantIds: [...state.actedParticipantIds, participantId], log };
    }
    finalMoveId = legality.finalMoveId;
  }
  // 모으기 기술을 충전 중이면 이번 행동은 그 기술의 발동으로 강제된다
  if (participants[idx].chargingMove) {
    finalMoveId = participants[idx].chargingMove;
    log = [...log, { round: roundNum, phase: 'participant', text: `${participants[idx].nickname}은(는) 모아둔 힘을 발산한다!` }];
  }

  const targetIdx =
    targetParticipantId != null
      ? participants.findIndex((p) => p && p.id === targetParticipantId && !p.fainted)
      : -1;

  // 아군(자기 자신 포함)을 대상으로 지정한 기술: 보스가 아니라 그 참가자를 상대로 실행한다
  if (targetIdx !== -1) {
    const result = attack(participants[idx], participants[targetIdx], finalMoveId, {
      state,
      field: buildFieldOptions(state, participants[idx], participants[targetIdx]),
    });
    const resolvedDefender =
      targetIdx === idx ? { ...result.defender, lastMoveId: result.attacker.lastMoveId } : result.defender;
    participants = participants.map((p, i) => {
      if (i === targetIdx) return resolvedDefender;
      if (i === idx) return result.attacker;
      return p;
    });
    log = [...log, ...result.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

    const next = {
      ...state,
      participants,
      actedParticipantIds: [...state.actedParticipantIds, participantId],
      log,
    };

    if (!participants.some((p) => p && !p.fainted)) {
      return {
        ...next,
        status: 'loss',
        log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
      };
    }

    return next;
  }

  // 자신/자신의 조 전체를 대상으로 하는 기술(생명의물방울 같은 회복기, 자기 랭크업 등)과
  // 날씨/필드/트릭룸/사이드컨디션 설치기(순풍·리플렉터 등)는 "상대"라는 개념이 없으므로 보스를
  // 상대로 실행하지 않고 시전자 자신을 대상으로 실행한다.
  if (
    moveInfo &&
    (moveInfo.target === 'self' ||
      moveInfo.target === 'allies' ||
      moveInfo.target === 'allySide' ||
      isFieldMove(moveInfo))
  ) {
    const actorEntity = participants[idx];
    const result = attack(actorEntity, actorEntity, finalMoveId, {
      state,
      field: buildFieldOptions(state, actorEntity, state.boss),
    });
    let selfLines = result.lines;
    participants = participants.map((p, i) => (i === idx ? result.attacker : p));

    // 순풍/리플렉터/비바라기/트릭룸 등: 시전자 진영(또는 필드 전체)에 반영
    const feApplied = applyFieldEffect(
      getField(state),
      getSideConditions(state),
      result.fieldEffects,
      participants[idx],
      fieldDurationBonus
    );
    selfLines = [...selfLines, ...feApplied.lines];

    // target === 'allies'(생명의물방울 등)는 시전자와 같은 조 전체에도 동일 비율로 회복을 퍼뜨린다
    if (moveInfo.target === 'allies' && moveInfo.heal) {
      const actor = participants[idx];
      const isSameTeamAlly = (p) => p && p.id !== actor.id && !p.fainted && (p.team || '') === (actor.team || '');
      participants = participants.map((p) => {
        if (!isSameTeamAlly(p)) return p;
        const healResult = applyHealToEntity(p, moveInfo.heal);
        selfLines = [...selfLines, ...healResult.lines];
        return healResult.entity;
      });
    }

    log = [...log, ...selfLines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

    let next = {
      ...state,
      participants,
      field: feApplied.field,
      sideConditions: feApplied.sideConditions,
      actedParticipantIds: [...state.actedParticipantIds, participantId],
      log,
    };
    next = applyResultSideEffects(next, result, next.participants[idx], roundNum);
    participants = next.participants;

    if (!participants.some((p) => p && !p.fainted)) {
      return {
        ...next,
        status: 'loss',
        log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
      };
    }

    return next;
  }

  // 범위기(파도타기/지진 등 allAdjacent)는 보스뿐 아니라 시전자와 같은 조의 살아있는 아군에게도
  // 데미지가 간다(범위 감소 0.75배). allAdjacentFoes(락슬라이드/열풍 등)는 상대가 보스 하나뿐이라
  // 사실상 단일 대상이므로 아래 일반 경로로 처리한다.
  if (hitsAllies(moveInfo)) {
    const actor = participants[idx];
    const allyIdxs = participants
      .map((p, i) => (p && !p.fainted && i !== idx && (p.team || '') === (actor.team || '') ? i : -1))
      .filter((i) => i !== -1);
    const isSpread = 1 + allyIdxs.length > 1;

    const rBoss = attack(actor, state.boss, finalMoveId, {
      state,
      isSpread,
      field: buildFieldOptions(state, actor, state.boss),
    });
    let boss = rBoss.defender;
    participants = participants.map((p, i) => (i === idx ? rBoss.attacker : p));
    let spreadLines = [...rBoss.lines];

    for (const ai of allyIdxs) {
      if (participants[ai].fainted) continue;
      const rAlly = attack(participants[idx], participants[ai], finalMoveId, {
        state,
        isSpread,
        field: buildFieldOptions(state, participants[idx], participants[ai]),
      });
      participants[ai] = rAlly.defender; // 반동/흡수 등 시전자 쪽 변화는 보스 타격분만 반영
      spreadLines = [...spreadLines, ...rAlly.lines];
    }

    log = [...log, ...spreadLines.map((text) => ({ round: roundNum, phase: 'participant', text }))];
    const next = {
      ...state,
      boss,
      participants,
      actedParticipantIds: [...state.actedParticipantIds, participantId],
      log,
    };
    if (boss.currentHP <= 0) {
      return {
        ...next,
        status: 'win',
        log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (보스 HP 0%) ---` }],
      };
    }
    if (!participants.some((p) => p && !p.fainted)) {
      return {
        ...next,
        status: 'loss',
        log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
      };
    }
    return next;
  }

  const result = attack(participants[idx], state.boss, finalMoveId, {
    state,
    roundNum,
    attackerFirst: true,
    field: buildFieldOptions(state, participants[idx], state.boss),
  });
  let boss = result.defender;
  participants = participants.map((p, i) => (i === idx ? result.attacker : p));
  log = [...log, ...result.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

  let next = {
    ...state,
    boss,
    participants,
    actedParticipantIds: [...state.actedParticipantIds, participantId],
    log,
  };
  next = applyResultSideEffects(next, result, next.participants[idx], roundNum);
  boss = next.boss;

  if (boss.currentHP <= 0) {
    return {
      ...next,
      status: 'win',
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (보스 HP 0%) ---` }],
    };
  }

  return next;
}

/**
 * 보스 행동을 즉시 실행. 라운드 진행과 무관하게 원하는 만큼, 언제든 반복 실행 가능
 * (라운드는 endRound를 호출해야만 넘어간다).
 * targetId로 'random'을 넘기면 그 시점에 살아있는 참가자 중 무작위로 대상을 고른다.
 */
export function executeBossAction(state, moveId, targetId) {
  if (state.status !== 'ongoing' || !moveId || targetId == null) return state;

  const roundNum = state.round + 1;
  // 보스가 모으기 기술을 충전 중이면 이번 행동은 그 기술 발동으로 강제
  if (state.boss.chargingMove) moveId = state.boss.chargingMove;
  const bossMoveInfo = showdownIntegration.getMove(moveId);

  // 보스도 풀죽음/잠듦/냉동/마비/혼란/헤롱헤롱으로 행동이 막힐 수 있다 (기존엔 무조건 행동했음)
  const bossGate = resolveActionGate(state.boss, moveId);
  if (!bossGate.canAct) {
    return {
      ...state,
      boss: bossGate.attacker,
      log: [...state.log, ...bossGate.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))],
    };
  }
  const gatedBoss = bossGate.attacker;
  const gateLines = bossGate.lines.map((text) => ({ round: roundNum, phase: 'boss', text }));

  // 범위기(파도타기/지진/락슬라이드/열풍 등): 대상 지정·가로채기(뒤는맡기라고) 무시하고
  // 살아있는 참가자 전원을 각각 때린다(2명 이상이면 범위 감소 0.75배). 부가효과·급소는 대상별로 굴린다.
  if (isSpreadMove(bossMoveInfo)) {
    const targetIdxs = state.participants
      .map((p, i) => (p && !p.fainted ? i : -1))
      .filter((i) => i !== -1);
    if (targetIdxs.length === 0) return state;

    let boss = gatedBoss;
    let participants = [...state.participants];
    let lines = [];
    const isSpread = targetIdxs.length > 1;
    for (const i of targetIdxs) {
      if (participants[i].fainted) continue;
      const r = attack(boss, participants[i], moveId, {
        state,
        isSpread,
        field: buildFieldOptions(state, boss, participants[i]),
      });
      boss = r.attacker;
      participants[i] = r.defender;
      lines = [...lines, ...r.lines];
    }
    const log = [...state.log, ...gateLines, ...lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];
    const next = { ...state, boss, participants, log };
    if (!participants.some((p) => p && !p.fainted)) {
      return {
        ...next,
        status: 'loss',
        log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
      };
    }
    return next;
  }

  // 철벽의 "뒤는 맡기라고" 응원이 활성화된 참가자가 있으면 이번 턴 공격 대상을 강제로 그쪽으로 고정.
  // 여러 명이 동시에 활성화되어 있으면(여러 조가 함께 진행 중일 때 등), 원래 노린 대상과 같은 조의
  // 가디언을 우선으로 고르고, 매칭되는 조가 없으면 먼저 활성화된 쪽을 쓴다.
  const guardians = state.participants.filter((p) => p && !p.fainted && p.redirectActive);
  const intendedTarget =
    targetId !== 'random' ? state.participants.find((p) => p && String(p.id) === String(targetId)) : null;
  const guardian =
    guardians.length === 0
      ? null
      : (intendedTarget && guardians.find((g) => (g.team || '') === (intendedTarget.team || ''))) || guardians[0];

  let resolvedTargetId = targetId;
  if (guardian) {
    resolvedTargetId = guardian.id;
  } else if (targetId === 'random') {
    const aliveParticipants = state.participants.filter((p) => p && !p.fainted);
    if (aliveParticipants.length === 0) return state;
    resolvedTargetId = aliveParticipants[Math.floor(Math.random() * aliveParticipants.length)].id;
  }

  const idx = state.participants.findIndex((p) => p && p.id === resolvedTargetId && !p.fainted);
  if (idx === -1) return state;

  const result = attack(gatedBoss, state.participants[idx], moveId, {
    state,
    roundNum,
    attackerFirst: true,
    defenderActed: state.actedParticipantIds.includes(state.participants[idx].id),
    field: buildFieldOptions(state, gatedBoss, state.participants[idx]),
  });
  const boss = result.attacker;
  let participants = state.participants.map((p, i) => (i === idx ? result.defender : p));
  // 대상으로 지정됐던 가디언은 한 번 받아내면 해제
  if (guardian) {
    participants = participants.map((p) => (p && p.id === guardian.id ? { ...p, redirectActive: false } : p));
  }

  // 보스가 쓴 순풍/리플렉터/비바라기/트릭룸 등을 필드/보스 진영에 반영
  const feApplied = applyFieldEffect(getField(state), getSideConditions(state), result.fieldEffects, state.boss, fieldDurationBonus);
  const log = [
    ...state.log,
    ...gateLines,
    ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text })),
    ...feApplied.lines.map((text) => ({ round: roundNum, phase: 'boss', text })),
  ];

  let next = { ...state, boss, participants, field: feApplied.field, sideConditions: feApplied.sideConditions, log };
  next = applyResultSideEffects(next, result, boss, roundNum);
  participants = next.participants;

  if (!participants.some((p) => p && !p.fainted)) {
    return {
      ...next,
      status: 'loss',
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
    };
  }

  return next;
}

/**
 * 한 라운드치 "예약 행동"을 우선도 → 실효 스피드(성격·스피드 랭크·마비 반영) → 랜덤(완전 동점)
 * 순으로 정렬해 한 번에 처리한다. 각 행동은 실행 시점의 최신 state로 기존 execute* 함수를 그대로
 * 태우므로, 앞 순번 행동으로 대상이 쓰러지거나 상태가 바뀌면 그 결과가 다음 행동에 반영된다.
 * 응원은 CHEER_PRIORITY(=5.5)로 취급하고, 보스도 참가자와 같은 정렬에 섞여 들어간다
 * (보스는 queue.bossActions 배열 길이만큼, 즉 라운드당 여러 번 행동 가능).
 *
 * queue = {
 *   participantActions: [{ participantId, kind: 'move'|'cheer', moveId?, cheerId?, targetParticipantId? }],
 *   bossActions:        [{ moveId, targetId }]   // targetId: 참가자 id 또는 'random'
 * }
 *
 * 예약은 했지만 그 순번에 실제로는 행동하지 못한 참가자(먼저 처리된 공격에 쓰러짐, 끝내버려 반동
 * 등)는 "OO은(는) … 행동할 수 없었다!" 로그를 남긴다. 행동 게이트(잠듦/마비/혼란 등)나 금지 기술은
 * execute* 쪽이 이미 자체 로그를 남기므로 중복으로 남기지 않는다.
 */
export function resolveQueuedActions(state, queue = {}) {
  if (!state || state.status !== 'ongoing') return state;

  const participantActions = (queue.participantActions || []).filter((a) => a && a.participantId != null);
  const bossActions = (queue.bossActions || []).filter((a) => a && a.moveId);
  if (participantActions.length === 0 && bossActions.length === 0) return state;

  const roundNum = state.round + 1;
  const entries = [];

  const pushEntry = (type, act, entity, name, seq) => {
    const moveData = act.kind === 'cheer' ? null : showdownIntegration.getMove(act.moveId);
    const priority =
      act.kind === 'cheer' ? CHEER_PRIORITY : (moveData?.priority ?? 0) + priorityBonus(entity, moveData, state);
    // 선제공격의발톱(20%)/재빠른발톱(30%): 같은 우선도 안에서 무조건 선행 (트릭룸 무시)
    const fc = act.kind === 'cheer' ? 0 : firstChance(entity);
    const first = fc > 0 && Math.random() < fc;
    // 스터스탯 특성 / 느림보꼬리·이상한사탕 도구: 같은 우선도 안에서 무조건 후행 (트릭룸 무시)
    const last = act.kind !== 'cheer' && movesLast(entity);
    entries.push({ type, act, name, priority, speed: orderingSpeed(state, entity), first, last, roll: Math.random(), seq });
  };

  participantActions.forEach((act, seq) => {
    const p = state.participants.find((x) => x && x.id === act.participantId);
    if (p) pushEntry('participant', act, p, p.nickname, seq);
  });
  bossActions.forEach((act, seq) => pushEntry('boss', act, state.boss, state.boss.nickname, seq));

  // 우선도 내림차순 → (선제/후행 도구·특성) → 실효 스피드(순풍 2배 반영) 내림차순 → 완전 동점이면 랜덤.
  // 트릭룸이 깔려 있으면 같은 우선도 안에서 스피드가 느린 쪽이 먼저 움직인다.
  const trickRoom = isTrickRoom(state);
  entries.sort(
    (a, b) =>
      b.priority - a.priority ||
      (b.first ? 1 : 0) - (a.first ? 1 : 0) ||
      (a.last ? 1 : 0) - (b.last ? 1 : 0) ||
      (trickRoom ? a.speed - b.speed : b.speed - a.speed) ||
      a.roll - b.roll
  );

  let next = state;
  const logInability = (name, reason) => {
    next = {
      ...next,
      log: [
        ...next.log,
        { round: roundNum, phase: 'participant', text: `${name}은(는) ${reason ? `${reason} ` : ''}행동할 수 없었다!` },
      ],
    };
  };

  for (const entry of entries) {
    if (next.status !== 'ongoing') break;

    if (entry.type === 'boss') {
      // 풀죽음/잠듦/마비/혼란 등 행동 차단은 executeBossAction 내부 resolveActionGate가 처리한다
      const { moveId, targetId } = entry.act;
      next = executeBossAction(next, moveId, targetId === 'random' ? 'random' : Number(targetId));
      continue;
    }

    const { participantId, kind, moveId, cheerId, targetParticipantId } = entry.act;
    const p = next.participants.find((x) => x && x.id === participantId);

    if (!p || p.fainted) {
      logInability(entry.name, '쓰러져서');
      continue;
    }
    if (next.actedParticipantIds.includes(participantId)) {
      // 라운드 전환에서 자동으로 행동 완료 처리된 경우(끝내버려 반동 등)
      if (p.mustSkipTurn) logInability(entry.name, '반동으로');
      continue;
    }

    const before = next;
    next =
      kind === 'cheer'
        ? executeParticipantCheer(next, participantId, cheerId)
        : executeParticipantAction(next, participantId, moveId, targetParticipantId);

    // execute* 가 아무 변화 없이(그리고 행동 완료 처리도 없이) 반환됐으면 명시적으로 로그를 남긴다
    if (next === before && !next.actedParticipantIds.includes(participantId)) {
      logInability(entry.name, '');
    }
  }

  // 이번 배치에서 소모되지 않은 풀죽음 플래그(이미 행동한 뒤에 맞은 경우 등)는 여기서 정리한다
  next = {
    ...next,
    boss: next.boss.flinched ? { ...next.boss, flinched: false } : next.boss,
    participants: next.participants.map((p) => (p && p.flinched ? { ...p, flinched: false } : p)),
  };

  return next;
}

/**
 * 참가자의 응원(싸운다 대신 선택하는 행동) 실행. 포지션에 맞는 응원 스킬만 사용 가능하며,
 * 레이드당 참가자 1인 최대 2회로 제한된다(규칙 IV장 6항). "끝내버려"는 마지막 라운드에는 사용 불가.
 */
export function executeParticipantCheer(state, participantId, cheerId) {
  if (state.status !== 'ongoing' || !cheerId || participantId == null) return state;
  if (state.actedParticipantIds.includes(participantId)) return state;

  const idx = state.participants.findIndex((p) => p && p.id === participantId && !p.fainted);
  if (idx === -1) return state;

  const actor = state.participants[idx];
  if ((actor.cheerUsed || 0) >= CHEER_MAX_USES) return state;

  const skill = findCheerSkill(actor.position, cheerId);
  if (!skill) return state;

  if (cheerId === 'finisher' && state.round + 1 >= (state.maxRounds || 100)) return state;

  const roundNum = state.round + 1;
  let participants = state.participants;
  const lines = [`${actor.nickname}의 ${skill.name}!`];
  // 팀 전체 대상 응원(철통방어/치유의함성/만전태세)은 시전자와 같은 조원에게만 적용된다
  const isSameTeam = (p) => (p.team || '') === (actor.team || '');

  switch (cheerId) {
    case 'ironwall':
      participants = participants.map((p) =>
        p && !p.fainted && isSameTeam(p) ? applyStatBuff(p, { def: 1, spd: 1 }, 3) : p
      );
      lines.push(`${actor.team ? `${actor.team}조` : '같은 조'} 아군의 방어/특수방어가 상승했다!`);
      break;
    case 'guard':
      participants = participants.map((p, i) => (i === idx ? { ...p, redirectActive: true } : p));
      lines.push(`${actor.nickname}이(가) 이번 턴 공격을 대신 받아낸다!`);
      break;
    case 'pumpup':
      participants = participants.map((p, i) => (i === idx ? applyStatBuff(p, { atk: 1, spa: 1 }, 3) : p));
      lines.push(`${actor.nickname}의 공격/특수공격이 상승했다!`);
      break;
    case 'finisher':
      participants = participants.map((p, i) => (i === idx ? { ...p, pendingFinisher: true } : p));
      lines.push(`${actor.nickname}이(가) 다음 턴을 위해 힘을 모은다!`);
      break;
    case 'healcry':
      participants = participants.map((p) =>
        p && !p.fainted && isSameTeam(p)
          ? {
              ...p,
              currentHP: p.healBlockTurns > 0 ? p.currentHP : Math.min(p.maxHP, p.currentHP + Math.round(p.maxHP * 0.5)),
            }
          : p
      );
      lines.push(`${actor.team ? `${actor.team}조` : '같은 조'} 아군의 체력을 회복했다! (회복 봉인 상태인 아군은 제외)`);
      break;
    case 'cleanse':
      participants = participants.map((p) =>
        p && !p.fainted && isSameTeam(p)
          ? {
              ...p,
              status: '',
              toxicCounter: 0,
              tauntTurns: 0,
              encoreTurns: 0,
              encoreMove: null,
              tormentActive: false,
              healBlockTurns: 0,
              attractActive: false,
              disableTurns: 0,
              disableMove: null,
            }
          : p
      );
      lines.push(
        `${actor.team ? `${actor.team}조` : '같은 조'} 아군의 상태이상·헤롱헤롱·도발·앵콜·트집·회복봉인·사슬묶기를 회복했다! (혼란/씨뿌리기/조이기는 대상 외)`
      );
      break;
    default:
      return state;
  }

  participants = participants.map((p, i) => (i === idx ? { ...p, cheerUsed: (p.cheerUsed || 0) + 1 } : p));

  const log = [...state.log, ...lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

  return {
    ...state,
    participants,
    actedParticipantIds: [...state.actedParticipantIds, participantId],
    log,
  };
}

/** 테라레이드처럼 보스가 턴을 소모하지 않고 필드(자신 포함) 전체의 랭크 변화를 원래대로 되돌림 */
export function resetFieldBoosts(state) {
  if (state.status !== 'ongoing') return state;
  const roundNum = state.round + 1;
  const boss = { ...state.boss, boosts: { ...EMPTY_BOOSTS }, buffTimers: {} };
  const participants = state.participants.map((p) => (p ? { ...p, boosts: { ...EMPTY_BOOSTS }, buffTimers: {} } : p));
  const line = {
    round: roundNum,
    phase: 'boss',
    text: `${state.boss.nickname}이(가) 필드의 모든 랭크 변화를 원래대로 되돌렸다! (턴 소모 없음)`,
  };
  return { ...state, boss, participants, log: [...state.log, line] };
}

/** 무료 행동: 필드(날씨/터레인/트릭룸)와 모든 진영의 사이드 컨디션을 한 번에 제거 (턴 소모 없음) */
export function clearFieldConditions(state) {
  if (state.status !== 'ongoing') return state;
  const roundNum = state.round + 1;
  return {
    ...state,
    field: emptyField(),
    sideConditions: emptySideConditions(),
    log: [
      ...state.log,
      { round: roundNum, phase: 'boss', text: '날씨·필드·사이드 효과가 모두 사라졌다! (턴 소모 없음)' },
    ],
  };
}

/** 테라레이드처럼 보스가 턴을 소모하지 않고 자신의 상태이상(도발/앵콜 등 포함)을 회복함 */
export function cureBossStatus(state) {
  if (state.status !== 'ongoing') return state;
  const roundNum = state.round + 1;
  const boss = {
    ...state.boss,
    status: '',
    toxicCounter: 0,
    tauntTurns: 0,
    encoreTurns: 0,
    encoreMove: null,
    tormentActive: false,
    healBlockTurns: 0,
    attractActive: false,
    disableTurns: 0,
    disableMove: null,
  };
  const line = {
    round: roundNum,
    phase: 'boss',
    text: `${state.boss.nickname}이(가) 자신의 상태이상을 모두 회복했다! (턴 소모 없음)`,
  };
  return { ...state, boss, log: [...state.log, line] };
}

/** 보스/참가자 입력 폼 데이터로부터 새 전투 상태 생성 */
export function createInitialBattleState({ boss, participants, maxRounds = 6 }) {
  const builtBoss = buildBattlePokemon(boss);
  let builtParticipants = participants.map((p) =>
    p && p.position && p.position.trim() ? buildBattlePokemon(p) : null
  );

  const log = [{ round: 1, phase: 'start', text: '--- 1라운드 시작 ---' }];
  const field = emptyField();

  // 전투 시작 시 보스 특성: 날씨/필드 소환(가뭄·잔비·모래날림·눈퍼뜨리기·일렉트릭메이커 등)
  const entry = entryFieldFromAbility(builtBoss);
  if (entry.weather) {
    field.weather = entry.weather;
    field.weatherTurns = WEATHER_DURATION;
    log.push({ round: 1, phase: 'status', text: `${builtBoss.nickname}의 특성으로 ${WEATHER_LABELS[entry.weather].name} 상태가 되었다!` });
  }
  if (entry.terrain) {
    field.terrain = entry.terrain;
    field.terrainTurns = TERRAIN_DURATION;
    log.push({ round: 1, phase: 'status', text: `${builtBoss.nickname}의 특성으로 ${TERRAIN_LABELS[entry.terrain].name}가 펼쳐졌다!` });
  }

  // 위협: 등장 시 살아있는 참가자 전원의 공격 -1 (능력저하 방어 특성 있으면 무효 — 참가자는 특성이 없으므로 항상 적용)
  if (hasIntimidate(builtBoss)) {
    builtParticipants = builtParticipants.map((p) => (p ? applyStatDeltas(p, { atk: -1 }) : p));
    log.push({ round: 1, phase: 'status', text: `${builtBoss.nickname}의 위협으로 참가자 전원의 공격이 떨어졌다!` });
  }

  return {
    boss: builtBoss,
    participants: builtParticipants,
    round: 0,
    status: 'ongoing',
    maxRounds,
    field,
    sideConditions: emptySideConditions(),
    log,
    actedParticipantIds: [],
  };
}
