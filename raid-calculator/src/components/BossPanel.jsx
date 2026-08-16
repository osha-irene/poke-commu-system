import { NATURE_MODIFIERS } from '../lib/statCalculator.js';
import { TYPE_OPTIONS } from '../lib/typeOptions.js';
import StatTextInput from './StatTextInput.jsx';

const NATURE_OPTIONS = Object.keys(NATURE_MODIFIERS);

export default function BossPanel({ boss, onChange, disabled }) {
  const [type1, type2] = boss.types && boss.types.length ? boss.types : ['Normal'];

  function handleTypeChange(slot, value) {
    const types = [type1, type2].filter(Boolean);
    if (slot === 0) {
      types[0] = value;
    } else if (value) {
      types[1] = value;
    } else {
      types.length = 1;
    }
    onChange({ types: types.filter(Boolean) });
  }

  function handleMoveChange(slot, value) {
    const moves = [...(boss.moves && boss.moves.length ? boss.moves : ['', '', '', ''])];
    moves[slot] = value;
    onChange({ moves });
  }

  const moves = boss.moves && boss.moves.length ? boss.moves : ['', '', '', ''];

  return (
    <section className="panel boss-panel">
      <h2>보스</h2>
      <div className="field-grid">
        <label>
          이름
          <input value={boss.nickname} disabled={disabled} onChange={(e) => onChange({ nickname: e.target.value })} />
        </label>
        <label>
          레벨
          <input
            type="number"
            min="1"
            max="100"
            value={boss.level}
            disabled={disabled}
            onChange={(e) => onChange({ level: Number(e.target.value) || 1 })}
          />
        </label>
        <label>
          성격
          <select value={boss.nature} disabled={disabled} onChange={(e) => onChange({ nature: e.target.value })}>
            {NATURE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <label>
          성별
          <select value={boss.gender || ''} disabled={disabled} onChange={(e) => onChange({ gender: e.target.value })}>
            <option value="">성별 불명</option>
            <option value="M">수컷</option>
            <option value="F">암컷</option>
          </select>
        </label>
        <label>
          특성
          <input
            list="ability-options"
            value={boss.ability}
            disabled={disabled}
            onChange={(e) => onChange({ ability: e.target.value })}
          />
        </label>
        <label>
          도구
          <input value={boss.item} disabled={disabled} onChange={(e) => onChange({ item: e.target.value })} />
        </label>
        <label>
          타입
          <div className="type-select-pair">
            <select value={type1} disabled={disabled} onChange={(e) => handleTypeChange(0, e.target.value)}>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.en} value={t.en}>
                  {t.ko}
                </option>
              ))}
            </select>
            <select value={type2 || ''} disabled={disabled} onChange={(e) => handleTypeChange(1, e.target.value)}>
              <option value="">-</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t.en} value={t.en}>
                  {t.ko}
                </option>
              ))}
            </select>
          </div>
        </label>
        <label>
          체력 배수 (종족값/레벨로 계산한 체력에 곱함)
          <input
            type="number"
            min="0.1"
            step="0.1"
            value={boss.hpMultiplier}
            disabled={disabled}
            onChange={(e) => onChange({ hpMultiplier: e.target.value })}
          />
        </label>
        <label className="span-2">
          종족값 (HP,공격,방어,특공,특방,스피드)
          <StatTextInput value={boss.baseStats} disabled={disabled} onChange={(baseStats) => onChange({ baseStats })} />
        </label>
        <label className="span-2">
          개체값 (위와 동일 순서)
          <StatTextInput value={boss.ivs} disabled={disabled} onChange={(ivs) => onChange({ ivs })} />
        </label>
        <label className="span-2">
          노력치 (위와 동일 순서)
          <StatTextInput value={boss.evs} disabled={disabled} onChange={(evs) => onChange({ evs })} />
        </label>
        <label>
          한 턴당 기본 행동 횟수 (참고용, 실제 실행 횟수는 자유)
          <input
            type="number"
            min="0"
            max="10"
            value={boss.actionsPerRound}
            disabled={disabled}
            onChange={(e) => onChange({ actionsPerRound: Number(e.target.value) || 0 })}
          />
        </label>
      </div>
      <div className="field-grid boss-moves-grid">
        {moves.map((move, i) => (
          <label key={i}>
            기술 {i + 1}
            <input
              list="move-options"
              value={move}
              disabled={disabled}
              onChange={(e) => handleMoveChange(i, e.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
