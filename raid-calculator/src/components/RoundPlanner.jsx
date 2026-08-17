import { useEffect, useState } from 'react';
import { POSITION_CHEERS, CHEER_MAX_USES } from '../lib/cheers.js';
import { buildTurnOrder } from '../lib/turnOrder.js';
import { groupByTeam, UNASSIGNED_KEY } from '../lib/teams.js';
import showdownIntegration from '../lib/showdownIntegration.js';

// 아군(자기 자신 포함 가능)을 직접 지정해야 하는 기술의 타깃 타입 — 나머지는 지금까지처럼 보스를 자동으로 대상으로 삼는다
const ALLY_TARGET_TYPES = ['adjacentAlly', 'adjacentAllyOrSelf'];

export default function RoundPlanner({ raid }) {
  const { battle } = raid;
  const [activeTeamKey, setActiveTeamKey] = useState(null);
  const [participantChoice, setParticipantChoice] = useState('');
  const [bossTarget, setBossTarget] = useState('');
  const [pendingAllyMove, setPendingAllyMove] = useState(null);

  // 라운드가 바뀌면 이번 라운드에 진행할 조를 다시 고르게 한다
  useEffect(() => {
    setActiveTeamKey(null);
    setParticipantChoice('');
    setBossTarget('');
    setPendingAllyMove(null);
  }, [battle?.round]);

  if (!battle || battle.status !== 'ongoing') return null;

  const currentRound = battle.round + 1;
  const teamGroups = groupByTeam(battle.participants.filter(Boolean));
  const activeTeamMembers = teamGroups.find((g) => g.key === activeTeamKey)?.members ?? [];

  const aliveParticipants = activeTeamMembers.filter((p) => !p.fainted);
  const availableParticipants = aliveParticipants.filter((p) => !battle.actedParticipantIds.includes(p.id));
  const selectedParticipant =
    participantChoice !== '' ? availableParticipants.find((p) => p.id === Number(participantChoice)) || null : null;

  const cheersForSelected = selectedParticipant ? POSITION_CHEERS[selectedParticipant.position] || [] : [];
  const cheersRemaining = selectedParticipant ? CHEER_MAX_USES - (selectedParticipant.cheerUsed || 0) : 0;
  const selectedMoves = selectedParticipant?.moves || [];

  const bossMoves = (battle.boss.moves || []).filter(Boolean);
  const turnOrder = activeTeamKey ? buildTurnOrder({ ...battle, participants: activeTeamMembers }) : [];

  const pendingAllyMoveInfo = pendingAllyMove ? showdownIntegration.getMove(pendingAllyMove) : null;
  const allowSelfTarget = pendingAllyMoveInfo?.target === 'adjacentAllyOrSelf';
  const allyTargetOptions =
    selectedParticipant && pendingAllyMove
      ? aliveParticipants.filter((p) => allowSelfTarget || p.id !== selectedParticipant.id)
      : [];

  function selectParticipant(value) {
    setParticipantChoice(value);
    setPendingAllyMove(null);
  }

  function handleParticipantMove(moveId) {
    if (!selectedParticipant) return;
    const moveInfo = showdownIntegration.getMove(moveId);
    if (moveInfo && ALLY_TARGET_TYPES.includes(moveInfo.target)) {
      setPendingAllyMove(moveId);
      return;
    }
    raid.runParticipantAction(selectedParticipant.id, moveId);
    setParticipantChoice('');
  }

  function handleAllyTargetSelect(targetId) {
    if (!selectedParticipant || !pendingAllyMove) return;
    raid.runParticipantAction(selectedParticipant.id, pendingAllyMove, targetId);
    setPendingAllyMove(null);
    setParticipantChoice('');
  }

  function handleCheer(cheerId) {
    if (!selectedParticipant) return;
    raid.runCheer(selectedParticipant.id, cheerId);
    setParticipantChoice('');
  }

  function handleBossMove(moveId) {
    if (!bossTarget) return;
    raid.runBossAction(moveId, bossTarget === 'random' ? 'random' : Number(bossTarget));
  }

  return (
    <section className="panel planner-panel">
      <h2>{currentRound}라운드 진행 중</h2>

      <div className="round-team-select">
        <label>
          이번 라운드 진행할 조
          <select value={activeTeamKey ?? ''} onChange={(e) => setActiveTeamKey(e.target.value || null)}>
            <option value="">조 선택</option>
            {teamGroups.map((g) => (
              <option key={g.key} value={g.key}>
                {g.key === UNASSIGNED_KEY ? '조 미배정' : `${g.key}조`} ({g.members.length}명)
              </option>
            ))}
          </select>
        </label>
      </div>

      {!activeTeamKey && <p className="plan-hint">이번 라운드에 진행할 조를 먼저 선택하세요.</p>}

      {activeTeamKey && (
        <>
          <div className="turn-order-line" title="행동 순서 (노력치·종족값 기준 스피드)">
            {turnOrder.map((entry, i) => (
              <span key={entry.key}>
                {i > 0 && <span className="turn-order-sep">-</span>}
                <span
                  className={`turn-order-entry ${entry.isBoss ? 'turn-order-boss' : ''} ${
                    entry.fainted ? 'turn-order-fainted' : ''
                  } ${selectedParticipant && entry.key === `p-${selectedParticipant.id}` ? 'turn-order-current' : ''}`}
                >
                  {entry.label}
                </span>
              </span>
            ))}
          </div>

          <div className="planner-columns">
            <div className="planner-column">
              <h3>참가자 행동 ({availableParticipants.length}명 남음)</h3>
              <select value={participantChoice} onChange={(e) => selectParticipant(e.target.value)}>
                <option value="">참가자 선택</option>
                {availableParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                    {p.position ? ` (${p.position})` : ''}
                  </option>
                ))}
              </select>

              {selectedParticipant && (
                <div className="action-picker">
                  <p className="plan-hint">기술</p>
                  <div className="button-grid">
                    {selectedMoves.length === 0 && <span className="plan-hint">등록된 기술이 없습니다.</span>}
                    {selectedMoves.map((move, i) => (
                      <button
                        key={i}
                        type="button"
                        className={pendingAllyMove === move ? 'btn-primary' : undefined}
                        onClick={() => handleParticipantMove(move)}
                      >
                        {move}
                      </button>
                    ))}
                  </div>

                  {pendingAllyMove && (
                    <>
                      <p className="plan-hint">
                        {pendingAllyMoveInfo?.name || pendingAllyMove}의 대상 선택
                        {allowSelfTarget ? ' (자신 포함)' : ''}
                      </p>
                      <div className="button-grid">
                        {allyTargetOptions.length === 0 && (
                          <span className="plan-hint">지정할 수 있는 아군이 없습니다.</span>
                        )}
                        {allyTargetOptions.map((p) => (
                          <button key={p.id} type="button" onClick={() => handleAllyTargetSelect(p.id)}>
                            {p.nickname}
                            {p.id === selectedParticipant.id ? ' (자신)' : ''}
                          </button>
                        ))}
                        <button type="button" onClick={() => setPendingAllyMove(null)}>
                          취소
                        </button>
                      </div>
                    </>
                  )}

                  {selectedParticipant.position && (
                    <>
                      <p className="plan-hint">
                        응원 ({selectedParticipant.position} · 남은 횟수 {cheersRemaining}회)
                      </p>
                      <div className="button-grid">
                        {cheersForSelected.map((cheer) => (
                          <button
                            key={cheer.id}
                            type="button"
                            className="btn-cheer"
                            title={cheer.desc}
                            disabled={cheersRemaining <= 0}
                            onClick={() => handleCheer(cheer.id)}
                          >
                            {cheer.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {availableParticipants.length === 0 && aliveParticipants.length > 0 && (
                <p className="plan-hint">모든 참가자가 이번 라운드에 이미 행동했습니다.</p>
              )}
            </div>

            <div className="planner-column">
              <h3>보스 행동 (원하는 만큼 반복 가능)</h3>
              <select value={bossTarget} onChange={(e) => setBossTarget(e.target.value)}>
                <option value="">대상 선택</option>
                <option value="random">랜덤</option>
                {aliveParticipants.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
              <div className="button-grid">
                {bossMoves.length === 0 && <span className="plan-hint">보스 기술이 등록되지 않았습니다.</span>}
                {bossMoves.map((move, i) => (
                  <button key={i} type="button" disabled={!bossTarget} onClick={() => handleBossMove(move)}>
                    {move}
                  </button>
                ))}
              </div>

              <p className="plan-hint">무료 행동 (턴 소모 없음, 테라레이드형)</p>
              <div className="button-grid">
                <button type="button" className="btn-free-action" onClick={raid.runResetFieldBoosts}>
                  필드 랭크 초기화
                </button>
                <button type="button" className="btn-free-action" onClick={raid.runCureBossStatus}>
                  자신 상태이상 회복
                </button>
              </div>
            </div>
          </div>

          <div className="round-end-row">
            {availableParticipants.length > 0 && (
              <p className="plan-hint">
                아직 행동하지 않은 참가자가 {availableParticipants.length}명 있습니다. (종료해도 무방하면 그냥 진행하세요)
              </p>
            )}
            <button type="button" className="btn-primary" onClick={raid.runEndRound}>
              {currentRound}라운드 종료하고 다음 라운드로
            </button>
          </div>
        </>
      )}
    </section>
  );
}
