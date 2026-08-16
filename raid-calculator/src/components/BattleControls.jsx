import { useRef } from 'react';

function getTeamOptions(participants) {
  const counts = new Map();
  participants.forEach((p) => {
    const key = p.team && String(p.team).trim() ? String(p.team).trim() : null;
    if (!key || !p.position) return;
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([team, count]) => ({ team, count }));
}

export default function BattleControls({
  maxRounds,
  setMaxRounds,
  participants,
  selectedTeam,
  setSelectedTeam,
  battle,
  onStart,
  onReset,
  onExport,
  onImportFile,
}) {
  const fileInputRef = useRef(null);
  const teamOptions = getTeamOptions(participants || []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportFile(String(reader.result));
    reader.readAsText(file);
    e.target.value = '';
  }

  if (battle) {
    return (
      <div className="button-row">
        <button type="button" onClick={onReset}>
          리셋
        </button>
      </div>
    );
  }

  return (
    <section className="panel controls-panel">
      <h2>전투 컨트롤</h2>
      <div className="field-grid">
        <label>
          최대 라운드 (규칙상 기본 6라운드)
          <input
            type="number"
            min="1"
            max="500"
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value) || 6)}
          />
        </label>
        <label>
          전투에 참여할 조
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="">전체 참가자 (조 구분 없이)</option>
            {teamOptions.map(({ team, count }) => (
              <option key={team} value={team}>
                {team}조 ({count}명)
              </option>
            ))}
          </select>
        </label>
      </div>
      {selectedTeam === '' && teamOptions.length > 0 && (
        <p className="hint">조를 선택하지 않으면 배정된 조 구분 없이 참가자 전원이 함께 전투에 참여합니다.</p>
      )}
      <div className="button-row">
        <button type="button" className="btn-primary" onClick={onStart}>
          전투 시작
        </button>
        <button type="button" onClick={onExport}>
          설정 내보내기 (JSON)
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          설정 불러오기 (JSON)
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" hidden onChange={handleFileChange} />
      </div>
    </section>
  );
}
