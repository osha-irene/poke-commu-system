// 콘테스트 자동 판정 엔진 - src/contest/ContestEngine.js(웹 관리자 시뮬레이터, ES module)를
// 기준으로 그대로 포팅한 CommonJS 버전. 로직은 src 쪽과 동일하게 유지한다 (2026-07-28 기준 -
// 이전에는 이 파일에만 있던 "박수(흥분도) 게이지" 기능이 src에는 없어 두 엔진이 갈라져 있었는데,
// 흥분도 게이지 자체를 완전히 제거하고 웹 버전 로직으로 통일했다).
// 순수 상태 객체(JSON 직렬화 가능)를 입력받아 새 상태를 반환하는 함수형 엔진.
const {
  MAX_STARS,
  roll2d6,
  roll1d100,
  calcNervousChance,
  rollNervous,
  getPenaltyMultiplier,
  isMatchingMove,
} = require('./contestRules');
const { getContestEffectHandler, getRepeatExemptMoveIds, FINAL_ROUND_RESTRICTED_EFFECTS } = require('./contestEffects');
const { isComboStarter, getComboBonus } = require('./comboChart');

// 2026-07-28: 웹 시뮬레이터(src/contest/ContestEngine.js의 MAX_ROUND)와 라운드 수를 통일 - 6→4.
const DEFAULT_MAX_ROUNDS = 4;

const clone = (value) => JSON.parse(JSON.stringify(value));

// Firebase RTDB는 빈 배열([])/빈 객체({})를 저장하면 그 키 자체를 지워버려서, 나중에 읽어오면
// undefined로 돌아온다. appealedThisTurn과 pendingOverrides.goFirstIds/goLastIds는 라운드가
// 끝날 때마다 []로 리셋되고 그 상태로 DB에 저장되기 때문에, 다음 라운드에서 이 state를 다시
// 불러와 advanceTurn/forceSkipTurn에 넘기면 정확히 이 문제에 걸린다 - `.push`를 시도하는 순간
// "Cannot read properties of undefined (reading 'push')"로 터진다. DB를 거쳐 돌아온 state를
// 쓰기 전에 항상 정규화해서 방어한다.
const normalizeState = (state) => {
  if (!state.appealedThisTurn) state.appealedThisTurn = [];
  if (!state.log) state.log = [];
  if (!state.pendingOverrides) {
    state.pendingOverrides = { goFirstIds: [], goLastIds: [], shuffleNext: false, reverseNext: false };
  } else {
    if (!state.pendingOverrides.goFirstIds) state.pendingOverrides.goFirstIds = [];
    if (!state.pendingOverrides.goLastIds) state.pendingOverrides.goLastIds = [];
  }
  return state;
};

const randomPick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/**
 * participantsInput: [{ id, name, pokemonName, conditionValue, moves: [moveData, ...] }]
 * moveData는 src/data/moves.json의 기술 객체(contestType/contestAppeals/contestJam/contestEffect 포함)를 그대로 사용.
 * options.maxRounds: 2차 심사를 몇 라운드까지 진행할지 (기본 4 - 웹 시뮬레이터와 동일하게 유지).
 * 기본값과 다른 라운드 수로 진행하고 싶을 때만 넘기면 된다.
 */
const createContestState = (contestType, participantsInput, options = {}) => ({
  contestType,
  phase: 'setup',
  round: 0,
  maxRounds: Number.isInteger(options.maxRounds) && options.maxRounds > 0 ? options.maxRounds : DEFAULT_MAX_ROUNDS,
  order: [],
  turnPointer: 0,
  appealedThisTurn: [],
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
    appealHalvedThisTurn: false,
  })),
});

const sortByAppealDesc = (participants, key = 'totalAppeal') => {
  const withTiebreak = participants.map((p) => ({ p, tie: Math.random() }));
  withTiebreak.sort((a, b) => (b.p[key] - a.p[key]) || (b.tie - a.tie));
  return withTiebreak.map((x) => x.p.id);
};

