// src/components/layout/LoadingScreen.jsx
// 배경 이미지: SCREEN.loading.backgroundImage (styles/layout.js)
// 스피너 이미지: SCREEN.loading.spinnerImage (null 이면 Loader 아이콘 사용)

import React from 'react';
import { Loader } from 'lucide-react';
import { SCREEN, buildBgStyle } from '../../styles';

export default function LoadingScreen() {
  const t       = SCREEN.loading;
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

      <div className={t.inner} style={{ position: 'relative', zIndex: 1 }}>
        {t.spinnerImage ? (
          <img src={t.spinnerImage} alt="로딩 중" className={t.spinnerImageClass} />
        ) : (
          <Loader size={48} className="animate-spin text-indigo-500 mx-auto mb-4" />
        )}
        <p className={t.text}>로딩 중...</p>
      </div>
    </div>
  );
}
