import { useRef, useState } from 'react';

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
  onExportSnapshot,
  onResume,
}) {
  const fileInputRef = useRef(null);
  const teamOptions = getTeamOptions(participants || []);

  const [snapshotRound, setSnapshotRound] = useState('current');
  const [snapshotText, setSnapshotText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [resumeText, setResumeText] = useState('');

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onImportFile(String(reader.result));
    reader.readAsText(file);
    e.target.value = '';
  }

  function handleMakeSnapshotText() {
    const round = snapshotRound === 'current' ? null : Number(snapshotRound);
    const text = onExportSnapshot?.(round);
    setSnapshotText(text || '');
    setCopyStatus('');
  }

  async function handleCopySnapshot() {
    if (!snapshotText) return;
    try {
      await navigator.clipboard.writeText(snapshotText);
      setCopyStatus('클립보드에 복사했습니다.');
    } catch {
      setCopyStatus('클립보드 복사에 실패했습니다 — 아래 텍스트를 직접 선택해 복사해주세요.');
    }
  }

  function handleResumeClick() {
    if (!resumeText.trim()) return;
    const res = onResume?.(resumeText);
    if (res?.ok) setResumeText('');
  }

  if (battle) {
    const historyRounds = (battle.history || []).map((h) => h.round);
    return (
      <section className="panel controls-panel">
        <div className="button-row">
          <button type="button" onClick={onReset}>
            리셋
          </button>
        </div>

        <h3>진행 상태 복사 (이어하기용)</h3>
        <p className="hint">
          복사한 텍스트를 보관해두면, 전투를 리셋하거나 앱을 다시 연 뒤 아래 "이어하기"에 붙여넣어 그
          시점부터 그대로 계속할 수 있습니다.
        </p>
        <div className="field-grid">
          <label>
            복사할 라운드
            <select value={snapshotRound} onChange={(e) => setSnapshotRound(e.target.value)}>
              <option value="current">현재 (라운드 {battle.round + 1} 진행 중)</option>
              {historyRounds.map((r) => (
                <option key={r} value={r}>
                  {r}라운드 종료 시점
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="button-row">
          <button type="button" onClick={handleMakeSnapshotText}>
            복사용 텍스트 만들기
          </button>
          {snapshotText && (
            <button type="button" className="btn-primary" onClick={handleCopySnapshot}>
              클립보드에 복사
            </button>
          )}
        </div>
        {snapshotText && (
          <>
            <textarea
              readOnly
              value={snapshotText}
              rows={6}
              onFocus={(e) => e.target.select()}
              className="snapshot-textarea"
            />
            {copyStatus && <p className="hint">{copyStatus}</p>}
          </>
        )}
      </section>
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

      <h3>진행 중이던 전투 이어하기</h3>
      <p className="hint">전투 중 "진행 상태 복사"로 복사해 둔 텍스트를 붙여넣으면 그 시점부터 이어서 할 수 있습니다.</p>
      <div className="field-grid">
        <textarea
          placeholder="복사해 둔 전투 상태 JSON을 여기에 붙여넣으세요"
          value={resumeText}
          onChange={(e) => setResumeText(e.target.value)}
          rows={4}
          className="snapshot-textarea"
        />
      </div>
      <div className="button-row">
        <button type="button" onClick={handleResumeClick} disabled={!resumeText.trim()}>
          이어하기
        </button>
      </div>
    </section>
  );
}
