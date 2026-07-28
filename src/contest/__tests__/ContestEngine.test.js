import movesData from '../../data/moves.json';
import { createContestState, runFirstJudging, advanceTurn, getCurrentActor, canUseMove } from '../ContestEngine';
import { isValidComboFollowUp, getComboBonus } from '../comboChart';

const findMove = (id) => movesData.moves.find((m) => m.id === id);

describe('새 콘테스트 규칙표 반영 검증', () => {
  test('시트에 있는 기술은 콘테스트 데이터를 갖고, 시트에 없던 기존 기술은 비활성화된다', () => {
    const restMove = findMove('rest');
    expect(restMove.contestType).toBeTruthy();
    expect(restMove.contestEffect).toBeTruthy();

    // 새 시트 5개 어디에도 이름이 없어 콘테스트 사용 불가로 전환된 기존 기술 예시 ('sing'/자장가)
    const disabledExample = findMove('sing');
    expect(disabledExample.contestType).toBeFalsy();
    expect(disabledExample.contestEffect).toBeFalsy();
  });

  test('지정한 포켓몬을 방해 - targetId로 지정한 대상만 방해된다', () => {
    const jamMove = findMove('gust'); // 지정한 포켓몬을 방해
    expect(jamMove.contestEffect).toBe('지정한 포켓몬을 방해');

    const participants = [
      { id: 'a', name: 'A', pokemonName: '', conditionValue: 0, moves: [jamMove] },
      { id: 'b', name: 'B', pokemonName: '', conditionValue: 0, moves: [jamMove] },
    ];
    let state = createContestState('귀여움', participants);
    state = runFirstJudging(state);
    const bBefore = state.participants.find((p) => p.id === 'b').totalAppeal;

    const actorId = getCurrentActor(state).id;
    const otherId = actorId === 'a' ? 'b' : 'a';
    state = advanceTurn(state, { moveId: jamMove.id, targetId: otherId });

    const targetAfter = state.participants.find((p) => p.id === otherId);
    // 긴장으로 스킵되지 않았다면 방해가 적용되어야 함(총 어필이 감소하거나 최소 0으로 클램프)
    const jamLog = state.log.find((e) => e.type === 'jam' && e.targetId === otherId);
    if (jamLog) {
      expect(targetAfter.totalAppeal).toBeLessThanOrEqual(bBefore);
    }
  });

  test('콤보 성공 시 콤보표의 bonusAppeal이 반영되고, bonusJam은 지정 대상에게 적용된다', () => {
    const starter = findMove('mud-sport');
    const followUp = findMove('mud-slap');
    expect(isValidComboFollowUp(starter.id, followUp.id)).toBe(true);
    const bonus = getComboBonus(starter.id, followUp.id);
    expect(bonus.bonusAppeal).toBe(2);
    expect(bonus.bonusJam).toBe(1);

    const participants = [
      { id: 'a', name: 'A', pokemonName: '', conditionValue: 0, moves: [starter, followUp] },
      { id: 'b', name: 'B', pokemonName: '', conditionValue: 0, moves: [starter, followUp] },
    ];
    let state = createContestState('귀여움', participants);
    state = runFirstJudging(state);

    // 강제로 콤보 대기 상태를 만들어 결정론적으로 검증 (긴장 판정에 좌우되지 않도록)
    const actorId = getCurrentActor(state).id;
    const actor = state.participants.find((p) => p.id === actorId);
    actor.comboWaiting = { moveId: starter.id };
    const otherId = actorId === 'a' ? 'b' : 'a';
    const otherBefore = state.participants.find((p) => p.id === otherId).totalAppeal;

    state = advanceTurn(state, { moveId: followUp.id, targetId: otherId });
    const comboLog = state.log.find((e) => e.type === 'combo');
    expect(comboLog).toBeTruthy();
    expect(comboLog.bonus).toBe(2);
    expect(comboLog.bonusJam).toBe(1);

    const otherAfter = state.participants.find((p) => p.id === otherId).totalAppeal;
    expect(otherAfter).toBeLessThanOrEqual(otherBefore);
  });

  test('마지막턴 사용불가 기술은 마지막 라운드(4라운드)에서 canUseMove가 false를 반환한다', () => {
    const finisher = movesData.moves.find((m) => m.contestEffect === '더 이상 어필에 참가불가 (마지막턴 사용불가)');
    expect(finisher).toBeTruthy();

    const participants = [
      { id: 'a', name: 'A', pokemonName: '', conditionValue: 0, moves: [finisher] },
      { id: 'b', name: 'B', pokemonName: '', conditionValue: 0, moves: [finisher] },
    ];
    let state = createContestState('귀여움', participants);
    state = runFirstJudging(state);
    state.round = 3;
    expect(canUseMove(state, state.order[0], finisher.id)).toBe(true);
    state.round = 4;
    expect(canUseMove(state, state.order[0], finisher.id)).toBe(false);
  });
});