const runFirstJudging = (stateIn, options = {}) => {
  const state = clone(stateIn);
  const manualRolls = options.rolls || {};
  state.participants.forEach((p) => {
    const manual = manualRolls[p.id];
    const roll = Number.isInteger(manual) && manual >= 2 && manual <= 12 ? manual : roll2d6();
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

const getCurrentActor = (state) => {
  if (state.phase !== 'secondJudging') return null;
  const id = state.order[state.turnPointer];
  return state.participants.find((p) => p.id === id) || null;
};

const canUseMove = (state, participantId, moveId, allMoves = []) => {
  const actor = state.participants.find((p) => p.id === participantId);
  if (!actor) return false;
  const move = actor.moves.find((m) => m.id === moveId);
  if (!move || !move.contestType) return false;
  if (FINAL_ROUND_RESTRICTED_EFFECTS.has(move.contestEffect) && state.round >= (state.maxRounds || DEFAULT_MAX_ROUNDS)) return false;
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
 * options: { moveId, targetId, targetIds, declareCombo, comboSuccessBonus, rng, diceValue, forceNervousResult }
 * forceNervousResult: true/false를 넘기면 긴장 판정을 굴리지 않고 GM/봇이 지정한 결과를 그대로 사용한다.
 */
const advanceTurn = (stateIn, options = {}) => {
  const state = normalizeState(clone(stateIn));
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
  const isNervous = typeof options.forceNervousResult === 'boolean'
    ? options.forceNervousResult
    : rollNervous(nervousChance);
  if (isNervous) {
    state.log.push({ type: 'nervous', participantId: actorId, chance: nervousChance, manual: typeof options.forceNervousResult === 'boolean' });
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
    targetId: options.targetId,
    targetIds: options.targetIds,
    participants: state.participants,
    rng: options.rng || randomPick,
    diceValue: Number.isInteger(options.diceValue) && options.diceValue >= 1 && options.diceValue <= 6
      ? options.diceValue
      : undefined,
  };
  const result = handler ? handler(ctx) : { appealGain: move.contestAppeals || 0 };
  const flags = result.flags || {};

  const multiplier = getPenaltyMultiplier(move.contestType, state.contestType);
  const isMatch = isMatchingMove(move.contestType, state.contestType);
  let finalAppeal = Math.round((result.appealGain || 0) * multiplier);

  // 지정한 포켓몬이 이번 턴에서 획득하는 어필을 절반으로 줄이는 효과가 먼저 걸려 있었던 경우
  if (actor.appealHalvedThisTurn) {
    finalAppeal = Math.floor(finalAppeal / 2);
    actor.appealHalvedThisTurn = false;
  }

  // ☆ 보유 보너스 (이번 기술 자체가 star 기반 공식일 땐 중복 방지)
  if (finalAppeal > 0 && actor.stars > 0 && !flags.suppressStarBonus) {
    finalAppeal += actor.stars;
  }

  // 콤보 - 커뮤니티 콤보표 기준 자동 판정, 성공 시 연계 기술별 추가 하트/방해 적용
  const comboBonus = actor.comboWaiting ? getComboBonus(actor.comboWaiting.moveId, move.id) : null;
  const comboSuccess = !!comboBonus;
  if (comboSuccess) {
    finalAppeal += comboBonus.bonusAppeal;
  }

  actor.totalAppeal += finalAppeal;

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

  // "앞차례를 방해/참조" 계열 기술인데 그 라운드에 아직 아무도 어필하지 않은 상태(=자신이 선공)라
  // 방해할 대상 자체가 없었던 경우를 실패로 기록한다 (조용히 무효과로 넘어가지 않도록).
  if (flags.jamFailedNoTarget) {
    state.log.push({ type: 'jamFail', participantId: actorId, moveId: move.id, moveName: move.name });
  }

  // 콤보 성공 시 추가 방해(bonusJam)는 GM/봇이 지정한 대상(targetId)에게 그대로 적용
  if (comboSuccess && comboBonus.bonusJam > 0 && options.targetId) {
    applyJam(state, options.targetId, comboBonus.bonusJam);
  }

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

  // 대상(targetId) 지정 효과의 타겟 전용 플래그 반영
  Object.entries(result.targetFlags || {}).forEach(([tid, tflags]) => {
    const target = state.participants.find((pp) => pp.id === tid);
    if (!target) return;
    if (tflags.cannotAppealNextRound) target.cannotAppealNextRound = true;
    if (tflags.clearStars) target.stars = 0;
    if (tflags.clearComboWaiting) target.comboWaiting = null;
    if (tflags.appealHalvedThisTurn) target.appealHalvedThisTurn = true;
  });

  if (comboSuccess) {
    state.log.push({ type: 'combo', participantId: actorId, bonus: comboBonus.bonusAppeal, bonusJam: comboBonus.bonusJam });
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
    p.appealHalvedThisTurn = false;
  });
  state.globalPreventNextJam = false;

  state.log.push({ type: 'roundEnd', round: state.round, standings: state.participants.map(p => ({ id: p.id, totalAppeal: p.totalAppeal })) });

  if (state.round >= (state.maxRounds || DEFAULT_MAX_ROUNDS)) {
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

// 응답 시간 초과 등으로 GM/봇이 강제로 이번 턴을 넘길 때 사용 (긴장 판정 없이 0 어필로 스킵)
const forceSkipTurn = (stateIn, reason = 'timeout') => {
  const state = normalizeState(clone(stateIn));
  if (state.phase !== 'secondJudging') return state;

  const actorId = state.order[state.turnPointer];
  state.log.push({ type: 'skip', participantId: actorId, reason });
  state.appealedThisTurn.push({ id: actorId, gainedAppeal: 0, moveContestType: null, comboStandby: false });

  state.turnPointer += 1;
  if (state.turnPointer >= state.order.length) {
    endRound(state);
  }
  return state;
};

const getStandings = (state) => {
  const sorted = [...state.participants].sort((a, b) => b.totalAppeal - a.totalAppeal);
  return sorted.map((p, index) => ({ rank: index + 1, ...p }));
};

const isContestDone = (state) => state.phase === 'done';

module.exports = {
  createContestState,
  runFirstJudging,
  getCurrentActor,
  canUseMove,
  advanceTurn,
  forceSkipTurn,
  getStandings,
  isContestDone,
};
