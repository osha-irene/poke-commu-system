import { useState } from 'react';
import { useRaidState, MAX_PARTICIPANTS } from './hooks/useRaidState.js';
import BossPanel from './components/BossPanel.jsx';
import ParticipantTable from './components/ParticipantTable.jsx';
import BattleControls from './components/BattleControls.jsx';
import RoundPlanner from './components/RoundPlanner.jsx';
import StatusBoard from './components/StatusBoard.jsx';
import BattleLog from './components/BattleLog.jsx';
import ResultSummary from './components/ResultSummary.jsx';
import { speciesOptions, moveOptions, participantMoveOptions, abilityOptions } from './lib/optionLists.js';

export default function App() {
  const raid = useRaidState();
  const battleActive = !!raid.battle;
  const [teamSize, setTeamSize] = useState(5);

  function handleImportFile(text) {
    const res = raid.importDraft(text);
    if (!res.ok) {
      window.alert(`불러오기 실패: ${res.error}`);
    }
  }

  function handleLoadRoster() {
    if (window.confirm('현재 참가자 명단을 고정 명단으로 덮어씁니다. 계속할까요?')) {
      raid.loadDefaultRoster();
    }
  }

  function handleAutoAssignTeams() {
    const { teamCount, leftoverCount } = raid.autoAssignTeams(teamSize);
    if (teamCount === 0) {
      window.alert('철벽/칼춤/도우미 인원 조합으로 조를 하나도 만들 수 없습니다. 포지션을 먼저 지정해주세요.');
      return;
    }
    window.alert(`${teamCount}개 조를 구성했습니다.${leftoverCount > 0 ? ` (조에 못 들어간 인원 ${leftoverCount}명은 미배정으로 남았습니다)` : ''}`);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <h1>레이드 데미지 계산기</h1>
        <p className="app-subtitle">쇼다운 데미지 공식 기반 · 보스 1마리 vs 참가자 최대 {MAX_PARTICIPANTS}명</p>
      </header>

      <div className={battleActive ? 'layout-grid' : ''}>
        <div className="layout-main">
          {!battleActive && (
            <>
              <BossPanel boss={raid.boss} onChange={raid.updateBoss} disabled={battleActive} />

              <section className="panel">
                <h2>참가자 (최대 {MAX_PARTICIPANTS}명)</h2>
                <p className="hint">
                  빈 슬롯(포지션 미입력)은 전투에서 자동으로 제외됩니다. 참가자는 레벨 50 · 성격 하드 · 도구 없음 · 종족값 100 ·
                  개체값 31로 고정되고, 노력치(기초 포인트)는 참가자별로 직접 입력합니다(최대 스탯당 252 / 합계 508).
                  포지션(철벽/칼춤/도우미)을 선택하면 전투 중 응원 스킬을 사용할 수 있습니다. "조" 번호를 매기면 규칙 III장의
                  철벽1·칼춤3·도우미1(4~6명) 조 구성으로 그룹핑되고, 전투 시작 시 조 단위로 골라 진행할 수 있습니다.
                </p>
                <div className="add-row team-tools">
                  <button type="button" onClick={handleLoadRoster}>
                    고정 명단 불러오기
                  </button>
                  <label className="inline-field">
                    조당 인원
                    <input
                      type="number"
                      min="3"
                      max="24"
                      value={teamSize}
                      onChange={(e) => setTeamSize(Number(e.target.value) || 5)}
                    />
                  </label>
                  <button type="button" onClick={handleAutoAssignTeams}>
                    포지션 조합대로 조 자동 배정
                  </button>
                </div>
                <p className="hint">
                  조 자동 배정은 슬롯 순서가 아니라 포지션 조합(철벽1·도우미1·나머지 칼춤) 기준으로 배정합니다. 조합이
                  안 맞아 남는 인원은 미배정으로 남으니 수동으로 조정하세요.
                </p>
                <ParticipantTable
                  participants={raid.participants}
                  onUpdate={raid.updateParticipant}
                  onClear={raid.clearParticipant}
                  disabled={battleActive}
                />
              </section>
            </>
          )}

          <BattleControls
            maxRounds={raid.maxRounds}
            setMaxRounds={raid.setMaxRounds}
            participants={raid.participants}
            selectedTeam={raid.selectedTeam}
            setSelectedTeam={raid.setSelectedTeam}
            battle={raid.battle}
            onStart={raid.startBattle}
            onReset={raid.resetBattle}
            onExport={raid.exportDraft}
            onImportFile={handleImportFile}
          />

          <RoundPlanner raid={raid} />

          <StatusBoard battle={raid.battle} />
          {raid.battle && <ResultSummary battle={raid.battle} />}
        </div>

        {raid.battle && (
          <div className="layout-side">
            <BattleLog entries={raid.battle.log} />
          </div>
        )}
      </div>

      <datalist id="species-options">
        {speciesOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>
      <datalist id="ability-options">
        {abilityOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>
      <datalist id="move-options">
        {moveOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>
      <datalist id="participant-move-options">
        {participantMoveOptions.map((name, i) => (
          <option key={`${name}-${i}`} value={name} />
        ))}
      </datalist>
    </div>
  );
}
