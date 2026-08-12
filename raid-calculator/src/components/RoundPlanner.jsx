import { useState } from 'react';
import { bannedMoveNameSet } from '../lib/optionLists.js';
import { CHEER_MAX_USES, getCheerSkillsForPosition } from '../engine/cheerSkills.js';
import { isSpreadMove } from '../engine/raidEngine.js';

const STATUS_LABELS = { brn: '화상', par: '마비', psn: '독', tox: '맹독', slp: '수면', frz: '냉동' };

function volatileTags(p) {
  const tags = [];
  if (p.confusionTurns > 0) tags.push('혼란');
  if (p.leechSeed) tags.push('씨뿌리기');
  if (p.bindTurns > 0) tags.push('조이기');
  if (p.tauntTurns > 0) tags.push('도발');
  if (p.encoreTurns > 0) tags.push('앵콜');
  if (p.tormentActive) tags.push('트집');
  if (p.healBlockTurns > 0) tags.push('회복봉인');
  if (p.attractActive) tags.push('헤롱헤롱');
  if (p.disableTurns > 0) tags.push('사슬묶임');
  return tags;
}

function groupByTeam(list) {
  const groups = new Map();
  list.forEach((p) => {
    const key = p.team && String(p.team).trim() ? `${p.team}조` : '조 미배정';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });
  return Array.from(groups.entries()).sort(([a], [b]) => {
    if (a === '조 미배정') return 1;
    if (b === '조 미배정') return -1;
    return Number(a) - Number(b);
  });
}

