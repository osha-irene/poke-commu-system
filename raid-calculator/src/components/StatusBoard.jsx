import HPBar from './HPBar.jsx';

export default function StatusBoard({ battle }) {
  if (!battle) return null;

  return (
    <section className="panel status-panel">
      <h2>전투 현황</h2>
      <HPBar current={battle.boss.currentHP} max={battle.boss.maxHP} label={`보스: ${battle.boss.nickname}`} />
      <div className="participant-hp-grid">
        {battle.participants.map((p, i) =>
          p ? (
            <div key={p.id} className={`participant-hp-card ${p.fainted ? 'fainted' : ''}`}>
              <HPBar current={p.currentHP} max={p.maxHP} label={p.nickname || `#${i + 1}`} />
            </div>
          ) : null
        )}
      </div>
    </section>
  );
}
