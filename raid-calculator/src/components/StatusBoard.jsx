import HPBar from './HPBar.jsx';

const STATUS_LABELS = { brn: '화상', par: '마비', psn: '독', tox: '맹독', slp: '수면', frz: '냉동' };

function statusBadges(p) {
  const badges = [];
  if (p.status) badges.push({ text: STATUS_LABELS[p.status] || p.status, kind: 'status' });
  if (p.confusionTurns > 0) badges.push({ text: '혼란', kind: 'status' });
  if (p.leechSeed) badges.push({ text: '씨뿌리기', kind: 'status' });
  if (p.bindTurns > 0) badges.push({ text: '조이기', kind: 'status' });
  if (p.tauntTurns > 0) badges.push({ text: '도발', kind: 'status' });
  if (p.encoreTurns > 0) badges.push({ text: '앵콜', kind: 'status' });
  if (p.tormentActive) badges.push({ text: '트집', kind: 'status' });
  if (p.healBlockTurns > 0) badges.push({ text: '회복봉인', kind: 'status' });
  if (p.attractActive) badges.push({ text: '헤롱헤롱', kind: 'status' });
  if (p.disableTurns > 0) badges.push({ text: '사슬묶임', kind: 'status' });
  if (p.boosts?.atk > 0 || p.boosts?.spa > 0) badges.push({ text: '공↑' });
  if (p.boosts?.def > 0 || p.boosts?.spd > 0) badges.push({ text: '방↑' });
  if (p.redirectActive) badges.push({ text: '보호중' });
  if (p.mustSkipTurn) badges.push({ text: '행동불가' });
  if (p.cheerUsed > 0) badges.push({ text: `응원 ${p.cheerUsed}/2` });
  return badges;
}

export default function StatusBoard({ battle }) {
  if (!battle) return null;

  const bossBadges = statusBadges(battle.boss);

  return (
    <section className="panel status-panel">
      <h2>전투 현황</h2>
      <HPBar current={battle.boss.currentHP} max={battle.boss.maxHP} label={`보스: ${battle.boss.nickname}`} />
      {bossBadges.length > 0 && (
        <div className="badge-row">
          {bossBadges.map((b) => (
            <span key={b.text} className={`badge ${b.kind === 'status' ? 'badge-status' : ''}`}>
              {b.text}
            </span>
          ))}
        </div>
      )}
      <div className="participant-hp-grid">
        {battle.participants.map((p, i) =>
          p ? (
            <div key={p.id} className={`participant-hp-card ${p.fainted ? 'fainted' : ''}`}>
              <HPBar current={p.currentHP} max={p.maxHP} label={p.nickname || `#${i + 1}`} />
              {statusBadges(p).length > 0 && (
                <div className="badge-row">
                  {statusBadges(p).map((b) => (
                    <span key={b.text} className={`badge ${b.kind === 'status' ? 'badge-status' : ''}`}>
                      {b.text}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null
        )}
      </div>
    </section>
  );
}
