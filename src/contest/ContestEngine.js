// 콘테스트 자동 판정 엔진 (1차 심사 + 2차 심사 6라운드)
// 순수 상태 객체(JSON 직렬화 가능)를 입력받아 새 상태를 반환하는 함수형 엔진.
// UI(React)는 이 상태를 그대로 useState로 들고 있으면 됨.
import {
  MAX_STARS,
  MAX_APPLAUSE,
  roll2d6,
  roll1d100,
  calcNervousChance,
  rollNervous,
  getPenaltyMultiplier,
  isMatchingMove,
} from './contestRules';
import { getContestEffectHandler, getRepeatExemptMoveIds } from './contestEffects';
import { isComboStarter, isValidComboFollowUp, COMBO_FOLLOWUP_BONUS } from './comboChart';

const clone = (value) => JSON.parse(JSON.stringify(value));

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * participantsInput: [{ id, name, pokemonName, conditionValue, moves: [moveData, ...] }]
 * moveData는 src/data/moves.json의 기술 객체(contestType/contestAppeals/contestJam/contestEffect 포함)를 그대로 사용.
 */
export const createContestState = (contestType, participantsInput) => ({
  contestType,
  phase: 'setup',
  round: 0,
  order: [],
  turnPointer: 0,
  appealedThisTurn: [],
  applause: { value: 0 },
  pendingOverrides: { goFirstIds: [], goLastIds: [], shuffleNext: false, reverseNext: false },
  globalPreventNextJam: false,
  log: [],
  participants: participantsInput.map((p) => ({
    id: p.id,
    name: p.name,
    pokemonName: p.pokemonName || '',
    conditionValue: p.conditionValue || 0,
    moves: p.moves || [],
    stars: 0,
    lastMoveId: null,
    comboWaiting: null,
    matchAppealCount: 0,
    appeal1: 0,
    totalAppeal: 0,
    cannotAppealRestOfContest: false,
    cannotAppealNextRound: false,
    cannotBeJammedNextRound: false,
    forcedNervousThisRound: false,
    noJamRestOfTurn: false,
    doubleJamIfHitThisTurn: false,
  })),
});

const sortByAppealDesc = (participants, key = 'totalAppeal') => {
  const withTiebreak = participants.map((p) => ({ p, tie: Math.random() }));
  withTiebreak.sort((a, b) => (b.p[key] - a.p[key]) || (b.tie - a.tie));
  return withTiebreak.map((x) => x.p.id);
};

export const runFirstJudging = (stateIn) => {
  const state = clone(stateIn);
  state.participants.forEach((p) => {
    const roll = roll2d6();
    p.appeal1 = roll;
    p.totalAppeal = roll;
    state.log.push({ type: 'firstJudging', participantId: p.id, roll });
  });
  state.order = sortByAppealDesc(state.participants, 'totalAppeal');
  state.phase = 'secondJudging';
  state.round = 1;
  state.turnPointer = 0;
  state.appealedThisTurn = [];
  state.log.push({ type: 'roundStart', round: 1, order: [...state.order] });
  return state;
};

export const getCurrentActor = (state) => {
  if (state.phase !== 'secondJudging') return null;
  const id = state.order[state.turnPointer];
  return state.participants.find((p) => p.id === id) || null;
};

export const canUseMove = (state, participantId, moveId, allMoves = []) => {
  const actor = state.participants.find((p) => p.id === participantId);
  if (!actor) return false;
  const move = actor.moves.find((m) => m.id === moveId);
  if (!move || !move.contestType) return false;
  if (actor.lastMoveId !== moveId) return true;
  const exemptIds = getRepeatExemptMoveIds(allMoves.length ? allMoves : actor.moves);
  return exemptIds.has(moveId);
};

const applyJam = (state, targetId, amount) => {
  const target = state.participants.find((p) => p.id === targetId);
  if (!target || amount <= 0) return;
  if (target.cannotBeJammedNextRound) return;
  let finalAmount = amount;
  if (state.globalPreventNextJam) {
    state.globalPreventNextJam = false;
    return;
  }
  if (target.noJamRestOfTurn) return;
  if (target.doubleJamIfHitThisTurn) {
    finalAmount *= 2;
    target.doubleJamIfHitThisTurn = false;
  }
  target.totalAppeal = Math.max(0, target.totalAppeal - finalAmount);
  state.log.push({ type: 'jam', targetId, amount: finalAmount });
};

/**
 * 현재 턴 진행: 긴장 판정 → (긴장 아니면) 기술 효과 계산 → 결과 반영 → 다음 턴/라운드로 이동.
 * options: { moveId, targetId, declareCombo, comboSuccessBonus, rng }
 */
