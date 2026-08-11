export default function HPBar({ current, max, label }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (current / max) * 100)) : 0;
  const colorClass = pct > 50 ? 'hp-high' : pct > 20 ? 'hp-mid' : 'hp-low';

  return (
    <div className="hp-bar">
      {label && <div className="hp-bar-label">{label}</div>}
      <div className="hp-bar-track">
        <div className={`hp-bar-fill ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="hp-bar-text">
        {current} / {max}
      </div>
    </div>
  );
}
