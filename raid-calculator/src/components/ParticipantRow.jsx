import { participantMoveOptions } from '../lib/optionLists.js';
import { POSITION_OPTIONS } from '../lib/cheers.js';
import { TYPE_OPTIONS } from '../lib/typeOptions.js';
import EvNumberInput from './EvNumberInput.jsx';

const EV_STATS = [
  ['hp', 'H'],
  ['atk', 'A'],
  ['def', 'B'],
  ['spa', 'C'],
  ['spd', 'D'],
  ['spe', 'S'],
];

const EV_TOTAL_MAX = 508;
const EV_STAT_MAX = 252;

export default function ParticipantRow({ participant, onChange, onClear, disabled, alt, rowColor }) {
  const p = participant;
  const slotNumber = p.id + 1;
  const [type1, type2] = p.types && p.types.length ? p.types : ['Normal'];
  const moves = p.moves && p.moves.length ? p.moves : ['', '', '', ''];
  const evTotal = EV_STATS.reduce((sum, [key]) => sum + (Number(p.evs?.[key]) || 0), 0);
  const evOverTotal = evTotal > EV_TOTAL_MAX;

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

  function handleMoveSlotChange(slot, value) {
    const next = [...moves];
    next[slot] = value;
    onChange({ moves: next });
  }

  return (
    <>
      <tr
        className={`participant-row-main ${alt ? 'row-alt' : ''} ${p.fainted ? 'row-fainted' : ''}`}
        style={rowColor && rowColor !== 'transparent' ? { backgroundColor: rowColor } : undefined}
      >
        <td className="col-index" rowSpan={2}>
          {slotNumber}
        </td>
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
            list="species-options"
            value={p.pokemon || ''}
            placeholder="포켓몬"
            disabled={disabled}
            onChange={(e) => onChange({ pokemon: e.target.value })}
          />
        </td>
        <td rowSpan={2}>
          <button type="button" disabled={disabled} onClick={onClear}>
            지우기
          </button>
        </td>
      </tr>
      <tr
        className={`participant-row-moves ${alt ? 'row-alt' : ''} ${p.fainted ? 'row-fainted' : ''}`}
        style={rowColor && rowColor !== 'transparent' ? { backgroundColor: rowColor } : undefined}
      >
        <td colSpan={2} className="moves-row-cell">
          <div className="participant-detail-lines">
            <div className="detail-line">
              <span className="moves-row-label">조</span>
              <input
                className="col-narrow"
                value={p.team || ''}
                placeholder="조"
                disabled={disabled}
                onChange={(e) => onChange({ team: e.target.value })}
              />
              <span className="moves-row-label">포지션</span>
              <select
                className="position-select-sm"
                value={p.position}
                disabled={disabled}
                onChange={(e) => onChange({ position: e.target.value })}
              >
                <option value="">포지션 선택</option>
                {POSITION_OPTIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <span className="moves-row-label">성별</span>
              <select
                className="gender-select-sm"
                value={p.gender || ''}
                disabled={disabled}
                onChange={(e) => onChange({ gender: e.target.value })}
              >
                <option value="">불명</option>
                <option value="M">수컷</option>
                <option value="F">암컷</option>
              </select>
              <span className="moves-row-label">타입</span>
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
            </div>
            <div className="detail-line">
              <span className="moves-row-label">노력치</span>
              {EV_STATS.map(([key, label]) => (
                <label key={key} className="ev-stat-box">
                  <span className="ev-stat-initial">{label}</span>
                  <EvNumberInput
                    className={`ev-stat-input ${(Number(p.evs?.[key]) || 0) > EV_STAT_MAX ? 'ev-total-over' : ''}`}
                    value={p.evs?.[key] ?? 0}
                    disabled={disabled}
                    onChange={(num) => onChange({ evs: { ...p.evs, [key]: num } })}
                  />
                </label>
              ))}
              <span className={`ev-total-inline ${evOverTotal ? 'ev-total-over' : ''}`}>
                {evTotal}/{EV_TOTAL_MAX}
              </span>
            </div>
            <div className="detail-line">
              <span className="moves-row-label">기술</span>
              {moves.map((move, i) => (
                <input
                  key={i}
                  className="move-input-sm"
                  list="participant-move-options"
                  value={move}
                  placeholder={`기술 ${i + 1}`}
                  disabled={disabled}
                  onChange={(e) => handleMoveSlotChange(i, e.target.value)}
                />
              ))}
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
