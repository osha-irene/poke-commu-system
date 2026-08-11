import { TYPE_OPTIONS } from '../lib/typeOptions.js';

export default function ParticipantRow({ participant, index, onChange, onClear, disabled }) {
  const p = participant;
  const [type1, type2] = p.types && p.types.length ? p.types : ['Normal'];

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

  return (
    <tr className={p.fainted ? 'row-fainted' : ''}>
      <td className="col-index">{index + 1}</td>
      <td>
        <input
          value={p.nickname}
          placeholder={`참가자${index + 1}`}
          disabled={disabled}
          onChange={(e) => onChange({ nickname: e.target.value })}
        />
      </td>
      <td>
        <input
          value={p.position}
          placeholder="포지션"
          disabled={disabled}
          onChange={(e) => onChange({ position: e.target.value })}
        />
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
        <button type="button" disabled={disabled} onClick={onClear}>
          지우기
        </button>
      </td>
    </tr>
  );
}
