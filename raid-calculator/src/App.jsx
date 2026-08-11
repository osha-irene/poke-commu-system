import { useRaidState, MAX_PARTICIPANTS } from './hooks/useRaidState.js';
import BossPanel from './components/BossPanel.jsx';
import ParticipantTable from './components/ParticipantTable.jsx';
import BattleControls from './components/BattleControls.jsx';
import RoundPlanner from './components/RoundPlanner.jsx';
import StatusBoard from './components/StatusBoard.jsx';
import BattleLog from './components/BattleLog.jsx';
import ResultSummary from './components/ResultSummary.jsx';
import { speciesOptions, moveOptions, abilityOptions } from './lib/optionLists.js';

export default function App() {
  const raid = useRaidState();
  const battleActive = !!raid.battle;

  function handleImportFile(text) {
    const res = raid.importDraft(text);
    if (!res.ok) {
      window.alert(`불러오기 실패: ${res.error}`);
    }
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
                  개체값 31 · 노력치 0으로 고정됩니다.
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
    </div>
  );
}
