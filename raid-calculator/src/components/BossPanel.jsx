import { NATURE_MODIFIERS } from '../lib/statCalculator.js';
import { statsToText, textToStats } from '../lib/statText.js';

const NATURE_OPTIONS = Object.keys(NATURE_MODIFIERS);

export default function BossPanel({ boss, onChange, disabled }) {
  return (
    <section className="panel boss-panel">
      <h2>보스</h2>
      <div className="field-grid">
        <label>
          이름
          <input value={boss.nickname} disabled={disabled} onChange={(e) => onChange({ nickname: e.target.value })} />
        </label>
        <label>
          종별
          <input
            list="species-options"
            value={boss.species}
            disabled={disabled}
            onChange={(e) => onChange({ species: e.target.value })}
          />
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
        <label className="span-2">
          개체값 (HP,공격,방어,특공,특방,스피드)
          <input
            value={statsToText(boss.ivs)}
            disabled={disabled}
            onChange={(e) => onChange({ ivs: textToStats(e.target.value, boss.ivs) })}
          />
        </label>
        <label className="span-2">
          노력치 (위와 동일 순서)
          <input
            value={statsToText(boss.evs)}
            disabled={disabled}
            onChange={(e) => onChange({ evs: textToStats(e.target.value, boss.evs) })}
          />
        </label>
        <label>
          체력 직접 지정 (비워두면 종족값/레벨로 자동 계산)
          <input
            type="number"
            min="1"
            value={boss.customMaxHP}
            disabled={disabled}
            placeholder="자동 계산"
            onChange={(e) => onChange({ customMaxHP: e.target.value })}
          />
        </label>
      </div>
    </section>
  );
}
