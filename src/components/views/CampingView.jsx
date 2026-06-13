import React from 'react';
import { Tent, CheckCircle, XCircle, Clock } from 'lucide-react';

const STATUS_LABEL = {
  completed:             '완료',
  waiting_for_mastodon:  '진행 중',
  applied:               '신청됨',
  failed:                '실패',
};

function getStatusColor(status, cookingSuccess) {
  if (status === 'completed') return cookingSuccess ? '#4a9a08' : '#c0392b';
  if (status === 'waiting_for_mastodon') return '#e67e22';
  return '#888';
}

function formatDate(ts) {
  if (!ts) return '-';
  const d = new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

export default function CampingView({ trainer, campingSessions = [] }) {
  const mySessions = campingSessions
    .filter(s => s.memberId === trainer?.id && s.status !== 'applied')
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', padding: '32px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <Tent size={22} style={{ color: '#4a9a08' }} />
        <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1a2e10', margin: 0 }}>캠핑 기록</h2>
        <span style={{ fontSize: 13, color: '#5a7a40', marginLeft: 4 }}>({mySessions.length}회)</span>
      </div>

      {mySessions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 0', color: '#888', fontSize: 14 }}>
          캠핑 기록이 없습니다
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {mySessions.map(session => {
            const statusColor = getStatusColor(session.status, session.cookingSuccess);
            const isCompleted = session.status === 'completed';
            const success = session.cookingSuccess;

            return (
              <div
                key={session.firebaseKey}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: '#fff',
                  border: '1px solid #e8f0dc',
                  borderRadius: 12,
                  padding: '14px 18px',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
                }}
              >
                {/* 아이콘 */}
                <div style={{ flexShrink: 0 }}>
                  {isCompleted && success  && <CheckCircle size={22} style={{ color: '#4a9a08' }} />}
                  {isCompleted && !success && <XCircle size={22} style={{ color: '#c0392b' }} />}
                  {!isCompleted           && <Clock size={22} style={{ color: '#e67e22' }} />}
                </div>

                {/* 단계 */}
                <div style={{ flexShrink: 0, minWidth: 52, textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#1a2e10', lineHeight: 1 }}>
                    {session.currentStage ?? '-'}
                  </div>
                  <div style={{ fontSize: 11, color: '#5a7a40', marginTop: 2 }}>단계</div>
                </div>

                {/* 결과 */}
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: statusColor }}>
                    {isCompleted
                      ? (success ? '성공' : '실패')
                      : (STATUS_LABEL[session.status] || session.status)}
                  </div>
                  {isCompleted && success && session.cookingResult?.stageData && (
                    <div style={{ fontSize: 12, color: '#5a7a40', marginTop: 2 }}>
                      친밀도 +{session.cookingResult.stageData.friendshipBonus}
                      {' · '}
                      경험치 +{session.cookingResult.stageData.expBonus}
                    </div>
                  )}
                  {session.isDuo && session.partnerName && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                      파트너: {session.partnerName}
                    </div>
                  )}
                </div>

                {/* 날짜 */}
                <div style={{ flexShrink: 0, fontSize: 12, color: '#aaa', textAlign: 'right' }}>
                  {formatDate(session.createdAt)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
