// 콘테스트 기술 효과 판정기 - src/data/moves.json의 contestEffect(podic.kr 6세대 Contest Spectacular
// 원문 한국어 설명, 34종 고정)를 키로 사용.
// 각 handler(ctx) => { appealGain, jamTargets: [{targetId, amount}], flags: {...} }
// ctx = { actor, move, contestType, turnIndex, order, appealedThisTurn, applause, rng }
//
// 콤보 판정은 comboChart.js(Bulbapedia Contest combination 기준)로 자동 처리된다.

const lastAppealed = (appealedThisTurn) =>
  appealedThisTurn.length ? appealedThisTurn[appealedThisTurn.length - 1] : null;

const sumAppeal = (appealedThisTurn) =>
  appealedThisTurn.reduce((sum, e) => sum + e.gainedAppeal, 0);

const jamAllAppealed = (appealedThisTurn, amountFn) =>
  appealedThisTurn.map((e) => ({ targetId: e.id, amount: amountFn(e) }));

const CONTEST_EFFECT_HANDLERS = {
  '☆이 붙어 있으면  추가되는 하트가 3배가 됨': (ctx) => ({
    appealGain: (ctx.move.contestAppeals || 0) * (ctx.actor.stars > 0 ? 3 : 1),
    flags: { suppressStarBonus: true },
  }),

  '관중들의 흥분도가 1 상승': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { forceApplauseRise: true },
  }),

  '관중들의 흥분도에 따라 하트가 추가': (ctx) => {
    const value = ctx.applause.value;
    return { appealGain: value <= 1 ? 1 : value === 2 ? 3 : value === 3 ? 4 : 6 };
  },

  '그 턴 중 1회 방해받지 않음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { noJamRestOfTurn: true },
  }),

  '다른 포켓몬들의 콤보 대기 중 상태를 해제': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { cancelComboStandbyForAppealed: true },
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

  '더 이상 어필에 참가불가': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { cannotAppealRestOfContest: true },
  }),

  '뒷차례 모든 포켓몬들을 어필 못 하게 함': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { makeFollowingNervous: true },
  }),

  '무작위로 하트가 추가': (ctx) => ({
    appealGain: ctx.rng([1, 2, 4, 8]),
  }),

  '바로 앞에서 어필한 포켓몬이 받은 하트 수에 영향받음': (ctx) => {
    const prev = lastAppealed(ctx.appealedThisTurn);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: prev && prev.moveContestType === ctx.move.contestType ? base * 2 : base };
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
    };
  },

  '방해받을 경우, 2배로 방해받음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { doubleJamIfHitThisTurn: true },
  }),

  '부문과 맞는 타입으로 턴의 끝에서 어필하면 흥분도가 2 상승': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { applauseBonusIfLast: 2 },
  }),

  '부문과 맞는 타입으로 턴의 처음에 어필하면 흥분도가 2 상승': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { applauseBonusIfFirst: 2 },
  }),

  '부문과 상반되는 타입으로 어필하면 흥분도가 2 하락': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
  }),

  '앞에서 어필한 기술과 같은 타입을 썼다면 받는 하트가 3배': (ctx) => {
    const prev = lastAppealed(ctx.appealedThisTurn);
    const base = ctx.move.contestAppeals || 0;
    return { appealGain: prev && prev.moveContestType === ctx.move.contestType ? base * 3 : base };
  },

  '앞에서 어필한 기술과 같은 타입을 썼다면 하트 4개 방해': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, (e) => (e.moveContestType === ctx.move.contestType ? 4 : (ctx.move.contestJam || 1))),
  }),

  '앞차례 어필한 포켓몬들을 방해': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, () => ctx.move.contestJam || 1),
  }),

  '앞차례 어필한 포켓몬들을 방해하고 다음 턴은 행동불가': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, () => ctx.move.contestJam || 1),
    flags: { cannotAppealNextRound: true },
  }),

  '앞차례 어필한 포켓몬의 ☆을 지움': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { removeStarsFromAppealed: true },
  }),

  '앞차례 포켓몬들의 하트를 절반으로 줄임': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, (e) => Math.max(1, Math.floor(e.gainedAppeal / 2))),
  }),

  '앞차례 포켓몬들이 받았던 하트 총합의 절반만큼 하트가 추가': (ctx) => (
    { appealGain: Math.floor(sumAppeal(ctx.appealedThisTurn) / 2) }
  ),

  '어필한 순서가 느릴수록 하트가 많이 추가': (ctx) => {
    const pos = ctx.turnIndex;
    const isLast = pos === ctx.order.length - 1;
    return { appealGain: isLast ? 6 : pos === 0 ? 1 : pos === 1 ? 2 : 4 };
  },

  '연속으로 써도 패널티 없음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { exemptFromRepeatRule: true },
  }),

  '이번 턴 동안 관중들의 흥분도가 변하지 않게 됨': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { freezeApplauseRestOfTurn: true },
  }),

  '이번 턴에는 방해를 받지 않음': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    flags: { noJamRestOfTurn: true },
  }),

  '콤보 대기 중인 포켓몬을 방해할 때는 하트를 5개 줄임': (ctx) => ({
    appealGain: ctx.move.contestAppeals || 0,
    jamTargets: jamAllAppealed(ctx.appealedThisTurn, (e) => (e.comboStandby ? 5 : (ctx.move.contestJam || 1))),
  }),

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

const getContestEffectHandler = (contestEffect) => CONTEST_EFFECT_HANDLERS[contestEffect] || null;

// 재사용 페널티 면제 기술(연속 사용 가능) id 목록을 데이터에서 도출
const getRepeatExemptMoveIds = (allMoves = []) =>
  new Set(
    allMoves
      .filter((m) => m.contestEffect === '연속으로 써도 패널티 없음')
      .map((m) => m.id)
  );

module.exports = { CONTEST_EFFECT_HANDLERS, getContestEffectHandler, getRepeatExemptMoveIds };
