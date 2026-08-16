import { TYPE_OPTIONS } from '../lib/typeOptions.js';
import { POSITION_OPTIONS } from '../lib/cheers.js';
import { statsToText, textToStats } from '../lib/statText.js';

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
  const moves = p.moves && p.moves.length ? p.moves : ['', '', '', ''];

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

  function handleMovesTextChange(text) {
    const parts = text
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 4);
    onChange({ moves: parts });
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
        <select value={p.position} disabled={disabled} onChange={(e) => onChange({ position: e.target.value })}>
          <option value="">포지션 선택</option>
          {POSITION_OPTIONS.map((pos) => (
            <option key={pos} value={pos}>
              {pos}
            </option>
          ))}
        </select>
      </td>
      <td>
        <select value={p.gender || ''} disabled={disabled} onChange={(e) => onChange({ gender: e.target.value })}>
          <option value="">불명</option>
          <option value="M">수컷</option>
          <option value="F">암컷</option>
        </select>
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
        <input
          className="col-stats"
          title="HP,공격,방어,특공,특방,스피드"
          value={statsToText(p.evs)}
          disabled={disabled}
          onChange={(e) => onChange({ evs: textToStats(e.target.value, p.evs) })}
        />
      </td>
      <td>
        <input
          list="move-options"
          value={moves.join(', ')}
          placeholder="기술1, 기술2, 기술3, 기술4"
          disabled={disabled}
          onChange={(e) => handleMovesTextChange(e.target.value)}
        />
      </td>
      <td>
        <button type="button" disabled={disabled} onClick={onClear}>
          지우기
        </button>
      </td>
    </tr>
  );
}
