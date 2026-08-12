import showdownIntegration from '../lib/showdownIntegration.js';
import { calculateHP, calculateStat, NATURE_MODIFIERS } from '../lib/statCalculator.js';
import { isMoveBanned } from './bannedMoves.js';
import { findCheerSkill, CHEER_MAX_USES } from './cheerSkills.js';

const DEFAULT_BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };

const FIXED_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const FIXED_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

/** 입력 폼 데이터(raw)를 실제 전투에 쓸 수 있는 파생 스탯(maxHP 등)을 가진 객체로 변환 */
export function buildBattlePokemon(raw) {
  // 아군 참가자(position 필드를 가진 커스텀 유닛)는 레벨 50 / 성격 하드 / 도구 없음 / 특성 없음 /
  // 종족값 전부 100 / 개체값 전부 31로 고정. 노력치(기초 포인트)는 규칙 VI장에 따라 레이드 전용으로
  // 입력값을 그대로 사용한다(입력 없으면 전부 0). 보스는 입력값을 그대로 사용.
  const isParticipant = 'position' in raw;

  const ivs = isParticipant ? FIXED_IVS : raw.ivs || FIXED_IVS;
  const evs = raw.evs || FIXED_EVS;
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
    // 상태이상/조이기 데미지 틱은 레이드용으로 부풀린 maxHP가 아니라 이 "정상 배틀 기준" 체력을 기준으로
    // 계산한다(규칙 V장 2항)
    formulaMaxHP,
    currentHP: maxHP,
    fainted: false,
    // 응원(규칙 IV장) 관련 전투 중 상태 — 참가자에게만 의미가 있음
    boosts: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
    buffTimers: { atk: 0, def: 0, spa: 0, spd: 0 },
    cheerUsed: 0,
    redirectActive: false,
    pendingFinisher: false,
    finisherTimer: 0,
    mustSkipTurn: false,
    // 주요 상태이상(규칙 V장 2~3항): brn/par/psn/tox/slp/frz 중 하나 또는 null
    status: null,
    statusTurns: 0,
    toxicCounter: 0,
    // 상태이상 외 얽매임류 효과 (혼란/씨뿌리기/조이기 + 만전태세로 회복 가능한 것들)
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
    lastMoveId: null,
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

const STATUS_NAMES = { brn: '화상', par: '마비', psn: '독', tox: '맹독', slp: '수면', frz: '냉동' };
// 상태이상별 면역 타입(주요 게임 규칙): 화상/전기마비/독-맹독/냉동은 해당 타입이 아예 걸리지 않음
const STATUS_IMMUNE_TYPES = {
  brn: ['Fire'],
  par: ['Electric'],
  psn: ['Poison', 'Steel'],
  tox: ['Poison', 'Steel'],
  frz: ['Ice'],
};

function isStatusImmune(status, types) {
  const immuneTypes = STATUS_IMMUNE_TYPES[status];
  if (!immuneTypes) return false;
  return (types || []).some((t) => immuneTypes.includes(t));
}

/** 대상에게 상태이상을 걸어본다. 이미 다른 상태이상이 있거나 면역 타입이면 실패(applied:false) */
function inflictStatus(target, status) {
  if (!target || target.status || target.fainted) return { target, applied: false };
  if (isStatusImmune(status, target.types)) return { target, applied: false };
  const patch = { status };
  if (status === 'slp') patch.statusTurns = 1 + Math.floor(Math.random() * 3);
  if (status === 'tox') patch.toxicCounter = 0;
  return { target: { ...target, ...patch }, applied: true };
}

const VOLATILE_NAMES = {
  confusion: '혼란',
  leechseed: '씨뿌리기',
  partiallytrapped: '조이기',
  taunt: '도발',
  encore: '앵콜',
  torment: '트집',
  attract: '헤롱헤롱',
  healblock: '회복 봉인',
  disable: '사슬묶기',
};

/** 혼란 자해 데미지: 무타입 물리 40위력, 자신의 공격/방어만 사용(특성/도구/급소/랜덤폭 없음) */
function confusionSelfDamage(entity) {
  const level = entity.level || 50;
  const natureMods = NATURE_MODIFIERS[(entity.nature || 'hardy').toLowerCase()] || [1, 1, 1, 1, 1];
  const atk = Math.floor(
    calculateStat(entity.baseStats?.atk ?? 100, entity.ivs?.atk ?? 31, entity.evs?.atk ?? 0, level) * natureMods[0]
  );
  const def = Math.floor(
    calculateStat(entity.baseStats?.def ?? 100, entity.ivs?.def ?? 31, entity.evs?.def ?? 0, level) * natureMods[1]
  );
  const dmg = Math.floor(((2 * level) / 5 + 2) * 40 * (atk / def)) / 50 + 2;
  return Math.max(1, Math.floor(dmg));
}

/**
 * 상태이상(수면/냉동/마비)·헤롱헤롱·혼란으로 인해 이번 행동이 아예 막히거나(canAct:false)
 * 혼란처럼 자해로 대체되는지 판정. 참가자/보스 공용. 매 행동 시도(=매번 호출)마다 판정한다.
 */
function resolveActionGate(attackerIn) {
  let attacker = attackerIn;
  const lines = [];

  if (attacker.status === 'slp') {
    const turnsLeft = (attacker.statusTurns || 1) - 1;
    if (turnsLeft > 0) {
      return { canAct: false, attacker: { ...attacker, statusTurns: turnsLeft }, lines: [`${attacker.nickname}은(는) 잠들어 있다...`] };
    }
    attacker = { ...attacker, status: null, statusTurns: 0 };
    lines.push(`${attacker.nickname}은(는) 잠에서 깨어났다!`);
  }

  if (attacker.status === 'frz') {
    if (Math.random() >= 0.2) {
      return { canAct: false, attacker, lines: [...lines, `${attacker.nickname}은(는) 얼어붙어 움직일 수 없다!`] };
    }
    attacker = { ...attacker, status: null };
    lines.push(`${attacker.nickname}의 얼음이 녹았다!`);
  }

  if (attacker.status === 'par' && Math.random() < 0.25) {
    return { canAct: false, attacker, lines: [...lines, `${attacker.nickname}은(는) 몸이 저려 움직일 수 없다!`] };
  }

  if (attacker.attractActive && Math.random() < 0.5) {
    return { canAct: false, attacker, lines: [...lines, `${attacker.nickname}은(는) 헤롱헤롱해서 움직일 수 없다!`] };
  }

  if (attacker.confusionTurns > 0) {
    const remaining = attacker.confusionTurns - 1;
    if (remaining <= 0) {
      attacker = { ...attacker, confusionTurns: 0 };
      lines.push(`${attacker.nickname}의 혼란이 풀렸다!`);
    } else {
      attacker = { ...attacker, confusionTurns: remaining };
      if (Math.random() < 1 / 3) {
        const selfDmg = confusionSelfDamage(attacker);
        const nextHP = Math.max(0, attacker.currentHP - selfDmg);
        const fainted = nextHP <= 0;
        attacker = { ...attacker, currentHP: nextHP, fainted };
        lines.push(`${attacker.nickname}은(는) 혼란에 빠져 자신을 공격했다! (-${selfDmg})`);
        if (fainted) lines.push(`${attacker.nickname}은(는) 쓰러졌다!`);
        return { canAct: false, attacker, lines };
      }
    }
  }

  return { canAct: true, attacker, lines };
}

/**
 * 선택한 기술이 도발/트집/사슬묶기로 막혀 있는지, 앵콜로 강제 교체되는지 판정.
 * moveData는 원래 선택한 moveId의 데이터.
 */
function checkMoveLegality(attacker, moveId, moveData) {
  if (attacker.encoreTurns > 0 && attacker.encoreMove && attacker.encoreMove !== moveData.id) {
    return {
      finalMoveId: attacker.encoreMove,
      lines: [`${attacker.nickname}은(는) 앵콜 상태라 강제로 이전 기술을 다시 사용했다!`],
      blocked: false,
    };
  }

  if (attacker.tauntTurns > 0 && !moveData.basePower) {
    return { finalMoveId: null, lines: [`${attacker.nickname}은(는) 도발 상태라 변화기술을 사용할 수 없다!`], blocked: true };
  }

  if (attacker.tormentActive && attacker.lastMoveId && attacker.lastMoveId === moveData.id) {
    return {
      finalMoveId: null,
      lines: [`${attacker.nickname}은(는) 트집 상태라 같은 기술을 연속으로 사용할 수 없다!`],
      blocked: true,
    };
  }

  if (attacker.disableTurns > 0 && attacker.disableMove === moveData.id) {
    return { finalMoveId: null, lines: [`${attacker.nickname}의 ${moveData.name}은(는) 사슬묶여 사용할 수 없다!`], blocked: true };
  }

  return { finalMoveId: moveId, lines: [], blocked: false };
}

/**
 * attacker가 moveId로 defender를 공격, attacker/defender의 새 상태와 게임 공식 문구 스타일의
 * 로그 줄들을 반환. (데미지는 항상 평균값 사용, 급소는 기술의 critRatio에 따라 실제 확률로 판정)
 * options.isSpread가 true면 전체공격 데미지 감소(0.75배, 더블배틀 스프레드기 기준)를 적용한다.
 */
function attack(attacker, defender, moveId, options = {}) {
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
      attacker,
      defender,
      lines: [`${attacker.nickname}의 ${moveId} 사용 실패 (기술을 찾을 수 없음)`],
    };
  }

  const moveData = result.moveData;
  const lines = [`${attacker.nickname}의 ${moveData.name}!`];
  let updatedAttacker = { ...attacker, lastMoveId: moveData.id };

  function tryInflictStatus(target, statusId) {
    if (!statusId || !STATUS_NAMES[statusId]) return target;
    const { target: updated, applied } = inflictStatus(target, statusId);
    if (applied) lines.push(`${updated.nickname}은(는) ${STATUS_NAMES[statusId]} 상태가 되었다!`);
    return updated;
  }

  function tryInflictVolatile(target, volatileId) {
    if (!target || target.fainted || !volatileId || !VOLATILE_NAMES[volatileId]) return target;

    switch (volatileId) {
      case 'confusion':
        if (target.confusionTurns > 0) return target;
        lines.push(`${target.nickname}은(는) 혼란에 빠졌다!`);
        return { ...target, confusionTurns: 1 + Math.floor(Math.random() * 4) };
      case 'leechseed':
        if (target.leechSeed || (target.types || []).includes('Grass')) return target;
        lines.push(`${target.nickname}에게 씨앗이 심어졌다!`);
        return {
          ...target,
          leechSeed: { sourceIsBoss: !updatedAttacker.isParticipant, sourceId: updatedAttacker.isParticipant ? updatedAttacker.id : null },
        };
      case 'partiallytrapped':
        if (target.bindTurns > 0) return target;
        lines.push(`${target.nickname}은(는) 조여져 빠져나갈 수 없게 되었다!`);
        return { ...target, bindTurns: 4 + Math.floor(Math.random() * 2) };
      case 'taunt':
        if (target.tauntTurns > 0) return target;
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
      case 'attract':
        if (target.attractActive) return target;
        lines.push(`${target.nickname}은(는) 헤롱헤롱해졌다!`);
        return { ...target, attractActive: true };
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

  const defenderTypes = defender.types && defender.types.length ? defender.types : ['Normal'];
  const effectiveness = showdownIntegration.getTypeEffectiveness(moveData.type, defenderTypes);

  if (effectiveness === 0) {
    lines.push(`${defender.nickname}에게는 통하지 않았다!`);
    return { damage: 0, attacker: updatedAttacker, defender, lines };
  }

  if (!moveData.basePower) {
    // 변화기술(0위력): 데미지 없이 상태이상/얽매임 효과만 적용될 수 있다
    let updatedDefender = tryInflictStatus(defender, moveData.status);
    updatedDefender = tryInflictVolatile(updatedDefender, moveData.volatileStatus);
    return { damage: 0, attacker: updatedAttacker, defender: updatedDefender, lines };
  }

  if (result.error) {
    // 타입 상성상 무효는 위에서 이미 걸러졌으니, 여기 도달하는 오류는 계산 불가 케이스
    lines.push(`${defender.nickname}에게는 효과가 없었다...`);
    return { damage: 0, attacker: updatedAttacker, defender, lines };
  }

  if (isCrit) lines.push('급소에 맞았다!');
  if (effectiveness > 1) lines.push('효과가 굉장했다!');
  else if (effectiveness < 1) lines.push('효과가 별로인 듯하다...');

  const rawDmg = pickDamageValue(result.damage);
  const dmg = Math.min(defender.currentHP, options.isSpread ? Math.floor(rawDmg * 0.75) : rawDmg);
  const nextHP = Math.max(0, defender.currentHP - dmg);
  const fainted = nextHP <= 0;
  let updatedDefender = { ...defender, currentHP: nextHP, fainted };

  lines.push(`${defender.nickname}에게 피해를 입혔다! (HP ${formatHpPercent(nextHP, defender.maxHP)})`);
  if (fainted) lines.push(`${defender.nickname}은(는) 쓰러졌다!`);

  if (moveData.drain && dmg > 0 && !updatedAttacker.healBlockTurns) {
    const healAmt = Math.max(1, Math.floor((dmg * moveData.drain[0]) / moveData.drain[1]));
    const healedHP = Math.min(updatedAttacker.maxHP, updatedAttacker.currentHP + healAmt);
    if (healedHP > updatedAttacker.currentHP) {
      lines.push(`${updatedAttacker.nickname}은(는) 체력을 흡수했다! (+${healedHP - updatedAttacker.currentHP})`);
      updatedAttacker = { ...updatedAttacker, currentHP: healedHP };
    }
  }

  if (!fainted) {
    const secondaryStatus =
      moveData.status ||
      (moveData.secondary?.status && Math.random() * 100 < (moveData.secondary.chance ?? 0) ? moveData.secondary.status : null);
    if (secondaryStatus) updatedDefender = tryInflictStatus(updatedDefender, secondaryStatus);

    const secondaryVolatile =
      moveData.volatileStatus ||
      (moveData.secondary?.volatileStatus && Math.random() * 100 < (moveData.secondary.chance ?? 0) ? moveData.secondary.volatileStatus : null);
    if (secondaryVolatile) updatedDefender = tryInflictVolatile(updatedDefender, secondaryVolatile);

    if (moveData.type === 'Fire' && updatedDefender.status === 'frz') {
      updatedDefender = { ...updatedDefender, status: null };
      lines.push(`${updatedDefender.nickname}의 얼음이 녹았다!`);
    }
  }

  return { damage: dmg, attacker: updatedAttacker, defender: updatedDefender, lines };
}

function aliveNotActed(participants, actedIds) {
  return participants.filter((p) => p && !p.fainted && !actedIds.includes(p.id));
}

const BUFF_STATS = ['atk', 'def', 'spa', 'spd'];

/**
 * 라운드 전환 시 화상/독/맹독 틱 데미지를 적용한다. 레이드용으로 부풀린 maxHP가 아니라
 * formulaMaxHP(정상 배틀 기준 체력)를 기준으로 계산한다(규칙 V장 2항).
 */
function applyStatusTick(entity) {
  if (!entity || entity.fainted || !entity.status) return { entity, lines: [] };

  const baseline = entity.formulaMaxHP || entity.maxHP;
  let dmg = 0;
  if (entity.status === 'brn') dmg = Math.max(1, Math.floor(baseline / 16));
  else if (entity.status === 'psn') dmg = Math.max(1, Math.floor(baseline / 8));
  else if (entity.status === 'tox') dmg = Math.max(1, Math.floor((baseline * ((entity.toxicCounter || 0) + 1)) / 16));
  else return { entity, lines: [] };

  const toxicCounter = entity.status === 'tox' ? (entity.toxicCounter || 0) + 1 : entity.toxicCounter;
  const currentHP = Math.max(0, entity.currentHP - dmg);
  const fainted = currentHP <= 0;
  const lines = [`${entity.nickname}은(는) ${STATUS_NAMES[entity.status]} 데미지를 입었다! (-${dmg})`];
  if (fainted) lines.push(`${entity.nickname}은(는) 쓰러졌다!`);

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

  return {
    entity: { ...entity, currentHP, fainted, bindTurns, tauntTurns, encoreTurns, encoreMove, healBlockTurns, disableTurns, disableMove },
    lines,
  };
}

/**
 * 라운드 전환 시 참가자별 응원 버프/지속효과를 갱신한다.
 * - 철통방어/힘내라힘(3턴 버프): 매 라운드 전환마다 1씩 감소, 0이 되면 스탯 원복
 * - 끝내버려: 시전한 다음 라운드에 물공/특공 3배(+4스택)가 발동하고, 그 버프가 끝나는 라운드
 *   전환 시 "다음 턴 행동불가"가 걸린다 (mustSkipTurn)
 * - 뒤는맡기라고(redirectActive)는 보스 행동 1회(이번 턴)만 받아내면 바로 해제되지만(executeBossAction/
 *   executeBossSpreadAction에서 처리), 그 전에 라운드가 넘어가 버리면 여기서 안전장치로 한 번 더 해제한다
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

  const tick = applyStatusTick(buffed);
  const volatileTick = advanceEntityVolatiles(tick.entity);

  return { participant: volatileTick.entity, logs: [...logs, ...tick.lines, ...volatileTick.lines] };
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
 * 라운드를 명시적으로 종료하고 다음 라운드로 넘어간다. 참가자가 다 행동하지 않았어도(보스 행동을
 * 더 하고 싶을 수 있으므로) 강제로 끝내지 않고, 사용자가 이 함수를 호출했을 때만 라운드가 넘어간다
 * — 보스는 라운드 진행과 무관하게 언제든 원하는 만큼 행동할 수 있다.
 */
export function endRound(state) {
  if (state.status !== 'ongoing') return state;

  const finishedRound = state.round + 1;
  let log = [
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
  const advanced = state.participants.map((p) => advanceParticipantTurnState(p));
  let participants = advanced.map((a) => a.participant);
  const statusLogs = advanced.flatMap((a) => a.logs);

  const bossTick = applyStatusTick(state.boss);
  const bossVolatileTick = advanceEntityVolatiles(bossTick.entity);
  let boss = bossVolatileTick.entity;

  const leech = applyLeechSeedDrain(boss, participants);
  boss = leech.boss;
  participants = leech.participants;

  log.push({ round: nextRound, phase: 'start', text: `--- ${nextRound}라운드 시작 ---` });
  log = [
    ...log,
    ...statusLogs.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...bossTick.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...bossVolatileTick.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
    ...leech.lines.map((text) => ({ round: nextRound, phase: 'status', text })),
  ];

  if (boss.currentHP <= 0) {
    return {
      ...state,
      boss,
      participants,
      round: finishedRound,
      status: 'win',
      log: [...log, { round: nextRound, phase: 'end', text: '--- 상태이상 데미지로 보스를 쓰러뜨렸다! ---' }],
    };
  }

  // 끝내버려 반동으로 이번 라운드 행동이 불가능한 참가자는 자동으로 "행동 완료" 처리
  const actedParticipantIds = participants
    .filter((p) => p && !p.fainted && p.mustSkipTurn)
    .map((p) => p.id);
  const finalParticipants = participants.map((p) => (p && p.mustSkipTurn ? { ...p, mustSkipTurn: false } : p));

  if (!finalParticipants.some((p) => p && !p.fainted)) {
    return {
      ...state,
      boss,
      participants: finalParticipants,
      round: finishedRound,
      status: 'loss',
      log: [...log, { round: nextRound, phase: 'end', text: '--- 상태이상 데미지로 참가자 전멸 ---' }],
    };
  }

  // 다음 라운드가 시작됐으니 "이번 라운드에 행동할 조" 지정은 초기화 — 라운드마다 다시 골라야 한다
  return {
    ...state,
    round: finishedRound,
    status: 'ongoing',
    boss,
    participants: finalParticipants,
    actedParticipantIds,
    log,
    activeTeam: '',
  };
}

/** 이번 라운드에 아직 행동하지 않은 생존 참가자 수 (UI에서 "라운드 종료" 전 안내용) */
export function countUnactedParticipants(state) {
  return aliveNotActed(state.participants, state.actedParticipantIds).length;
}

/** 참가자 한 명의 행동을 즉시 실행 (이번 라운드에 이미 행동했거나 금지 기술이면 무시) */
export function executeParticipantAction(state, participantId, moveId) {
  if (state.status !== 'ongoing' || !moveId || participantId == null) return state;
  if (state.actedParticipantIds.includes(participantId)) return state;

  const idx = state.participants.findIndex((p) => p && p.id === participantId && !p.fainted);
  if (idx === -1) return state;

  const moveInfo = showdownIntegration.getMove(moveId);
  if (moveInfo && isMoveBanned(moveInfo.id)) {
    const roundNum = state.round + 1;
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

  const roundNum = state.round + 1;
  const gate = resolveActionGate(state.participants[idx]);
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

  const result = attack(participants[idx], state.boss, finalMoveId);
  const boss = result.defender;
  participants = participants.map((p, i) => (i === idx ? result.attacker : p));
  log = [...log, ...result.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

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
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (보스 HP 0/${boss.maxHP}) ---` }],
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

  const roundNum = state.round + 1;
  const gate = resolveActionGate(state.boss);
  let boss = gate.attacker;
  let log = [...state.log, ...gate.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];

  if (!gate.canAct) {
    return { ...state, boss, log };
  }

  const moveInfo = showdownIntegration.getMove(moveId);
  let finalMoveId = moveId;
  if (moveInfo) {
    const legality = checkMoveLegality(boss, moveId, moveInfo);
    log = [...log, ...legality.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];
    if (legality.blocked) {
      return { ...state, boss, log };
    }
    finalMoveId = legality.finalMoveId;
  }

  const result = attack(boss, state.participants[idx], finalMoveId);
  boss = result.attacker;
  // "뒤는 맡기라고"는 이번 턴(보스의 행동 1회)만 유효 — 라운드 끝까지가 아니라 이 공격을
  // 받아낸 즉시 해제한다(대상은 항상 guardian 자신이므로 result.defender에서 바로 끈다)
  const participants = state.participants.map((p, i) =>
    i === idx ? { ...result.defender, redirectActive: false } : p
  );
  const redirectNote =
    guardian && targetId !== 'random' && String(targetId) !== String(guardian.id)
      ? [`${guardian.nickname}이(가) 공격을 대신 받아냈다!`]
      : [];
  log = [
    ...log,
    ...redirectNote.map((text) => ({ round: roundNum, phase: 'boss', text })),
    ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text })),
  ];

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

const SPREAD_TARGETS = ['allAdjacent', 'allAdjacentFoes', 'all'];

/** moveId가 전체공격(스프레드) 기술인지 판정 */
export function isSpreadMove(moveId) {
  const moveData = showdownIntegration.getMove(moveId);
  return !!moveData && SPREAD_TARGETS.includes(moveData.target);
}

/**
 * 보스의 전체공격(스프레드) 기술 실행. 생존한 참가자 전원에게 각각 데미지를 적용한다(개별 타입 상성
 * 반영, 0.75배 스프레드 감소 적용). "뒤는 맡기라고"가 활성화된 참가자가 있으면 규칙 IV장 3항에 따라
 * 아군 1마리가 받을 공격을 대신 받아내 — 그 아군은 이번 공격에서 완전히 제외되고, 대신 받아낸 참가자는
 * 자기 몫 데미지에 더해 그 아군 몫 데미지까지 한 번 더 맞는다. 동시에 여러 명이 활성화되어 있으면
 * (여러 조가 함께 진행 중일 때 등) 각자 한 명씩 따로 보호한다.
 * protectionChoices({ [가디언 참가자 id]: 지정한 보호 대상 id })를 넘기면 해당 가디언은 그 대상을
 * 보호하고, 지정하지 않으면(또는 대상이 무효하면) 같은 조 중에서(없으면 전체 중에서) 무작위로 고른다.
 * state.activeTeam이 지정돼 있으면(여러 조가 함께 배틀에 참여 중이라도) 그 조 소속 생존 참가자만
 * 전체공격 대상이 된다 — 규칙상 전체공격은 "이번 라운드에 행동할 조"에 한정된다.
 */
export function executeBossSpreadAction(state, moveId, protectionChoices = {}) {
  if (state.status !== 'ongoing' || !moveId) return state;

  const activeTeam = state.activeTeam || '';
  const alive = state.participants.filter(
    (p) => p && !p.fainted && (!activeTeam || (p.team || '') === activeTeam)
  );
  if (alive.length === 0) return state;

  const roundNum = state.round + 1;
  const gate = resolveActionGate(state.boss);
  let boss = gate.attacker;
  let log = [...state.log, ...gate.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];

  if (!gate.canAct) {
    return { ...state, boss, log };
  }

  const moveInfo = showdownIntegration.getMove(moveId);
  let finalMoveId = moveId;
  if (moveInfo) {
    const legality = checkMoveLegality(boss, moveId, moveInfo);
    log = [...log, ...legality.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];
    if (legality.blocked) {
      return { ...state, boss, log };
    }
    finalMoveId = legality.finalMoveId;
  }

  const guardians = alive.filter((p) => p.redirectActive);
  const guardianIds = new Set(guardians.map((g) => g.id));
  let participants = state.participants;
  const protectedAllyIds = new Set();
  const assignments = [];

  guardians.forEach((guardian) => {
    const candidates = alive.filter((p) => !guardianIds.has(p.id) && !protectedAllyIds.has(p.id));
    if (candidates.length === 0) return;
    const chosen = candidates.find((p) => String(p.id) === String(protectionChoices?.[guardian.id]));
    const sameTeamCandidates = candidates.filter((p) => (p.team || '') === (guardian.team || ''));
    const pool = sameTeamCandidates.length > 0 ? sameTeamCandidates : candidates;
    const protectedAlly = chosen || pool[Math.floor(Math.random() * pool.length)];
    protectedAllyIds.add(protectedAlly.id);
    assignments.push({ guardian, protectedAlly });
    log.push({
      round: roundNum,
      phase: 'boss',
      text: `${guardian.nickname}이(가) ${protectedAlly.nickname}이(가) 받을 공격까지 대신 막아낸다!`,
    });
  });

  alive.forEach((target) => {
    if (protectedAllyIds.has(target.id)) return;
    const idx = participants.findIndex((p) => p && p.id === target.id);
    if (idx === -1 || participants[idx].fainted) return;
    const result = attack(boss, participants[idx], finalMoveId, { isSpread: true });
    boss = result.attacker;
    participants = participants.map((p, i) => (i === idx ? result.defender : p));
    log = [...log, ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];
  });

  assignments.forEach(({ guardian }) => {
    const idx = participants.findIndex((p) => p && p.id === guardian.id);
    if (idx !== -1 && !participants[idx].fainted) {
      const result = attack(boss, participants[idx], finalMoveId, { isSpread: true });
      boss = result.attacker;
      participants = participants.map((p, i) => (i === idx ? result.defender : p));
      log = [...log, ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];
    }
  });

  // "뒤는 맡기라고"는 이번 턴(보스의 행동 1회)만 유효 — 라운드 끝까지가 아니라 이 공격을
  // 받아낸 즉시 해제한다 (활성화됐던 가디언 전원)
  if (guardianIds.size > 0) {
    participants = participants.map((p) => (p && guardianIds.has(p.id) ? { ...p, redirectActive: false } : p));
  }

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

function applyStatBuff(participant, buffs, turns) {
  const boosts = { ...participant.boosts };
  const buffTimers = { ...participant.buffTimers };
  Object.entries(buffs).forEach(([stat, stage]) => {
    boosts[stat] = stage;
    buffTimers[stat] = turns;
  });
  return { ...participant, boosts, buffTimers };
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
              status: null,
              statusTurns: 0,
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

/** 보스/참가자 입력 폼 데이터로부터 새 전투 상태 생성 */
export function createInitialBattleState({ boss, participants, maxRounds = 6 }) {
  return {
    boss: buildBattlePokemon(boss),
    participants: participants.map((p) => (p && p.position && p.position.trim() ? buildBattlePokemon(p) : null)),
    round: 0,
    status: 'ongoing',
    maxRounds,
    log: [{ round: 1, phase: 'start', text: '--- 1라운드 시작 ---' }],
    actedParticipantIds: [],
    // 이번 라운드에 행동할 조. 비어있으면("") 조 구분 없이 전체 참가자를 대상으로 한다.
    activeTeam: '',
  };
}

/** 이번 라운드에 행동할 조를 지정한다("" 이면 조 제한 없음) — 전체공격 범위를 그 조로 한정한다 */
export function setActiveTeam(state, team) {
  return { ...state, activeTeam: team ? String(team) : '' };
}
