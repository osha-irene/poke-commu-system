import { Fragment } from 'react';
import ParticipantRow from './ParticipantRow.jsx';
import { groupByTeam, UNASSIGNED_KEY, teamColor } from '../lib/teams.js';

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

function ParticipantTableHalf({ groups, onUpdate, onClear, disabled }) {
  let rowCounter = 0;

  return (
    <div className="table-wrap">
      <table className="participant-table">
        <thead>
          <tr>
            <th>#</th>
            <th>닉네임</th>
            <th>포켓몬</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {groups.map(({ key, members, showHeader = true }) => {
            const isUnassigned = key === UNASSIGNED_KEY;
            const rowColor = teamColor(key);
            const { total, tankCount, swordCount, healerCount, warnings } = compositionSummary(members);
            return (
              <Fragment key={key}>
                {showHeader && (
                  <tr className="team-header-row">
                    <td colSpan={4}>
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
                )}
                {members.map((p) => {
                  const alt = rowCounter % 2 === 1;
                  rowCounter += 1;
                  return (
                    <ParticipantRow
                      key={p.id}
                      participant={p}
                      disabled={disabled}
                      alt={alt}
                      rowColor={rowColor}
                      onChange={(patch) => onUpdate(p.id, patch)}
                      onClear={() => onClear(p.id)}
                    />
                  );
                })}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ParticipantTable({ participants, onUpdate, onClear, disabled }) {
  const groups = groupByTeam(participants);

  let left;
  let right;
  if (groups.length > 1) {
    // 조가 여러 개면 조(그룹) 단위를 쪼개지 않고 절반씩 좌우 2열로 배치
    const half = Math.ceil(groups.length / 2);
    left = groups.slice(0, half);
    right = groups.slice(half);
  } else {
    // 조가 하나뿐이거나(전원 같은 조) 미배정이면, 인원수 기준으로 반씩 나눠 항상 2열을 유지
    const singleKey = groups.length === 1 ? groups[0].key : UNASSIGNED_KEY;
    const half = Math.ceil(participants.length / 2);
    left = [{ key: singleKey, members: participants.slice(0, half), showHeader: false }];
    right = [{ key: singleKey, members: participants.slice(half), showHeader: false }];
  }

  return (
    <div className="participant-tables-grid">
      <ParticipantTableHalf groups={left} onUpdate={onUpdate} onClear={onClear} disabled={disabled} />
      {right.length > 0 && (
        <ParticipantTableHalf groups={right} onUpdate={onUpdate} onClear={onClear} disabled={disabled} />
      )}
    </div>
  );
}