export const advanceTurn = (stateIn, options = {}) => {
  const state = clone(stateIn);
  if (state.phase !== 'secondJudging') return state;

  const actorId = state.order[state.turnPointer];
  const actor = state.participants.find((p) => p.id === actorId);
  const position = state.turnPointer;
  const total = state.order.length;

  const finishTurn = () => {
    state.turnPointer += 1;
    if (state.turnPointer >= state.order.length) {
      endRound(state);
    }
    return state;
  };

  // 콘테스트 이탈/강제 스킵 상태
  if (actor.cannotAppealRestOfContest) {
    state.log.push({ type: 'skip', participantId: actorId, reason: 'cannotAppealRestOfContest' });
    state.appealedThisTurn.push({ id: actorId, gainedAppeal: 0, moveContestType: null, comboStandby: false });
    return finishTurn();
  }
  if (actor.cannotAppealNextRound) {
    actor.cannotAppealNextRound = false;
    state.log.push({ type: 'skip', participantId: actorId, reason: 'cannotAppealNextRound' });
    state.appealedThisTurn.push({ id: actorId, gainedAppeal: 0, moveContestType: null, comboStandby: false });
    return finishTurn();
  }
  if (actor.forcedNervousThisRound) {
    state.log.push({ type: 'nervous', participantId: actorId, forced: true });
    state.appealedThisTurn.push({ id: actorId, gainedAppeal: 0, moveContestType: null, comboStandby: false });
    return finishTurn();
  }

  // 긴장 판정
  const nervousChance = calcNervousChance({
    position,
    totalParticipants: total,
    conditionValue: actor.conditionValue,
    stars: actor.stars,
  });
  const isNervous = rollNervous(nervousChance);
  if (isNervous) {
    state.log.push({ type: 'nervous', participantId: actorId, chance: nervousChance });
    state.appealedThisTurn.push({ id: actorId, gainedAppeal: 0, moveContestType: null, comboStandby: false });
    return finishTurn();
  }

  const move = actor.moves.find((m) => m.id === options.moveId);
  if (!move) {
    throw new Error(`유효한 기술을 선택해야 합니다 (moveId: ${options.moveId})`);
  }
  if (!canUseMove(state, actorId, move.id)) {
    throw new Error(`${move.name}은(는) 전 턴에 사용해서 이번 턴에 다시 사용할 수 없습니다.`);
  }

  const handler = getContestEffectHandler(move.contestEffect);
  const ctx = {
    actor,
    move,
    contestType: state.contestType,
    turnIndex: position,
    order: state.order,
    appealedThisTurn: state.appealedThisTurn,
    applause: state.applause,
    targetId: options.targetId,
    rng: options.rng || randomPick,
  };
  const result = handler ? handler(ctx) : { appealGain: move.contestAppeals || 0 };
  const flags = result.flags || {};

  const multiplier = getPenaltyMultiplier(move.contestType, state.contestType);
  const isMatch = isMatchingMove(move.contestType, state.contestType);
  let finalAppeal = Math.round((result.appealGain || 0) * multiplier);

  // ☆ 보유 보너스 (이번 기술 자체가 star 기반 공식일 땐 중복 방지)
  if (finalAppeal > 0 && actor.stars > 0 && !flags.suppressStarBonus) {
    finalAppeal += actor.stars;
  }

  // 콤보 - Bulbapedia "Contest combination"(6세대) 조합표 기준 자동 판정, 성공 시 +3 고정
  const comboSuccess = !!actor.comboWaiting && isValidComboFollowUp(actor.comboWaiting.moveId, move.id);
  if (comboSuccess) {
    finalAppeal += COMBO_FOLLOWUP_BONUS;
  }

  actor.totalAppeal += finalAppeal;

  // 박수(흥분도) 게이지: 일치 타입 어필 성공 시 상승, 패널티 타입 사용 시 하락 (podic.kr 페이지 상단 공통 규칙)
  if (!state.applause.freezeThisTurn) {
    const isLast = position === total - 1;
    const isFirst = position === 0;
    if (flags.forceApplauseRise || (isMatch && finalAppeal > 0)) {
      const rise = (isLast && flags.applauseBonusIfLast) || (isFirst && flags.applauseBonusIfFirst) || 1;
      state.applause.value = Math.min(MAX_APPLAUSE, state.applause.value + rise);
    } else if (multiplier < 1) {
      state.applause.value = Math.max(0, state.applause.value - 1);
    }
  }
  if (flags.freezeApplauseRestOfTurn) state.applause.freezeThisTurn = true;

  // 라이브 어필 (일치 타입으로 5회 성공 시 +5)
  if (isMatch && finalAppeal > 0) {
    actor.matchAppealCount += 1;
    if (actor.matchAppealCount >= 5) {
      actor.matchAppealCount = 0;
      actor.totalAppeal += 5;
      state.log.push({ type: 'liveAppeal', participantId: actorId });
    }
  }

  // 방해 적용 (패널티 타입이면 방해량도 절반)
  (result.jamTargets || []).forEach(({ targetId, amount }) => {
    applyJam(state, targetId, Math.round(amount * multiplier));
  });

  // 부가 효과 플래그 반영
  if (flags.gainStar) actor.stars = Math.min(MAX_STARS, actor.stars + 1);
  if (flags.noJamRestOfTurn) actor.noJamRestOfTurn = true;
  if (flags.doubleJamIfHitThisTurn) actor.doubleJamIfHitThisTurn = true;
  if (flags.preventNextJamGlobal) state.globalPreventNextJam = true;
  if (flags.cannotAppealNextRound) actor.cannotAppealNextRound = true;
  if (flags.cannotBeJammedNextRound) actor.cannotBeJammedNextRound = true;
  if (flags.cannotAppealRestOfContest) actor.cannotAppealRestOfContest = true;
  if (flags.goFirstNextRound) state.pendingOverrides.goFirstIds.push(actorId);
  if (flags.goLastNextRound) state.pendingOverrides.goLastIds.push(actorId);
  if (flags.shuffleNextRound) state.pendingOverrides.shuffleNext = true;
  if (flags.reverseNextRound) state.pendingOverrides.reverseNext = true;
  if (flags.makeFollowingNervous) {
    state.order.slice(position + 1).forEach((id) => {
      const p = state.participants.find((pp) => pp.id === id);
      if (p) p.forcedNervousThisRound = true;
    });
  }
  if (flags.removeStarsFromAppealed) {
    state.appealedThisTurn.forEach((e) => {
      const p = state.participants.find((pp) => pp.id === e.id);
      if (p) p.stars = 0;
    });
  }
  if (flags.cancelComboStandbyForAppealed) {
    state.appealedThisTurn.forEach((e) => {
      const p = state.participants.find((pp) => pp.id === e.id);
      if (p) p.comboWaiting = null;
    });
  }

  if (comboSuccess) {
    state.log.push({ type: 'combo', participantId: actorId, bonus: COMBO_FOLLOWUP_BONUS });
  }
  // 이번 기술이 콤보 선행 기술이면 다음 턴 콤보 대기 상태로 전환(성공 여부와 무관하게 갱신)
  actor.comboWaiting = isComboStarter(move.id) ? { moveId: move.id } : null;

  actor.lastMoveId = move.id;
  state.appealedThisTurn.push({
    id: actorId,
    gainedAppeal: finalAppeal,
    moveContestType: move.contestType,
    comboStandby: !!actor.comboWaiting,
  });
  state.log.push({
    type: 'appeal',
    participantId: actorId,
    moveId: move.id,
    moveName: move.name,
    gainedAppeal: finalAppeal,
    isMatch,
    isPenalty: multiplier < 1,
  });

  return finishTurn();
};