export default function RoundPlanner({ raid }) {
  const { battle } = raid;
  const [actionType, setActionType] = useState('fight');
  const [participantChoice, setParticipantChoice] = useState('');
  const [participantMove, setParticipantMove] = useState('');
  const [cheerChoice, setCheerChoice] = useState('');
  const [bossMove, setBossMove] = useState('');
  const [bossTarget, setBossTarget] = useState('');
  const [protectionChoices, setProtectionChoices] = useState({});

  if (!battle || battle.status !== 'ongoing') return null;

  const currentRound = battle.round + 1;
  const aliveParticipants = battle.participants.filter((p) => p && !p.fainted);
  const activeTeam = battle.activeTeam || '';
  // "이번 라운드에 행동할 조"가 지정되면 참가자 행동(싸운다/응원) 대상도 그 조로 제한된다
  const actionScopeParticipants = activeTeam
    ? aliveParticipants.filter((p) => (p.team || '') === activeTeam)
    : aliveParticipants;
  const availableParticipants = actionScopeParticipants.filter((p) => !battle.actedParticipantIds.includes(p.id));
  const selectedParticipant = availableParticipants.find((p) => String(p.id) === String(participantChoice));
  const cheerSkills = selectedParticipant ? getCheerSkillsForPosition(selectedParticipant.position) : [];
  const cheerUsed = selectedParticipant?.cheerUsed || 0;
  const cheerExhausted = cheerUsed >= CHEER_MAX_USES;
  const isLastRound = currentRound >= (battle.maxRounds || 6);
  const bossMoveIsSpread = bossMove.trim() ? isSpreadMove(bossMove.trim()) : false;
  // 전체공격은 "이번 라운드에 행동할 조"로 지정된 조에만 적용된다(미지정 시 전체 참가자)
  const spreadScopeParticipants = actionScopeParticipants;
  // "뒤는 맡기라고"는 여러 조가 동시에 활성화할 수 있으므로 전부 나열한다(전체공격 범위 안에서만 의미가 있다)
  const guardians = spreadScopeParticipants.filter((p) => p.redirectActive);

  const availableByTeam = groupByTeam(availableParticipants);
  const aliveByTeam = groupByTeam(aliveParticipants);
  const teamOptions = Array.from(
    new Set(aliveParticipants.map((p) => (p.team || '').trim()).filter(Boolean))
  ).sort((a, b) => Number(a) - Number(b));

  function handleParticipantChoiceChange(value) {
    setParticipantChoice(value);
    setCheerChoice('');
  }

  function handleRunParticipantAction() {
    if (!participantChoice || !participantMove.trim()) return;
    if (bannedMoveNameSet.has(participantMove.trim())) {
      window.alert(`"${participantMove.trim()}"은(는) 레이드 규칙상 참가자가 사용할 수 없는 기술입니다.`);
      return;
    }
    raid.runParticipantAction(Number(participantChoice), participantMove.trim());
    setParticipantMove('');
    setParticipantChoice('');
  }

  function handleRunCheer() {
    if (!participantChoice || !cheerChoice) return;
    raid.runParticipantCheer(Number(participantChoice), cheerChoice);
    setCheerChoice('');
    setParticipantChoice('');
  }

  function handleRunBossAction() {
    if (!bossMove.trim()) return;
    if (bossMoveIsSpread) {
      const choices = {};
      guardians.forEach((g) => {
        if (protectionChoices[g.id]) choices[g.id] = Number(protectionChoices[g.id]);
      });
      raid.runBossSpreadAction(bossMove.trim(), choices);
      setBossMove('');
      setProtectionChoices({});
      return;
    }
    if (!bossTarget) return;
    raid.runBossAction(bossMove.trim(), bossTarget === 'random' ? 'random' : Number(bossTarget));
    setBossMove('');
  }

  return (
    <section className="panel planner-panel">
      <h2>{currentRound}라운드 진행 중</h2>

      {teamOptions.length > 0 && (
        <div className="add-row">
          <label className="inline-field" style={{ flex: 1 }}>
            이번 라운드에 행동할 조 (참가자 행동 대상과 보스 전체공격 범위가 이 조로 한정됩니다)
            <select value={activeTeam} onChange={(e) => raid.runSetActiveTeam(e.target.value)} disabled={!!activeTeam}>
              <option value="">전체 참가자 (조 제한 없음)</option>
              {teamOptions.map((team) => (
                <option key={team} value={team}>
                  {team}조
                </option>
              ))}
            </select>
          </label>
          {activeTeam && (
            <p className="plan-hint" style={{ alignSelf: 'center' }}>
              {activeTeam}조로 고정됨 — 라운드를 종료해야 다시 고를 수 있습니다.
            </p>
          )}
        </div>
      )}

      <div className="planner-columns">
        <div className="planner-column">
          <h3>참가자 행동 ({availableParticipants.length}명 남음)</h3>
          <p className="plan-hint">
            {activeTeam
              ? `현재 ${activeTeam}조만 행동할 수 있습니다. 다른 조로 넘어가려면 라운드를 종료하세요.`
              : '위에서 이번 라운드에 행동할 조를 고르면 그 조원만 행동할 수 있습니다. 고르지 않으면 조 구분 없이 전체 참가자가 행동할 수 있습니다.'}
          </p>
          <div className="add-row">
            <select value={participantChoice} onChange={(e) => handleParticipantChoiceChange(e.target.value)}>
              <option value="">참가자 선택</option>
              {availableByTeam.map(([teamLabel, members]) => (
                <optgroup key={teamLabel} label={teamLabel}>
                  {members.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname}
                      {p.position ? ` (${p.position})` : ''}
                      {p.status ? ` [${STATUS_LABELS[p.status] || p.status}]` : ''}
                      {volatileTags(p).length > 0 ? ` [${volatileTags(p).join(',')}]` : ''}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="fight">싸운다</option>
              <option value="cheer">응원</option>
            </select>
          </div>

          {actionType === 'fight' ? (
            <div className="add-row">
              <input
                list="participant-move-options"
                value={participantMove}
                placeholder="기술"
                onChange={(e) => setParticipantMove(e.target.value)}
              />
              <button
                type="button"
                className="btn-primary"
                disabled={!participantChoice || !participantMove.trim()}
                onClick={handleRunParticipantAction}
              >
                실행
              </button>
            </div>
          ) : (
            <div className="add-row">
              <select value={cheerChoice} onChange={(e) => setCheerChoice(e.target.value)} disabled={!selectedParticipant}>
                <option value="">응원 스킬 선택</option>
                {cheerSkills.map((s) => (
                  <option key={s.id} value={s.id} disabled={s.id === 'finisher' && isLastRound}>
                    {s.name}
                    {s.id === 'finisher' && isLastRound ? ' (마지막 라운드 사용 불가)' : ''}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary"
                disabled={!participantChoice || !cheerChoice || cheerExhausted}
                onClick={handleRunCheer}
              >
                실행
              </button>
            </div>
          )}
          {selectedParticipant && selectedParticipant.status && (
            <p className="plan-hint">
              현재 상태이상: {STATUS_LABELS[selectedParticipant.status] || selectedParticipant.status} — 마비/수면/냉동은
              실행 시 행동이 막힐 수 있습니다.
            </p>
          )}
          {selectedParticipant && !selectedParticipant.position && actionType === 'cheer' && (
            <p className="plan-hint">이 참가자는 포지션이 지정되지 않아 응원을 사용할 수 없습니다.</p>
          )}
          {selectedParticipant && (
            <p className="plan-hint">
              응원 사용 횟수: {cheerUsed}/{CHEER_MAX_USES}
              {cheerExhausted ? ' (모두 사용함)' : ''}
            </p>
          )}
          {availableParticipants.length === 0 && actionScopeParticipants.length > 0 && (
            <p className="plan-hint">
              {activeTeam ? `${activeTeam}조원이` : '모든 참가자가'} 이번 라운드에 이미 행동했습니다.
            </p>
          )}
        </div>

        <div className="planner-column">
          <h3>보스 행동 (언제든, 원하는 만큼 자유롭게 실행 가능)</h3>
          <p className="plan-hint">
            조 단위로 진행할 경우 보통 각 조 턴 뒤 2회 정도 실행하지만, 진행 상황에 맞게 자유롭게 몇 번이든 실행하세요.
          </p>
          <div className="add-row">
            <input
              list="move-options"
              value={bossMove}
              placeholder="기술"
              onChange={(e) => setBossMove(e.target.value)}
            />
            <select value={bossTarget} onChange={(e) => setBossTarget(e.target.value)} disabled={bossMoveIsSpread}>
              <option value="">{bossMoveIsSpread ? '전체 공격' : '대상 선택'}</option>
              <option value="random">랜덤</option>
              {aliveByTeam.map(([teamLabel, members]) => (
                <optgroup key={teamLabel} label={teamLabel}>
                  {members.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nickname}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
            <button
              type="button"
              className="btn-primary"
              disabled={!bossMove.trim() || (!bossMoveIsSpread && !bossTarget)}
              onClick={handleRunBossAction}
            >
              실행
            </button>
          </div>
          {bossMoveIsSpread && (
            <p className="plan-hint">
              전체공격 기술로 인식되어 {activeTeam ? `${activeTeam}조 생존 참가자(${spreadScopeParticipants.length}명)에게만` : '생존한 참가자 전원에게'}{' '}
              적용됩니다.
            </p>
          )}
          {bossMoveIsSpread &&
            guardians.map((guardian) => {
              const protectableAllies = spreadScopeParticipants.filter(
                (p) => p.id !== guardian.id && !guardians.some((g) => g.id === p.id)
              );
              const protectableByTeam = groupByTeam(protectableAllies);
              return (
                <div className="add-row" key={guardian.id}>
                  <label className="inline-field" style={{ flex: 1 }}>
                    {guardian.nickname}이(가) 대신 지켜줄 아군 (미지정 시 같은 조 중 무작위)
                    <select
                      value={protectionChoices[guardian.id] || ''}
                      onChange={(e) => setProtectionChoices((prev) => ({ ...prev, [guardian.id]: e.target.value }))}
                    >
                      <option value="">무작위로 선택</option>
                      {protectableByTeam.map(([teamLabel, members]) => (
                        <optgroup key={teamLabel} label={teamLabel}>
                          {members.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.nickname}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </label>
                </div>
              );
            })}
        </div>
      </div>

      <div className="round-end-row">
        {availableParticipants.length > 0 && (
          <p className="plan-hint">아직 행동하지 않은 참가자가 {availableParticipants.length}명 있습니다. (종료해도 무방하면 그냥 진행하세요)</p>
        )}
        <button type="button" className="btn-primary" onClick={() => raid.runEndRound()}>
          {currentRound}라운드 종료하고 다음 라운드로
        </button>
      </div>
    </section>
  );
}
