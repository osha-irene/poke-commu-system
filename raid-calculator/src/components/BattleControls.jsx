import { useRef } from 'react';

export default function BattleControls({
  maxRounds,
  setMaxRounds,
  battle,
  onStart,
  onReset,
  onExport,
  onImportFile,
}) {
  const fileInputRef = useRef(null);

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
          최대 라운드 (안전장치)
          <input
            type="number"
            min="1"
            max="500"
            value={maxRounds}
            onChange={(e) => setMaxRounds(Number(e.target.value) || 100)}
          />
        </label>
      </div>
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
