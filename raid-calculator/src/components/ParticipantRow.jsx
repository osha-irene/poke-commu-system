import { TYPE_OPTIONS } from '../lib/typeOptions.js';
import { POSITION_OPTIONS } from '../engine/cheerSkills.js';

const EV_STATS = [
  ['hp', 'HP'],
  ['atk', '공'],
  ['def', '방'],
  ['spa', '특공'],
  ['spd', '특방'],
  ['spe', '스피드'],
];

const EV_TOTAL_MAX = 508;
const EV_STAT_MAX = 252;

export default function ParticipantRow({ participant, onChange, onClear, disabled }) {
  const p = participant;
  const slotNumber = p.id + 1;
  const [type1, type2] = p.types && p.types.length ? p.types : ['Normal'];
  const evs = p.evs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  const evTotal = EV_STATS.reduce((sum, [key]) => sum + (Number(evs[key]) || 0), 0);

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

  function handleEvChange(stat, value) {
    const clamped = Math.max(0, Math.min(EV_STAT_MAX, Number(value) || 0));
    onChange({ evs: { ...evs, [stat]: clamped } });
  }

  return (
    <tr className={p.fainted ? 'row-fainted' : ''}>
      <td className="col-index">{slotNumber}</td>
      <td>
        <input
          value={p.nickname}
          placeholder={`참가자${slotNumber}`}
          disabled={disabled}
          onChange={(e) => onChange({ nickname: e.target.value })}
        />
      </td>
      <td>
        <input
          value={p.pokemon || ''}
          placeholder="포켓몬"
          disabled={disabled}
          onChange={(e) => onChange({ pokemon: e.target.value })}
        />
      </td>
      <td>
        <input
          className="col-team"
          type="text"
          inputMode="numeric"
          value={p.team || ''}
          placeholder="-"
          disabled={disabled}
          onChange={(e) => onChange({ team: e.target.value.replace(/[^0-9]/g, '') })}
        />
      </td>
      <td>
        <select value={p.position} disabled={disabled} onChange={(e) => onChange({ position: e.target.value })}>
          <option value="">-</option>
          {POSITION_OPTIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </td>
      <td>
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
      </td>
      <td>
        <div className="ev-input-grid">
          {EV_STATS.map(([key, label]) => (
            <label key={key} className="ev-input">
              <span>{label}</span>
              <input
                type="number"
                min="0"
                max={EV_STAT_MAX}
                step="4"
                value={evs[key] ?? 0}
                disabled={disabled}
                onChange={(e) => handleEvChange(key, e.target.value)}
              />
            </label>
          ))}
          <span className={`ev-total ${evTotal > EV_TOTAL_MAX ? 'ev-total-over' : ''}`}>
            합 {evTotal}/{EV_TOTAL_MAX}
          </span>
        </div>
      </td>
      <td>
        <button type="button" disabled={disabled} onClick={onClear}>
          지우기
        </button>
      </td>
    </tr>
  );
}
