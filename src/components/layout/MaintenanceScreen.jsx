// src/components/layout/MaintenanceScreen.jsx
// 배경 이미지: SCREEN.maintenance.backgroundImage (styles/layout.js)
// 아이콘 이미지: SCREEN.maintenance.iconImage (null 이면 Wrench 아이콘 사용)

import React from 'react';
import { Wrench } from 'lucide-react';
import { SCREEN, buildBgStyle } from '../../styles';

export default function MaintenanceScreen({ onLogout }) {
  const t       = SCREEN.maintenance;
  const bgStyle = buildBgStyle(t);

  return (
    <div className={t.root} style={bgStyle}>

      {/* 배경 오버레이 */}
      {t.overlayColor && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: t.overlayColor,
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}

      <div className={t.card} style={{ position: 'relative', zIndex: 1 }}>
        {t.iconImage ? (
          <img src={t.iconImage} alt="점검 중" className={t.iconImageClass} />
        ) : (
          <Wrench size={48} className="text-gray-400 mx-auto mb-4" />
        )}
        <h2 className={t.title}>시스템 점검 중</h2>
        <p className={t.body}>
          현재 시스템 점검이 진행 중입니다.<br />
          잠시 후 다시 접속해주세요.
        </p>
        <button onClick={onLogout} className={t.button}>
          로그아웃
        </button>
      </div>
    </div>
  );
}
