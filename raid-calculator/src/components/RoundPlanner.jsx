import { useEffect, useMemo, useState } from 'react';
import { POSITION_CHEERS, CHEER_MAX_USES } from '../lib/cheers.js';
import { buildTurnOrder } from '../lib/turnOrder.js';
import { groupByTeam, UNASSIGNED_KEY } from '../lib/teams.js';
import { CHEER_PRIORITY, orderingSpeed, isTrickRoom } from '../engine/raidEngine.js';
import { describeActiveConditions } from '../engine/fieldConditions.js';
import { priorityBonus } from '../engine/traits.js';
import showdownIntegration from '../lib/showdownIntegration.js';

// 아군(자기 자신 포함 가능)을 직접 지정해야 하는 기술의 타깃 타입 — 나머지는 지금까지처럼 보스를 자동으로 대상으로 삼는다
const ALLY_TARGET_TYPES = ['adjacentAlly', 'adjacentAllyOrSelf'];

function moveLabel(moveId) {
  const mv = showdownIntegration.getMove(moveId);
  if (!mv) return moveId;
  const spread = mv.target === 'allAdjacent' || mv.target === 'allAdjacentFoes';
  return spread ? `${mv.name} (범위)` : mv.name;
}

function cheerName(position, cheerId) {
  return (POSITION_CHEERS[position] || []).find((c) => c.id === cheerId)?.name || cheerId;
}

function actionPriority(action, entity, battle) {
  if (!action) return 0;
  if (action.kind === 'cheer') return CHEER_PRIORITY;
  const mv = showdownIntegration.getMove(action.moveId);
  return (mv?.priority ?? 0) + priorityBonus(entity, mv, battle);
}

