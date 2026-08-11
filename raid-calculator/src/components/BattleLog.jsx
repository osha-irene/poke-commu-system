import { useEffect, useRef } from 'react';

export default function BattleLog({ entries }) {
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [entries.length]);

  return (
    <section className="panel log-panel">
      <h2>전투 로그</h2>
      <div className="battle-log">
        {entries.length === 0 && <div className="log-empty">아직 로그가 없습니다. 전투를 시작하세요.</div>}
        {entries.map((entry, i) => (
          <div key={i} className={`log-entry log-${entry.phase}`}>
            {entry.text}
          </div>
        ))}
        <div ref={endRef} />
      </div>
    </section>
  );
}
