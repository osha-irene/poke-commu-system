import HPBar from './HPBar.jsx';
import { STATUS_LABEL, STAT_LABEL, CHEER_MAX_USES } from '../lib/cheers.js';
import { groupByTeam, UNASSIGNED_KEY, teamColor } from '../lib/teams.js';
import { describeActiveConditions } from '../engine/fieldConditions.js';

function statusBadges(p) {
  const badges = [];
  if (p.status) {
    const base = STATUS_LABEL[p.status] || p.status;
    badges.push({ text: p.status === 'slp' && p.sleepTurns > 0 ? `${base} ${p.sleepTurns}` : base, kind: 'status' });
  }
  if (p.confusionTurns > 0) badges.push({ text: '혼란', kind: 'status' });
  if (p.leechSeed) badges.push({ text: '씨뿌리기', kind: 'status' });
  if (p.bindTurns > 0) badges.push({ text: '조이기', kind: 'status' });
  if (p.tauntTurns > 0) badges.push({ text: '도발', kind: 'status' });
  if (p.encoreTurns > 0) badges.push({ text: '앵콜', kind: 'status' });
  if (p.tormentActive) badges.push({ text: '트집', kind: 'status' });
  if (p.healBlockTurns > 0) badges.push({ text: '회복봉인', kind: 'status' });
  if (p.attractActive) badges.push({ text: '헤롱헤롱', kind: 'status' });
  if (p.disableTurns > 0) badges.push({ text: '사슬묶임', kind: 'status' });
  if (p.flinched) badges.push({ text: '풀죽음', kind: 'status' });
  if (p.drowsyTurns > 0) badges.push({ text: '하품', kind: 'status' });
  if (p.aquaRing) badges.push({ text: '아쿠아링' });
  if (p.ingrain) badges.push({ text: '뿌리내림' });
  if (p.substitute) badges.push({ text: `대타 ${p.substitute.hp}` });
  if (p.chargingMove) badges.push({ text: '충전중', kind: 'status' });
  if (p.mustRecharge) badges.push({ text: '재충전', kind: 'status' });
  if (p.protectedThisRound) badges.push({ text: '방어' });
  if (p.enduringThisRound) badges.push({ text: '버티기' });

  Object.entries(p.boosts || {}).forEach(([stat, value]) => {
    if (value) badges.push({ text: `${STAT_LABEL[stat] || stat}${value > 0 ? '+' : ''}${value}` });
  });

  if (p.redirectActive) badges.push({ text: '보호중' });
  if (p.mustSkipTurn) badges.push({ text: '행동불가' });
  if (p.cheerUsed > 0) badges.push({ text: `응원 ${p.cheerUsed}/${CHEER_MAX_USES}` });

  return badges;
}

function ConditionBadges({ pokemon }) {
  const badges = statusBadges(pokemon);
  if (badges.length === 0) return null;

  return (
    <div className="condition-badges">
      {badges.map((badge, i) => (
        <span key={i} className={`badge ${badge.kind === 'status' ? 'badge-status' : ''}`}>
          {badge.text}
        </span>
      ))}
    </div>
  );
}

export default function StatusBoard({ battle }) {
  if (!battle) return null;

  const groups = groupByTeam(battle.participants.filter(Boolean));
  const fieldConditions = describeActiveConditions(battle);

  return (
    <section className="panel status-panel">
      <h2>전투 현황</h2>
      {fieldConditions.length > 0 && (
        <div className="condition-badges">
          {fieldConditions.map((c, i) => (
            <span key={i} className="badge badge-status">
              {c.text}
            </span>
          ))}
        </div>
      )}
      <HPBar current={battle.boss.currentHP} max={battle.boss.maxHP} label={`보스: ${battle.boss.nickname}`} />
      <ConditionBadges pokemon={battle.boss} />
      <div className="status-team-columns">
        {groups.map(({ key, members }) => (
          <div
            key={key}
            className="status-team-column"
            style={key !== UNASSIGNED_KEY ? { backgroundColor: teamColor(key) } : undefined}
          >
            {groups.length > 1 && (
              <div className="status-team-label">{key === UNASSIGNED_KEY ? '조 미배정' : `${key}조`}</div>
            )}
            <div className="status-team-members">
              {members.map((p) => (
                <div key={p.id} className={`participant-hp-card ${p.fainted ? 'fainted' : ''}`}>
                  <HPBar current={p.currentHP} max={p.maxHP} label={p.nickname} />
                  <ConditionBadges pokemon={p} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
