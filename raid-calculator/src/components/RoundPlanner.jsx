import { useState } from 'react';
import { POSITION_CHEERS, MAX_CHEERS_PER_PARTICIPANT } from '../lib/cheers.js';

export default function RoundPlanner({ raid }) {
  const { battle } = raid;
  const [participantChoice, setParticipantChoice] = useState('');
  const [bossTarget, setBossTarget] = useState('');

  if (!battle || battle.status !== 'ongoing') return null;

  const aliveParticipants = battle.participants.filter((p) => p && !p.fainted);
  const availableParticipants = aliveParticipants.filter((p) => !battle.actedParticipantIds.includes(p.id));
  const selectedParticipant =
    participantChoice !== '' ? availableParticipants.find((p) => p.id === Number(participantChoice)) || null : null;

  const cheersForSelected = selectedParticipant ? POSITION_CHEERS[selectedParticipant.position] || [] : [];
  const cheersRemaining = selectedParticipant ? MAX_CHEERS_PER_PARTICIPANT - (selectedParticipant.cheersUsed || 0) : 0;
  const selectedMoves = selectedParticipant?.moves || [];

  const bossMoves = (battle.boss.moves || []).filter(Boolean);

  function handleParticipantMove(moveId) {
    if (!selectedParticipant) return;
    raid.runParticipantAction(selectedParticipant.id, moveId);
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
      <h2>{battle.round + 1}라운드 진행 중</h2>

      <div className="planner-columns">
        <div className="planner-column">
          <h3>참가자 행동 ({availableParticipants.length}명 남음)</h3>
          <select value={participantChoice} onChange={(e) => setParticipantChoice(e.target.value)}>
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
                  <button key={i} type="button" onClick={() => handleParticipantMove(move)}>
                    {move}
                  </button>
                ))}
              </div>

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
    </section>
  );
}
