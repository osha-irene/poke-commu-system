// 콘테스트 기술 효과 판정기 - src/contest/contestEffects.js(웹 관리자 시뮬레이터, ES module)를
// 기준으로 그대로 포팅한 CommonJS 버전. src/data/moves.json의 contestEffect(커뮤니티 자체
// 콘테스트 규칙표 "포켓몬 콘테스트 기술 및 콤보" 시트 원문 한국어 설명, 38종 고정)를 키로 사용.
// 각 handler(ctx) => { appealGain, jamTargets: [{targetId, amount}], flags: {...}, targetFlags: { [participantId]: {...} } }
// ctx = { actor, move, contestType, turnIndex, order, appealedThisTurn, targetId, targetIds, participants, rng, diceValue }
//
// targetId/targetIds는 GM(진행자)/봇이 advanceTurn 호출 시 넘겨주는 "지정한 포켓몬" 대상이다.
// (ContestAdminPanel.jsx의 대상 선택 UI 참고, 콘테스트봇에서는 1:1이므로 상대를 자동으로 지정한다)
const { isPenaltyMove, isMatchingMove } = require('./contestRules');

const lastAppealed = (appealedThisTurn) =>
  appealedThisTurn.length ? appealedThisTurn[appealedThisTurn.length - 1] : null;

const jamAllAppealed = (appealedThisTurn, amountFn) =>
  appealedThisTurn.map((e) => ({ targetId: e.id, amount: amountFn(e) }));

const findParticipant = (ctx, id) => (ctx.participants || []).find((p) => p.id === id) || null;

const findAppealedEntry = (ctx, id) => (ctx.appealedThisTurn || []).find((e) => e.id === id) || null;

