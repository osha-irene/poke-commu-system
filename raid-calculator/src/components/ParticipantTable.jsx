import { Fragment } from 'react';
import ParticipantRow from './ParticipantRow.jsx';

const UNASSIGNED_KEY = '__unassigned__';

function groupByTeam(participants) {
  const groups = new Map();
  participants.forEach((p) => {
    const key = p.team && String(p.team).trim() ? String(p.team).trim() : UNASSIGNED_KEY;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  });

  const teamKeys = Array.from(groups.keys())
    .filter((k) => k !== UNASSIGNED_KEY)
    .sort((a, b) => Number(a) - Number(b));
  if (groups.has(UNASSIGNED_KEY)) teamKeys.push(UNASSIGNED_KEY);

  return teamKeys.map((key) => ({ key, members: groups.get(key) }));
}

function compositionSummary(members) {
  const active = members.filter((p) => p.position);
  const total = active.length;
  const tankCount = active.filter((p) => p.position === '철벽').length;
  const swordCount = active.filter((p) => p.position === '칼춤').length;
  const healerCount = active.filter((p) => p.position === '도우미').length;

  const warnings = [];
  if (total > 0) {
    if (tankCount !== 1) warnings.push(`철벽 ${tankCount}명(권장 1명)`);
    if (healerCount !== 1) warnings.push(`도우미 ${healerCount}명(권장 1명)`);
    if (total < 4 || total > 6) warnings.push(`총원 ${total}명(권장 4~6명)`);
  }

  return { total, tankCount, swordCount, healerCount, warnings };
}

export default function ParticipantTable({ participants, onUpdate, onClear, disabled }) {
  const groups = groupByTeam(participants);

  return (
    <div className="table-wrap">
      <table className="participant-table">
        <thead>
          <tr>
            <th>#</th>
            <th>닉네임</th>
            <th>포켓몬</th>
            <th>조</th>
            <th>포지션</th>
            <th>성별</th>
            <th>타입</th>
            <th>노력치</th>
            <th>기술(최대4)</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ key, members }) => {
            const isUnassigned = key === UNASSIGNED_KEY;
            const { total, tankCount, swordCount, healerCount, warnings } = compositionSummary(members);
            return (
              <Fragment key={key}>
                <tr className="team-header-row">
                  <td colSpan={8}>
                    {isUnassigned ? (
                      <span>조 미배정 ({members.length}자리)</span>
                    ) : (
                      <>
                        <strong>{key}조</strong>
                        {total > 0 && (
                          <span className="team-summary">
                            {' '}
                            · 철벽 {tankCount} · 칼춤 {swordCount} · 도우미 {healerCount} · 총 {total}명{' '}
                            {warnings.length > 0 ? (
                              <span className="team-warning">⚠ {warnings.join(', ')}</span>
                            ) : (
                              <span className="team-ok">✓ 구성 정상</span>
                            )}
                          </span>
                        )}
                      </>
                    )}
                  </td>
                </tr>
                {members.map((p) => (
                  <ParticipantRow
                    key={p.id}
                    participant={p}
                    disabled={disabled}
                    onChange={(patch) => onUpdate(p.id, patch)}
                    onClear={() => onClear(p.id)}
                  />
                ))}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
