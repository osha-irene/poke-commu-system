import React from 'react';
import { Gift, Star } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';

function toTs(val) {
  if (!val) return 0;
  if (typeof val === 'number') return val;
  return new Date(val).getTime() || 0;
}

function formatDateLabel(val) {
  if (!val) return '-';
  const d = new Date(val);
  return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function formatDateKey(val) {
  if (!val) return 'unknown';
  const d = new Date(val);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isDone(s) {
  return ['applied', 'completed', 'failed', 'applying'].includes(s.status);
}

function isSuccess(s) {
  if (s.status === 'applied') return s.success !== false;
  if (s.status === 'completed') return s.cookingSuccess !== false;
  return false;
}

function getReward(s) {
  if (s.reward) return s.reward;
  if (s.cookingResult?.stageData) {
    return {
      friendshipBonus: s.cookingResult.stageData.friendshipBonus,
      expBonus: s.cookingResult.stageData.expBonus,
    };
  }
  return null;
}

export default function CampingView({ trainer, campingSessions = [] }) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const mine = campingSessions
    .filter((s) => s.memberId === trainer?.id)
    .sort((a, b) => toTs(b.createdAt) - toTs(a.createdAt));

  const groups = mine.reduce((acc, s) => {
    const key = formatDateKey(s.createdAt);
    if (!acc[key]) acc[key] = { label: formatDateLabel(s.createdAt), sessions: [] };
    acc[key].sessions.push(s);
    return acc;
  }, {});

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? '14px 14px 24px' : '36px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#fff',
            background: '#4a9a08',
            borderRadius: 20,
            padding: '4px 12px',
          }}
        >
          총 캠핑 횟수 {mine.length}회
        </span>
      </div>

      {Object.keys(groups).length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#bbb', fontSize: 14 }}>
          캠핑 기록이 없습니다
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          {Object.entries(groups).map(([key, { label, sessions }]) => (
            <div key={key}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#3a6010',
                    background: 'rgba(255,255,255,0.80)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 20,
                    padding: '3px 12px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {label}
                </div>
                <div style={{ flex: 1, height: 1, background: 'rgba(74,154,8,0.15)' }} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {sessions.map((s) => {
                  const done = isDone(s);
                  const ok = done && isSuccess(s);
                  const reward = ok ? getReward(s) : null;

                  const borderColor = ok ? '#b8e090' : done ? '#f5c6c6' : '#f0d890';
                  const accentColor = ok ? '#4a9a08' : done ? '#c0392b' : '#c07000';
                  const dot = ok ? '✓' : done ? '✗' : '…';

                  return (
                    <div
                      key={s.firebaseKey}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        background: '#fff',
                        borderLeft: `3px solid ${borderColor}`,
                        borderRadius: '0 10px 10px 0',
                        padding: '12px 16px',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          flexShrink: 0,
                          background: ok ? '#eaf6d8' : done ? '#fde8e8' : '#fff9e0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          fontWeight: 900,
                          color: accentColor,
                        }}
                      >
                        {dot}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: accentColor }}>
                            {ok ? '성공' : done ? '실패' : '진행 중'}
                          </span>
                          <span
                            style={{
                              fontSize: 11,
                              color: '#aaa',
                              background: '#f5f5f5',
                              borderRadius: 6,
                              padding: '1px 7px',
                            }}
                          >
                            {s.currentStage ?? 0}단계
                          </span>
                          {s.isDuo && s.partnerName && (
                            <span style={{ fontSize: 11, color: '#9b6fcf' }}>👥 {s.partnerName}</span>
                          )}
                          {s.campingDishLabel && (
                            <span style={{ fontSize: 11, color: '#b07800', fontWeight: 700 }}>{s.campingDishLabel} 떡볶이</span>
                          )}
                        </div>

                        {reward && (
                          <div
                            style={{
                              marginTop: 5,
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: '3px 12px',
                              fontSize: 12,
                              color: '#5a7a40',
                            }}
                          >
                            {reward.friendshipBonus > 0 && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Star size={10} />친밀도 +{reward.friendshipBonus}
                              </span>
                            )}
                            {reward.expBonus > 0 && <span>경험치 +{reward.expBonus}</span>}
                            {reward.dishItem && (
                              <span style={{ color: '#b07800', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Gift size={10} />
                                {reward.dishItem.name}
                              </span>
                            )}
                            {reward.bonusItem && (
                              <span style={{ color: '#b07800', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                <Gift size={10} />
                                {reward.bonusItem.name}
                              </span>
                            )}
                            {reward.egg && <span style={{ color: '#7c3aed', fontWeight: 600 }}>🥚 알 획득</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