const CONTEST_EFFECT_HANDLERS = {
  '☆이 붙어 있으면 추가되는 하트가 3배가 됨': (ctx) => ({
    appealGain: (ctx.move.contestAppeals || 0) * (ctx.actor.stars > 0 ? 3 : 1),
    flags: { suppressStarBonus: true },
  }),

  '그 턴 중 1회 방해받지 않음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { noJamRestOfTurn: true },
  }),

  '다음 턴 순서가 마지막 차례가 됨': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { goLastNextRound: true },
  }),

  '다음 턴 어필 순서가 뒤바뀜': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { reverseNextRound: true },
  }),

  '다음 턴 연기 순서가 첫 번째가 됨': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { goFirstNextRound: true },
  }),

  '더 이상 어필에 참가불가 (마지막턴 사용불가)': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { cannotAppealRestOfContest: true },
  }),

  '뒷차례 모든 포켓몬들을 어필 못 하게 함': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { makeFollowingNervous: true },
  }),

  '무작위로 [1D6]하트가 추가': (ctx) => ({
    appealGain: ctx.diceValue || ctx.rng([1, 2, 3, 4, 5, 6]),
  }),

  '바로 앞에서 어필한 포켓몬이 받은 하트 수에 1/2 추가 획득': (ctx) => {
    const prev = lastAppealed(ctx.appealedThisTurn);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: base + (prev ? Math.floor(prev.gainedAppeal / 2) : 0) };
  },

  '바로 앞에서 어필한 포켓몬이 받은 하트만큼 하트가 추가': (ctx) => {
    const prev = lastAppealed(ctx.appealedThisTurn);
    return { appealGain: (ctx.move.contestAppeals || 0) + (prev ? prev.gainedAppeal : 0) };
  },

  '바로 앞차례 포켓몬을 방해': (ctx) => {
    const prev = lastAppealed(ctx.appealedThisTurn);
    return {
      appealGain: ctx.move.contestAppeals || 0,
      jamTargets: prev ? [{ targetId: prev.id, amount: ctx.move.contestJam || 1 }] : [],
      flags: prev ? {} : { jamFailedNoTarget: true },
    };
  },

  '이번 턴에서 방해받을 경우, 2배로 방해받음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { doubleJamIfHitThisTurn: true },
  }),

  '부문과 맞는 타입으로 턴의 끝에서 어필하면 하트(♥)2 상승': (ctx) => {
    const isLast = ctx.turnIndex === ctx.order.length - 1;
    const isMatch = isMatchingMove(ctx.move.contestType, ctx.contestType);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: isMatch && isLast ? base + 2 : base };
  },

  '부문과 맞는 타입으로 턴의 끝에서 어필하면 어필(♥)2 상승': (ctx) => {
    const isLast = ctx.turnIndex === ctx.order.length - 1;
    const isMatch = isMatchingMove(ctx.move.contestType, ctx.contestType);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: isMatch && isLast ? base + 2 : base };
  },

  '부문과 맞는 타입으로 턴의 처음에 어필하면 하트(♥)2 상승': (ctx) => {
    const isMatch = isMatchingMove(ctx.move.contestType, ctx.contestType);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: isMatch && ctx.turnIndex === 0 ? base + 2 : base };
  },

  '부문과 상반되는 타입으로 어필하면 하트(♥)2 하락': (ctx) => {
    const base = ctx.move.contestAppeals || 0;
    const penalty = isPenaltyMove(ctx.move.contestType, ctx.contestType);
    return { appealGain: Math.max(0, base - (penalty ? 2 : 0)) };
  },

  '앞차례 어필한 포켓몬들을 방해': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, () => ctx.move.contestJam || 1),
    flags: ctx.appealedThisTurn.length ? {} : { jamFailedNoTarget: true },
  }),

  '앞차례 어필한 포켓몬들을 방해하고 다음 턴은 행동불가': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, () => ctx.move.contestJam || 1),
    flags: { cannotAppealNextRound: true, ...(ctx.appealedThisTurn.length ? {} : { jamFailedNoTarget: true }) },
  }),

  '앞차례 어필한 포켓몬의 ☆을 지움': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { removeStarsFromAppealed: true },
  }),

  '어필한 순서가 느릴수록 하트가 많이 추가': (ctx) => {
    const pos = ctx.turnIndex;
    const isLast = pos === ctx.order.length - 1;
    return { appealGain: isLast ? 6 : pos === 0 ? 1 : pos === 1 ? 2 : 4 };
  },

  '연속으로 써도 패널티 없음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { exemptFromRepeatRule: true },
  }),

  '이번 턴에는 방해를 받지 않음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { noJamRestOfTurn: true },
  }),

  '전 턴에서 어필한 기술과 같은 타입을 썼다면 받는 하트가 3배': (ctx) => {
    const base = ctx.move.contestAppeals || 0;
    const lastMove = ctx.actor.lastMoveId
      ? (ctx.actor.moves || []).find((m) => m.id === ctx.actor.lastMoveId)
      : null;
    const sameType = lastMove && lastMove.contestType === ctx.move.contestType;
    return { appealGain: sameType ? base * 3 : base };
  },

  '지정한 포켓몬 하트를 절반으로 줄임': (ctx) => {
    if (!ctx.targetId) return { appealGain: ctx.move.contestAppeals || 0 };
    const target = findParticipant(ctx, ctx.targetId);
    const amount = target ? Math.ceil(target.totalAppeal / 2) : 0;
    return {
      appealGain: ctx.move.contestAppeals || 0,
      jamTargets: amount > 0 ? [{ targetId: ctx.targetId, amount }] : [],
    };
  },

  '지정한 포켓몬들 방해': (ctx) => {
    const ids = ctx.targetIds && ctx.targetIds.length ? ctx.targetIds : (ctx.targetId ? [ctx.targetId] : []);
    return {
      appealGain: ctx.move.contestAppeals || 0,
      jamTargets: ids.map((id) => ({ targetId: id, amount: ctx.move.contestJam || 1 })),
    };
  },

  '지정한 포켓몬을 방해': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: ctx.targetId ? [{ targetId: ctx.targetId, amount: ctx.move.contestJam || 1 }] : [],
  }),

  '지정한 포켓몬을 방해하고 다음 턴은 행동불가': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: ctx.targetId ? [{ targetId: ctx.targetId, amount: ctx.move.contestJam || 1 }] : [],
    targetFlags: ctx.targetId ? { [ctx.targetId]: { cannotAppealNextRound: true } } : {},
  }),

  '지정한 포켓몬의 ☆을 지움': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    targetFlags: ctx.targetId ? { [ctx.targetId]: { clearStars: true } } : {},
  }),

  '지정한 포켓몬의 콤보 대기 중 상태를 해제': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    targetFlags: ctx.targetId ? { [ctx.targetId]: { clearComboWaiting: true } } : {},
  }),

  '지정한 포켓몬이 앞 차례일 경우. 어필한 기술과 같은 타입을 썼다면 하트를 4개 방해': (ctx) => {
    const base = ctx.move.contestAppeals || 0;
    if (!ctx.targetId) return { appealGain: base };
    const targetEntry = findAppealedEntry(ctx, ctx.targetId);
    if (!targetEntry) return { appealGain: base, flags: { jamFailedNoTarget: true } };
    const amount = targetEntry.moveContestType === ctx.move.contestType ? 4 : (ctx.move.contestJam || 1);
    return { appealGain: base, jamTargets: [{ targetId: ctx.targetId, amount }] };
  },

  '지정한 포켓몬이 이번 턴에서 획득하는 어필(♥)를 절반으로 줄임': (ctx) => {
    const base = ctx.move.contestAppeals || 0;
    if (!ctx.targetId) return { appealGain: base };
    const targetEntry = findAppealedEntry(ctx, ctx.targetId);
    if (targetEntry) {
      const amount = Math.floor(targetEntry.gainedAppeal / 2);
      return { appealGain: base, jamTargets: amount > 0 ? [{ targetId: ctx.targetId, amount }] : [] };
    }
    return { appealGain: base, targetFlags: { [ctx.targetId]: { appealHalvedThisTurn: true } } };
  },

  '콤보 대기 중인 지정한 포켓몬을 방해할 때는 하트를 5개 줄임': (ctx) => {
    if (!ctx.targetId) return { appealGain: ctx.move.contestAppeals || 0 };
    const target = findParticipant(ctx, ctx.targetId);
    const amount = target && target.comboWaiting ? 5 : (ctx.move.contestJam || 1);
    return { appealGain: ctx.move.contestAppeals || 0, jamTargets: [{ targetId: ctx.targetId, amount }] };
  },

  '콤보 대기 중인 포켓몬을 방해할 때는 하트를 5개 줄임': (ctx) => {
    if (!ctx.targetId) return { appealGain: ctx.move.contestAppeals || 0 };
    const target = findParticipant(ctx, ctx.targetId);
    const amount = target && target.comboWaiting ? 5 : (ctx.move.contestJam || 1);
    return { appealGain: ctx.move.contestAppeals || 0, jamTargets: [{ targetId: ctx.targetId, amount }] };
  },

  '턴의 마지막에 어필하면 추가되는 하트가 3배': (ctx) => {
    const isLast = ctx.turnIndex === ctx.order.length - 1;
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: isLast ? base * 3 : base };
  },

  '턴의 처음에 어필하면 추가되는 하트가 3배': (ctx) => {
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: ctx.turnIndex === 0 ? base * 3 : base };
  },

  '특수 효과 없음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
  }),

  '포켓몬에게 ☆이 1개 추가됨': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { gainStar: true },
  }),
};