const endRound = (state) => {
  // 라운드 한정 플래그 초기화
  state.participants.forEach((p) => {
    p.forcedNervousThisRound = false;
    p.noJamRestOfTurn = false;
    p.doubleJamIfHitThisTurn = false;
  });
  state.applause.freezeThisTurn = false;
  state.globalPreventNextJam = false;

  state.log.push({ type: 'roundEnd', round: state.round, standings: state.participants.map(p => ({ id: p.id, totalAppeal: p.totalAppeal })) });

  if (state.round >= 6) {
    state.phase = 'done';
    return;
  }

  let nextOrder = sortByAppealDesc(state.participants, 'totalAppeal');
  if (state.pendingOverrides.shuffleNext) {
    for (let i = nextOrder.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [nextOrder[i], nextOrder[j]] = [nextOrder[j], nextOrder[i]];
    }
  } else if (state.pendingOverrides.reverseNext) {
    nextOrder = [...nextOrder].reverse();
  }
  const { goFirstIds, goLastIds } = state.pendingOverrides;
  if (goFirstIds.length || goLastIds.length) {
    const firstSet = new Set(goFirstIds);
    const lastSet = new Set(goLastIds.filter((id) => !firstSet.has(id)));
    const middle = nextOrder.filter((id) => !firstSet.has(id) && !lastSet.has(id));
    nextOrder = [
      ...nextOrder.filter((id) => firstSet.has(id)),
      ...middle,
      ...nextOrder.filter((id) => lastSet.has(id)),
    ];
  }

  state.order = nextOrder;
  state.round += 1;
  state.turnPointer = 0;
  state.appealedThisTurn = [];
  state.pendingOverrides = { goFirstIds: [], goLastIds: [], shuffleNext: false, reverseNext: false };
  state.log.push({ type: 'roundStart', round: state.round, order: [...state.order] });
};

export const getStandings = (state) => {
  const sorted = [...state.participants].sort((a, b) => b.totalAppeal - a.totalAppeal);
  return sorted.map((p, index) => ({ rank: index + 1, ...p }));
};

export const isContestDone = (state) => state.phase === 'done';
