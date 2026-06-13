import React from 'react';
import logoCompass from '../../assets/logo_compass.png';
import logoText from '../../assets/logo_text.png';
import forestBg from '../../assets/forest-bg.png';

export default function MaintenanceScreen({ onLogout }) {
  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundImage: `url(${forestBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
    }}>
      {/* 어두운 블러 오버레이 */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundColor: 'rgba(10, 20, 10, 0.55)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
      }} />

      <img src={logoCompass} alt="" style={{
        position: 'absolute',
        width: 360, height: 360,
        top: 'calc(50% - 20px)', left: '50%',
        transform: 'translate(-50%, -62%)',
        mixBlendMode: 'overlay',
        pointerEvents: 'none',
      }} />

      <img src={logoText} alt="사이트명" style={{
        position: 'absolute',
        width: 390,
        top: 'calc(52.8% - 20px)', left: '49.4%',
        transform: 'translate(-50%, -90%)',
        objectFit: 'contain',
        pointerEvents: 'none',
      }} />

      {/* 하단 텍스트 + 버튼 */}
      <div style={{
        position: 'absolute',
        top: '50%', left: '50%',
        transform: 'translate(-50%, 110%)',
        textAlign: 'center',
      }}>
        <p style={{
          color: 'rgba(255,255,255,0.88)',
          fontSize: 21,
          lineHeight: 1.6,
          letterSpacing: '0.06em',
          marginBottom: 28,
        }}>
          시스템 점검 중입니다.<br />
          잠시 후 다시 접속해주세요.
        </p>

        {onLogout && (
          <button
            onClick={onLogout}
            style={{
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.3)',
              color: '#fff',
              borderRadius: 8,
              padding: '8px 24px',
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: '0.05em',
            }}
          >
            로그아웃
          </button>
        )}
      </div>
    </div>
  );
}