// 대상(targetId) 지정이 필요한 효과 문구 집합 - ContestAdminPanel.jsx가 대상 선택 UI를 띄울지 판단할 때 사용.
const TARGETED_EFFECTS = new Set([
  '지정한 포켓몬 하트를 절반으로 줄임',
  '지정한 포켓몬들 방해',
  '지정한 포켓몬을 방해',
  '지정한 포켓몬을 방해하고 다음 턴은 행동불가',
  '지정한 포켓몬의 ☆을 지움',
  '지정한 포켓몬의 콤보 대기 중 상태를 해제',
  '지정한 포켓몬이 앞 차례일 경우. 어필한 기술과 같은 타입을 썼다면 하트를 4개 방해',
  '지정한 포켓몬이 이번 턴에서 획득하는 어필(♥)를 절반으로 줄임',
  '콤보 대기 중인 지정한 포켓몬을 방해할 때는 하트를 5개 줄임',
  '콤보 대기 중인 포켓몬을 방해할 때는 하트를 5개 줄임',
]);

const MULTI_TARGET_EFFECTS = new Set(['지정한 포켓몬들 방해']);

// 다이스 값(1~6) 직접 입력이 가능한 효과 문구 집합 - ContestAdminPanel.jsx가 다이스 입력 UI를 띄울지 판단할 때 사용.
// 값을 입력하지 않으면 무작위로 굴림(ctx.rng).
const DICE_EFFECTS = new Set(['무작위로 [1D6]하트가 추가']);

// 마지막 라운드에는 사용할 수 없는 효과 문구 집합 (ContestEngine.js의 canUseMove가
// state.maxRounds 기준으로 "마지막 라운드"를 판단한다 - 기본값은 4라운드로 웹 시뮬레이터와 동일)
const FINAL_ROUND_RESTRICTED_EFFECTS = new Set([
  '더 이상 어필에 참가불가 (마지막턴 사용불가)',
]);

const getContestEffectHandler = (contestEffect) => CONTEST_EFFECT_HANDLERS[contestEffect] || null;

// 재사용 페널티 면제 기술(연속 사용 가능) id 목록을 데이터에서 도출
const getRepeatExemptMoveIds = (allMoves = []) =>
  new Set(
    allMoves
      .filter((m) => m.contestEffect === '연속으로 써도 패널티 없음')
      .map((m) => m.id)
  );

module.exports = {
  CONTEST_EFFECT_HANDLERS,
  TARGETED_EFFECTS,
  MULTI_TARGET_EFFECTS,
  DICE_EFFECTS,
  FINAL_ROUND_RESTRICTED_EFFECTS,
  getContestEffectHandler,
  getRepeatExemptMoveIds,
};
