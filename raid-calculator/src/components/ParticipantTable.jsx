import ParticipantRow from './ParticipantRow.jsx';

function ParticipantTableHalf({ participants, onUpdate, onClear, disabled }) {
  return (
    <div className="table-wrap">
      <table className="participant-table">
        <thead>
          <tr>
            <th>#</th>
            <th>닉네임</th>
            <th>포지션</th>
            <th>성별</th>
            <th>타입</th>
            <th>노력치</th>
            <th>기술(최대4)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {participants.map(({ p, i }) => (
            <ParticipantRow
              key={p.id}
              index={i}
              participant={p}
              disabled={disabled}
              onChange={(patch) => onUpdate(p.id, patch)}
              onClear={() => onClear(p.id)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ParticipantTable({ participants, onUpdate, onClear, disabled }) {
  const indexed = participants.map((p, i) => ({ p, i }));
  const half = Math.ceil(indexed.length / 2);
  const left = indexed.slice(0, half);
  const right = indexed.slice(half);

  return (
    <div className="participant-tables-grid">
      <ParticipantTableHalf participants={left} onUpdate={onUpdate} onClear={onClear} disabled={disabled} />
      <ParticipantTableHalf participants={right} onUpdate={onUpdate} onClear={onClear} disabled={disabled} />
    </div>
  );
}
