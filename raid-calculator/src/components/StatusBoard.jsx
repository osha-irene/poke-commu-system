import HPBar from './HPBar.jsx';
import { STATUS_LABEL, STAT_LABEL } from '../lib/cheers.js';

function describeCondition(p) {
  const parts = [];
  if (p.status) parts.push(STATUS_LABEL[p.status] || p.status);

  Object.entries(p.boosts || {}).forEach(([stat, value]) => {
    if (value) parts.push(`${STAT_LABEL[stat] || stat}${value > 0 ? '+' : ''}${value}`);
  });

  if (p.volatileFlags && p.volatileFlags.length) parts.push(...p.volatileFlags);

  return parts.join(' · ');
}

export default function StatusBoard({ battle }) {
  if (!battle) return null;

  const bossCondition = describeCondition(battle.boss);

  return (
    <section className="panel status-panel">
      <h2>전투 현황</h2>
      <HPBar current={battle.boss.currentHP} max={battle.boss.maxHP} label={`보스: ${battle.boss.nickname}`} />
      {bossCondition && <div className="condition-badge">{bossCondition}</div>}
      <div className="participant-hp-grid">
        {battle.participants.map((p, i) => {
          if (!p) return null;
          const condition = describeCondition(p);
          return (
            <div key={p.id} className={`participant-hp-card ${p.fainted ? 'fainted' : ''}`}>
              <HPBar current={p.currentHP} max={p.maxHP} label={p.nickname || `#${i + 1}`} />
              {condition && <div className="condition-badge">{condition}</div>}
            </div>
          );
        })}
      </div>
    </section>
  );
}
