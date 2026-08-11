const STATUS_LABELS = {
  ongoing: '진행 중',
  win: '참가자 승리 (보스 처치)',
  loss: '보스 승리 (참가자 전멸)',
  timeout: '시간 초과 (최대 라운드 도달)',
};

export default function ResultSummary({ battle }) {
  const totalDamageToBoss = battle.boss.maxHP - battle.boss.currentHP;
  const faintedCount = battle.participants.filter((p) => p && p.fainted).length;
  const aliveCount = battle.participants.filter((p) => p && !p.fainted).length;

  return (
    <section className="panel result-panel">
      <h2>결과</h2>
      <div className="result-grid">
        <div>
          상태: <strong>{STATUS_LABELS[battle.status] || battle.status}</strong>
        </div>
        <div>진행 라운드: {battle.round}</div>
        <div>
          보스 누적 데미지: {totalDamageToBoss} / {battle.boss.maxHP}
        </div>
        <div>
          기절한 참가자: {faintedCount}명 · 생존: {aliveCount}명
        </div>
      </div>
    </section>
  );
}
