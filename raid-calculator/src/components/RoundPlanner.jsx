import { useState } from 'react';

export default function RoundPlanner({ raid }) {
  const { battle } = raid;
  const [participantChoice, setParticipantChoice] = useState('');
  const [participantMove, setParticipantMove] = useState('');
  const [bossMove, setBossMove] = useState('');
  const [bossTarget, setBossTarget] = useState('');

  if (!battle || battle.status !== 'ongoing') return null;

  const aliveParticipants = battle.participants.filter((p) => p && !p.fainted);
  const availableParticipants = aliveParticipants.filter((p) => !battle.actedParticipantIds.includes(p.id));

  function handleRunParticipantAction() {
    if (!participantChoice || !participantMove.trim()) return;
    raid.runParticipantAction(Number(participantChoice), participantMove.trim());
    setParticipantMove('');
    setParticipantChoice('');
  }

  function handleRunBossAction() {
    if (!bossMove.trim() || !bossTarget) return;
    raid.runBossAction(bossMove.trim(), bossTarget === 'random' ? 'random' : Number(bossTarget));
    setBossMove('');
  }

  return (
    <section className="panel planner-panel">
      <h2>{battle.round + 1}라운드 진행 중</h2>

      <div className="planner-columns">
        <div className="planner-column">
          <h3>참가자 행동 ({availableParticipants.length}명 남음)</h3>
          <div className="add-row">
            <select value={participantChoice} onChange={(e) => setParticipantChoice(e.target.value)}>
              <option value="">참가자 선택</option>
              {availableParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <input
              list="move-options"
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
          {availableParticipants.length === 0 && aliveParticipants.length > 0 && (
            <p className="plan-hint">모든 참가자가 이번 라운드에 이미 행동했습니다.</p>
          )}
        </div>

        <div className="planner-column">
          <h3>보스 행동 (원하는 만큼 반복 가능)</h3>
          <div className="add-row">
            <input
              list="move-options"
              value={bossMove}
              placeholder="기술"
              onChange={(e) => setBossMove(e.target.value)}
            />
            <select value={bossTarget} onChange={(e) => setBossTarget(e.target.value)}>
              <option value="">대상 선택</option>
              <option value="random">랜덤</option>
              {aliveParticipants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <button type="button" className="btn-primary" disabled={!bossMove.trim() || !bossTarget} onClick={handleRunBossAction}>
              실행
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