export default function RoundPlanner({ raid }) {
  const { battle, queue } = raid;
  const [activeTeamKey, setActiveTeamKey] = useState(null);
  const [pendingAlly, setPendingAlly] = useState(null); // { participantId, moveId }
  const [bossTarget, setBossTarget] = useState('');

  // 라운드가 바뀌어도 조 선택은 유지한다 (한 번 고른 조로 고정). 대상 선택만 초기화.
  useEffect(() => {
    setPendingAlly(null);
    setBossTarget('');
  }, [battle?.round]);

  // 조가 하나뿐이면 자동으로 그 조를 고정, 고른 조가 사라졌으면 해제
  useEffect(() => {
    if (!battle || battle.status !== 'ongoing') return;
    const groups = groupByTeam(battle.participants.filter(Boolean));
    if (groups.length === 1) {
      setActiveTeamKey((prev) => (prev === groups[0].key ? prev : groups[0].key));
    } else if (activeTeamKey && !groups.some((g) => g.key === activeTeamKey)) {
      setActiveTeamKey(null);
    }
  }, [battle, activeTeamKey]);

  // 처리 예정 순서: 우선도 → 실효 스피드(성격·랭크·마비·순풍) 순. 트릭룸이면 느린 쪽이 먼저.
  // 완전 동점은 실제 처리 때 랜덤.
  const previewOrder = useMemo(() => {
    if (!battle) return [];
    const trickRoom = isTrickRoom(battle);
    const rows = [];
    Object.entries(queue.participants).forEach(([id, action]) => {
      const p = battle.participants.find((x) => x && x.id === Number(id));
      if (!p) return;
      rows.push({
        key: `p-${id}`,
        who: p.nickname,
        detail: action.kind === 'cheer' ? `응원 · ${cheerName(p.position, action.cheerId)}` : moveLabel(action.moveId),
        priority: actionPriority(action, p, battle),
        speed: orderingSpeed(battle, p),
        isBoss: false,
      });
    });
    queue.boss.forEach((action, i) => {
      rows.push({
        key: `b-${i}`,
        who: battle.boss.nickname,
        detail: moveLabel(action.moveId),
        priority: actionPriority(action, battle.boss, battle),
        speed: orderingSpeed(battle, battle.boss),
        isBoss: true,
      });
    });
    rows.sort((a, b) => b.priority - a.priority || (trickRoom ? a.speed - b.speed : b.speed - a.speed));
    return rows.map((row, i) => {
      const prev = rows[i - 1];
      const nextRow = rows[i + 1];
      const tiedWith = (o) => o && o.priority === row.priority && o.speed === row.speed;
      return { ...row, tie: tiedWith(prev) || tiedWith(nextRow) };
    });
  }, [battle, queue]);

  const activeConditions = useMemo(() => (battle ? describeActiveConditions(battle) : []), [battle]);

  if (!battle || battle.status !== 'ongoing') return null;

  const currentRound = battle.round + 1;
  const bossActionsPerRound = Math.max(1, Number(battle.boss?.actionsPerRound) || 2);

  const teamGroups = groupByTeam(battle.participants.filter(Boolean));
  const activeTeamMembers = teamGroups.find((g) => g.key === activeTeamKey)?.members ?? [];
  const aliveMembers = activeTeamMembers.filter((p) => !p.fainted);
  const turnOrder = activeTeamKey ? buildTurnOrder({ ...battle, participants: activeTeamMembers }) : [];

  const pendingAllyInfo = pendingAlly ? showdownIntegration.getMove(pendingAlly.moveId) : null;
  const allowSelfTarget = pendingAllyInfo?.target === 'adjacentAllyOrSelf';

  const queuedCount = Object.keys(queue.participants).length + queue.boss.length;

  function queueMove(participant, moveId) {
    const moveInfo = showdownIntegration.getMove(moveId);
    if (moveInfo && ALLY_TARGET_TYPES.includes(moveInfo.target)) {
      setPendingAlly({ participantId: participant.id, moveId });
      return;
    }
    raid.queueParticipantAction(participant.id, { kind: 'move', moveId });
    setPendingAlly(null);
  }

  function queueAllyTarget(targetId) {
    if (!pendingAlly) return;
    raid.queueParticipantAction(pendingAlly.participantId, {
      kind: 'move',
      moveId: pendingAlly.moveId,
      targetParticipantId: targetId,
    });
    setPendingAlly(null);
  }

  function queueCheer(participant, cheerId) {
    raid.queueParticipantAction(participant.id, { kind: 'cheer', cheerId });
    setPendingAlly(null);
  }

  function addBossAction(moveId) {
    if (!bossTarget || queue.boss.length >= bossActionsPerRound) return;
    raid.queueBossAction({ moveId, targetId: bossTarget === 'random' ? 'random' : Number(bossTarget) });
  }

  const bossMoves = (battle.boss.moves || []).filter(Boolean);

  return (
    <section className="panel planner-panel">
      <h2>{currentRound}라운드 진행 중</h2>

      {activeConditions.length > 0 && (
        <div className="turn-order-line" title="현재 걸려 있는 날씨/필드/트릭룸/사이드 컨디션 (남은 턴)">
          {activeConditions.map((c, i) => (
            <span key={i}>
              {i > 0 && <span className="turn-order-sep">·</span>}
              <span className="turn-order-entry">{c.text}</span>
            </span>
          ))}
        </div>
      )}

      {teamGroups.length > 1 ? (
        <div className="round-team-select">
          <label>
            진행할 조
            <select value={activeTeamKey ?? ''} onChange={(e) => setActiveTeamKey(e.target.value || null)}>
              <option value="">조 선택</option>
              {teamGroups.map((g) => (
                <option key={g.key} value={g.key}>
                  {g.key === UNASSIGNED_KEY ? '조 미배정' : `${g.key}조`} ({g.members.length}명)
                </option>
              ))}
            </select>
            {activeTeamKey && <span className="plan-hint" style={{ margin: 0 }}>이후 라운드에도 이 조로 고정됩니다</span>}
          </label>
        </div>
      ) : null}

      {!activeTeamKey && teamGroups.length > 1 && (
        <p className="plan-hint">진행할 조를 선택하세요. (한 번 고르면 이후 라운드에도 유지됩니다)</p>
      )}

      {activeTeamKey && (
        <>
          <div className="turn-order-line" title="스피드 참고용(랭크·마비·우선도 미반영). 실제 처리 순서는 아래 '처리 예정 순서'를 따른다.">
            {turnOrder.map((entry, i) => (
              <span key={entry.key}>
                {i > 0 && <span className="turn-order-sep">-</span>}
                <span
                  className={`turn-order-entry ${entry.isBoss ? 'turn-order-boss' : ''} ${
                    entry.fainted ? 'turn-order-fainted' : ''
                  }`}
                >
                  {entry.label}
                </span>
              </span>
            ))}
          </div>

          <p className="plan-hint">
            기술/응원을 누르면 바로 처리하지 않고 <b>예약</b>만 합니다. 참가자·보스 예약을 마친 뒤 아래
            <b> “우선도 순으로 일괄 처리” </b>를 누르면 우선도 → 스피드(성격·랭크·마비 반영) → 랜덤(동점) 순으로
            한 번에 처리합니다. 응원 우선도는 +{CHEER_PRIORITY}, 보스는 라운드당 {bossActionsPerRound}번까지 예약할 수 있습니다.
          </p>

          <div className="planner-columns">
            <div className="planner-column">
              <h3>참가자 예약</h3>
              {aliveMembers.length === 0 && <p className="plan-hint">이 조에 행동 가능한 참가자가 없습니다.</p>}

              {aliveMembers.map((p) => {
                const acted = battle.actedParticipantIds.includes(p.id);
                const queued = queue.participants[p.id];
                const cheers = POSITION_CHEERS[p.position] || [];
                const cheersRemaining = CHEER_MAX_USES - (p.cheerUsed || 0);
                const isPendingAlly = pendingAlly?.participantId === p.id;
                const allyOptions = aliveMembers.filter((m) => allowSelfTarget || m.id !== p.id);

                return (
                  <div key={p.id} className="action-picker">
                    <p className="plan-hint">
                      <b>{p.nickname}</b>
                      {p.position ? ` (${p.position})` : ''}
                    </p>

                    {acted ? (
                      <p className="plan-hint">이번 라운드에 이미 행동했습니다.</p>
                    ) : queued ? (
                      <div className="button-grid">
                        <span className="turn-order-entry">
                          예약: {queued.kind === 'cheer' ? `응원 · ${cheerName(p.position, queued.cheerId)}` : moveLabel(queued.moveId)}
                          {queued.targetParticipantId != null
                            ? ` → ${battle.participants.find((m) => m && m.id === queued.targetParticipantId)?.nickname || ''}`
                            : ''}
                        </span>
                        <button type="button" onClick={() => raid.unqueueParticipantAction(p.id)}>
                          취소
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="button-grid">
                          {(p.moves || []).length === 0 && <span className="plan-hint">등록된 기술이 없습니다.</span>}
                          {(p.moves || []).map((move, i) => (
                            <button
                              key={i}
                              type="button"
                              className={isPendingAlly && pendingAlly.moveId === move ? 'btn-primary' : undefined}
                              onClick={() => queueMove(p, move)}
                            >
                              {move}
                            </button>
                          ))}
                          {cheers.map((cheer) => (
                            <button
                              key={cheer.id}
                              type="button"
                              className="btn-cheer"
                              title={cheer.desc}
                              disabled={cheersRemaining <= 0}
                              onClick={() => queueCheer(p, cheer.id)}
                            >
                              {cheer.name} (남은 {cheersRemaining})
                            </button>
                          ))}
                        </div>

                        {isPendingAlly && (
                          <>
                            <p className="plan-hint">
                              {pendingAllyInfo?.name || pendingAlly.moveId}의 대상 선택{allowSelfTarget ? ' (자신 포함)' : ''}
                            </p>
                            <div className="button-grid">
                              {allyOptions.length === 0 && <span className="plan-hint">지정할 수 있는 아군이 없습니다.</span>}
                              {allyOptions.map((m) => (
                                <button key={m.id} type="button" onClick={() => queueAllyTarget(m.id)}>
                                  {m.nickname}
                                  {m.id === p.id ? ' (자신)' : ''}
                                </button>
                              ))}
                              <button type="button" onClick={() => setPendingAlly(null)}>
                                취소
                              </button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="planner-column">
              <h3>
                보스 예약 ({queue.boss.length}/{bossActionsPerRound})
              </h3>
              <select value={bossTarget} onChange={(e) => setBossTarget(e.target.value)}>
                <option value="">대상 선택</option>
                <option value="random">랜덤</option>
                {aliveMembers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nickname}
                  </option>
                ))}
              </select>
              <div className="button-grid">
                {bossMoves.length === 0 && <span className="plan-hint">보스 기술이 등록되지 않았습니다.</span>}
                {bossMoves.map((move, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={!bossTarget || queue.boss.length >= bossActionsPerRound}
                    onClick={() => addBossAction(move)}
                  >
                    {move}
                  </button>
                ))}
              </div>

              {queue.boss.length > 0 && (
                <div className="button-grid">
                  {queue.boss.map((action, i) => {
                    const targetName =
                      action.targetId === 'random'
                        ? '랜덤'
                        : battle.participants.find((m) => m && m.id === action.targetId)?.nickname || '?';
                    return (
                      <span key={i} className="turn-order-entry">
                        {moveLabel(action.moveId)} → {targetName}
                        <button
                          type="button"
                          style={{ marginLeft: 6 }}
                          onClick={() => raid.unqueueBossAction(i)}
                        >
                          x
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              <p className="plan-hint">무료 행동 (턴 소모 없음, 테라레이드형 · 즉시 반영)</p>
              <div className="button-grid">
                <button type="button" className="btn-free-action" onClick={raid.runResetFieldBoosts}>
                  필드 랭크 초기화
                </button>
                <button type="button" className="btn-free-action" onClick={raid.runCureBossStatus}>
                  자신 상태이상 회복
                </button>
                <button type="button" className="btn-free-action" onClick={raid.runClearFieldConditions}>
                  날씨·필드·사이드 효과 제거
                </button>
              </div>
            </div>
          </div>

          {previewOrder.length > 0 && (
            <div className="turn-order-line" title="우선도 → 실효 스피드(성격·랭크·마비) 순. 완전 동점은 처리 시 랜덤.">
              {previewOrder.map((row, i) => (
                <span key={row.key}>
                  {i > 0 && <span className="turn-order-sep">-</span>}
                  <span className={`turn-order-entry ${row.isBoss ? 'turn-order-boss' : ''}`}>
                    {row.who}
                    <span className="plan-hint" style={{ margin: '0 0 0 4px', display: 'inline' }}>
                      {row.detail} · 우선도 {row.priority} · 속도 {row.speed}
                      {row.tie ? ' · 동점(랜덤)' : ''}
                    </span>
                  </span>
                </span>
              ))}
            </div>
          )}

          <div className="round-end-row">
            <button type="button" onClick={raid.clearQueue} disabled={queuedCount === 0}>
              예약 비우기
            </button>
            <button type="button" className="btn-primary" onClick={raid.runResolveQueue} disabled={queuedCount === 0}>
              우선도 순으로 일괄 처리 ({queuedCount})
            </button>
            <button type="button" className="btn-primary" onClick={raid.runEndRound}>
              {currentRound}라운드 종료하고 다음 라운드로
            </button>
          </div>
        </>
      )}
    </section>
  );
}
