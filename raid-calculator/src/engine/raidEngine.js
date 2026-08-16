import showdownIntegration from '../lib/showdownIntegration.js';
import { calculateHP } from '../lib/statCalculator.js';
import { POSITION_CHEERS, STAT_LABEL, STATUS_LABEL, MAX_CHEERS_PER_PARTICIPANT } from '../lib/cheers.js';

const DEFAULT_BASE_STATS = { hp: 100, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 };
const FIXED_IVS = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
const EMPTY_EVS = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const EMPTY_BOOSTS = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

/** 입력 폼 데이터(raw)를 실제 전투에 쓸 수 있는 파생 상태를 가진 객체로 변환 */
export function buildBattlePokemon(raw) {
  // 아군 참가자(position 필드를 가진 커스텀 유닛)는 레벨 50 / 성격 하드 / 도구 없음 / 특성 없음 /
  // 개체값 전부 31로 고정. 종족값/타입/노력치/기술/포지션/성별은 직접 입력값을 사용.
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
    currentHP: maxHP,
    fainted: false,
    boosts: { ...EMPTY_BOOSTS },
    status: '',
    toxicCounter: 0,
    volatileFlags: [],
    cheersUsed: 0,
    activeBuffs: [],
    skipNextAction: false,
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

function clampStage(v) {
  return Math.max(-6, Math.min(6, v));
}

function applyStatDeltas(pokemon, deltas) {
  const boosts = { ...pokemon.boosts };
  Object.entries(deltas).forEach(([stat, delta]) => {
    if (!delta) return;
    boosts[stat] = clampStage((boosts[stat] || 0) + delta);
  });
  return { ...pokemon, boosts };
}

function describeStatChange(nickname, deltas) {
  return Object.entries(deltas)
    .filter(([, delta]) => delta)
    .map(([stat, delta]) => `${nickname}의 ${STAT_LABEL[stat] || stat}이(가) ${delta > 0 ? '올랐다' : '떨어졌다'}!`);
}

function isStatusImmune(status, types) {
  if (status === 'brn' && types.includes('Fire')) return true;
  if ((status === 'psn' || status === 'tox') && (types.includes('Poison') || types.includes('Steel'))) return true;
  if (status === 'frz' && types.includes('Ice')) return true;
  return false;
}

/**
 * attacker가 moveId로 defender를 공격. 데미지뿐 아니라 랭크 변화/상태이상까지 반영한
 * attacker/defender의 새 상태와 게임 공식 문구 스타일의 로그 줄들을 반환.
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
      attacker,
      defender,
      lines: [`${attacker.nickname}의 ${moveId} 사용 실패 (기술을 찾을 수 없음)`],
    };
  }

  const moveData = result.moveData;
  const lines = [`${attacker.nickname}의 ${moveData.name}!`];

  // 헤롱헤롱(Attract): 서로 성별이 다를 때만 효과가 있음
  if (moveData.id === 'attract') {
    const aGender = attacker.gender;
    const dGender = defender.gender;
    if (!aGender || !dGender || aGender === dGender) {
      lines.push(`${defender.nickname}에게는 효과가 없다!`);
    } else {
      lines.push(`${defender.nickname}은(는) ${attacker.nickname}에게 반했다!`);
    }
    return { attacker, defender, lines };
  }

  const defenderTypes = defender.types && defender.types.length ? defender.types : ['Normal'];
  const effectiveness = showdownIntegration.getTypeEffectiveness(moveData.type, defenderTypes);

  if (effectiveness === 0) {
    lines.push(`${defender.nickname}에게는 통하지 않았다!`);
    return { attacker, defender, lines };
  }

  if (!moveData.basePower) {
    // 변화기술: 랭크 변화/상태이상만 적용 (데미지 없음)
    let nextAttacker = attacker;
    let nextDefender = defender;

    if (moveData.boosts) {
      if (moveData.target === 'self') {
        nextAttacker = applyStatDeltas(attacker, moveData.boosts);
        lines.push(...describeStatChange(attacker.nickname, moveData.boosts));
      } else {
        nextDefender = applyStatDeltas(defender, moveData.boosts);
        lines.push(...describeStatChange(defender.nickname, moveData.boosts));
      }
    }

    if (moveData.status) {
      if (nextDefender.status) {
        lines.push(`${nextDefender.nickname}에게는 효과가 없다! (이미 상태이상)`);
      } else if (isStatusImmune(moveData.status, defenderTypes)) {
        lines.push(`${nextDefender.nickname}에게는 효과가 없다!`);
      } else {
        nextDefender = { ...nextDefender, status: moveData.status, toxicCounter: moveData.status === 'tox' ? 1 : 0 };
        lines.push(`${nextDefender.nickname}은(는) ${STATUS_LABEL[moveData.status] || moveData.status} 상태가 되었다!`);
      }
    }

    if (!moveData.boosts && !moveData.status) {
      lines.push(`${defender.nickname}에게는 별다른 효과가 없었다.`);
    }

    return { attacker: nextAttacker, defender: nextDefender, lines };
  }

  if (result.error) {
    lines.push(`${defender.nickname}에게는 효과가 없었다...`);
    return { attacker, defender, lines };
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

  return { attacker, defender: updatedDefender, lines, damage: dmg };
}

function aliveNotActed(participants, actedIds) {
  return participants.filter((p) => p && !p.fainted && !actedIds.includes(p.id));
}

/** 화상/독/맹독 잔여 데미지. 레이드 체력 배수가 아닌 원래(배수 곱하기 전) 최대 체력 기준으로 계산 */
function applyResidualStatus(pokemon) {
  if (!pokemon || pokemon.fainted || !pokemon.status) return { pokemon, line: null };
  if (!['brn', 'psn', 'tox'].includes(pokemon.status)) return { pokemon, line: null };

  const base = pokemon.baseMaxHP || pokemon.maxHP;
  let dmg;
  let nextToxicCounter = pokemon.toxicCounter || 1;

  if (pokemon.status === 'tox') {
    dmg = Math.max(1, Math.floor((base * nextToxicCounter) / 16));
    nextToxicCounter += 1;
  } else {
    dmg = Math.max(1, Math.floor(base / 16));
  }

  const nextHP = Math.max(0, pokemon.currentHP - dmg);
  const fainted = nextHP <= 0;
  const line =
    `${pokemon.nickname}은(는) ${STATUS_LABEL[pokemon.status]}(으)로 피해를 입었다! ` +
    `(HP ${formatHpPercent(nextHP, pokemon.maxHP)})${fainted ? ` — ${pokemon.nickname} 기절` : ''}`;

  return { pokemon: { ...pokemon, currentHP: nextHP, fainted, toxicCounter: nextToxicCounter }, line };
}

/** 응원/기술로 부여된 임시 능력 변화 중 이번 라운드에 만료되는 것을 되돌림 */
function expireBuffs(pokemon, finishedRound) {
  if (!pokemon || !pokemon.activeBuffs || pokemon.activeBuffs.length === 0) return pokemon;

  const boosts = { ...pokemon.boosts };
  const stillActive = [];
  pokemon.activeBuffs.forEach((buff) => {
    if (finishedRound >= buff.expiresAfterRound) {
      boosts[buff.stat] = clampStage((boosts[buff.stat] || 0) - buff.amount);
    } else {
      stillActive.push(buff);
    }
  });

  return { ...pokemon, boosts, activeBuffs: stillActive };
}

/**
 * 이번 라운드에 아직 행동하지 않은 생존 참가자가 더 이상 없으면 라운드를 마무리한다.
 * 라운드 종료 시 상태이상 잔여 데미지 적용, 임시 능력 변화 만료, 다음 라운드에 행동 불가한
 * 참가자(끝내버려 사용자 등) 자동 처리까지 함께 수행한다.
 */
function finalizeRoundIfComplete(state) {
  if (state.status !== 'ongoing') return state;

  const remaining = aliveNotActed(state.participants, state.actedParticipantIds);
  if (remaining.length > 0) return state;

  const finishedRound = state.round + 1;
  const log = [...state.log];

  let boss = state.boss;
  const bossResidual = applyResidualStatus(boss);
  boss = bossResidual.pokemon;
  if (bossResidual.line) log.push({ round: finishedRound, phase: 'status', text: bossResidual.line });

  let participants = state.participants.map((p) => {
    if (!p) return p;
    const { pokemon, line } = applyResidualStatus(p);
    if (line) log.push({ round: finishedRound, phase: 'status', text: line });
    return pokemon;
  });

  boss = expireBuffs(boss, finishedRound);
  participants = participants.map((p) => (p ? expireBuffs(p, finishedRound) : p));

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

  const nextRound = finishedRound + 1;
  log.push({ round: nextRound, phase: 'start', text: `--- ${nextRound}라운드 시작 ---` });

  // 끝내버려 등으로 다음 라운드에 행동 불가한 참가자는 자동으로 "행동 완료" 처리해 선택지에서 뺀다
  const skippedIds = participants.filter((p) => p && !p.fainted && p.skipNextAction).map((p) => p.id);
  participants = participants.map((p) => (p && p.skipNextAction ? { ...p, skipNextAction: false } : p));
  skippedIds.forEach((id) => {
    const p = participants.find((x) => x && x.id === id);
    if (p) log.push({ round: nextRound, phase: 'status', text: `${p.nickname}은(는) 이번 턴 행동할 수 없다!` });
  });

  return { ...state, boss, participants, round: finishedRound, status: 'ongoing', actedParticipantIds: skippedIds, log };
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
  const participants = state.participants.map((p, i) => (i === idx ? result.attacker : p));
  const log = [...state.log, ...result.lines.map((text) => ({ round: roundNum, phase: 'participant', text }))];

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
  const boss = result.attacker;
  const participants = state.participants.map((p, i) => (i === idx ? result.defender : p));
  const log = [...state.log, ...result.lines.map((text) => ({ round: roundNum, phase: 'boss', text }))];

  const next = { ...state, boss, participants, log };

  if (!participants.some((p) => p && !p.fainted)) {
    return {
      ...next,
      status: 'loss',
      log: [...log, { round: roundNum, phase: 'end', text: `--- ${roundNum}라운드 종료 (참가자 전멸) ---` }],
    };
  }

  return finalizeRoundIfComplete(next);
}

/** 참가자의 응원 실행 (포지션별 2종, 참가자 1명당 최대 2회까지) */
export function executeCheer(state, participantId, cheerId) {
  if (state.status !== 'ongoing') return state;
  if (state.actedParticipantIds.includes(participantId)) return state;

  const idx = state.participants.findIndex((p) => p && p.id === participantId && !p.fainted);
  if (idx === -1) return state;

  const caster = state.participants[idx];
  if ((caster.cheersUsed || 0) >= MAX_CHEERS_PER_PARTICIPANT) return state;

  const cheer = (POSITION_CHEERS[caster.position] || []).find((c) => c.id === cheerId);
  if (!cheer) return state;

  const roundNum = state.round + 1;
  const lines = [`${caster.nickname}의 응원 - ${cheer.name}!`];
  let participants = [...state.participants];

  if (cheer.scope === 'team') {
    const deltas = Object.fromEntries(cheer.stats.map((s) => [s, cheer.amount]));
    participants = participants.map((p) => {
      if (!p || p.fainted) return p;
      const boosted = applyStatDeltas(p, deltas);
      const buffs = cheer.stats.map((s) => ({ stat: s, amount: cheer.amount, expiresAfterRound: roundNum + cheer.duration }));
      return { ...boosted, activeBuffs: [...(boosted.activeBuffs || []), ...buffs] };
    });
    lines.push(`아군 전체의 ${cheer.stats.map((s) => STAT_LABEL[s]).join('/')}이(가) 올랐다!`);
  } else if (cheer.scope === 'self') {
    const deltas = Object.fromEntries(cheer.stats.map((s) => [s, cheer.amount]));
    const boosted = applyStatDeltas(caster, deltas);
    const buffs = cheer.stats.map((s) => ({ stat: s, amount: cheer.amount, expiresAfterRound: roundNum + cheer.duration }));
    participants[idx] = {
      ...boosted,
      activeBuffs: [...(boosted.activeBuffs || []), ...buffs],
      skipNextAction: !!cheer.skipNext || boosted.skipNextAction,
    };
    lines.push(`${caster.nickname}의 ${cheer.stats.map((s) => STAT_LABEL[s]).join('/')}이(가) 크게 올랐다!`);
  } else if (cheer.scope === 'team-heal') {
    participants = participants.map((p) => {
      if (!p || p.fainted) return p;
      const nextHP = Math.min(p.maxHP, p.currentHP + Math.round(p.maxHP * cheer.amount));
      return { ...p, currentHP: nextHP };
    });
    lines.push('아군 전체의 체력이 회복되었다!');
  } else if (cheer.scope === 'team-cure') {
    participants = participants.map((p) => (p && !p.fainted ? { ...p, status: '', toxicCounter: 0, volatileFlags: [] } : p));
    lines.push('아군 전체의 상태이상이 회복되었다!');
  } else if (cheer.scope === 'self-flag') {
    participants[idx] = { ...caster, volatileFlags: [...(caster.volatileFlags || []), cheer.flag] };
    lines.push(`${caster.nickname}이(가) 시선을 끈다!`);
  }

  participants = participants.map((p, i) => (i === idx ? { ...p, cheersUsed: (p.cheersUsed || 0) + 1 } : p));

  const next = {
    ...state,
    participants,
    actedParticipantIds: [...state.actedParticipantIds, participantId],
    log: [...state.log, ...lines.map((text) => ({ round: roundNum, phase: 'cheer', text }))],
  };

  return finalizeRoundIfComplete(next);
}

/** 테라레이드처럼 보스가 턴을 소모하지 않고 필드(자신 포함) 전체의 랭크 변화를 원래대로 되돌림 */
export function resetFieldBoosts(state) {
  if (state.status !== 'ongoing') return state;
  const roundNum = state.round + 1;
  const boss = { ...state.boss, boosts: { ...EMPTY_BOOSTS }, activeBuffs: [] };
  const participants = state.participants.map((p) => (p ? { ...p, boosts: { ...EMPTY_BOOSTS }, activeBuffs: [] } : p));
  const line = {
    round: roundNum,
    phase: 'boss',
    text: `${state.boss.nickname}이(가) 필드의 모든 랭크 변화를 원래대로 되돌렸다! (턴 소모 없음)`,
  };
  return { ...state, boss, participants, log: [...state.log, line] };
}

/** 테라레이드처럼 보스가 턴을 소모하지 않고 자신의 상태이상(도발/앵콜 등 포함)을 회복함 */
export function cureBossStatus(state) {
  if (state.status !== 'ongoing') return state;
  const roundNum = state.round + 1;
  const boss = { ...state.boss, status: '', toxicCounter: 0, volatileFlags: [] };
  const line = {
    round: roundNum,
    phase: 'boss',
    text: `${state.boss.nickname}이(가) 자신의 상태이상을 모두 회복했다! (턴 소모 없음)`,
  };
  return { ...state, boss, log: [...state.log, line] };
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
  };
}
