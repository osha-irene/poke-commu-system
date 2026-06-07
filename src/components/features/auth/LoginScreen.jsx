// src/components/features/auth/LoginScreen.jsx
// 배경 이미지:         LOGIN.backgroundImage       (styles/layout.js)
// 카드 배경 이미지:    LOGIN.cardBackgroundImage   (styles/layout.js)
// 타이틀 이미지:       LOGIN.titleImage            (styles/layout.js)

import React, { useState } from 'react';
import { LOGIN, buildBgStyle } from '../../../styles';

export default function LoginScreen({ onLogin, onRegister }) {
  const [mode, setMode]         = useState('login');
  const [userId, setUserId]     = useState('');
  const [password, setPassword] = useState('');
  const [name, setName]         = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (mode === 'login') {
      await onLogin(userId, password);
    } else {
      if (!name) { alert('이름을 입력해주세요.'); return; }
      const success = await onRegister(userId, password, name);
      if (success) {
        setMode('login');
        setUserId(''); setPassword(''); setName('');
      }
    }
  };

  // 전체 배경 style
  const rootBgStyle = buildBgStyle(LOGIN);

  // 카드 배경 style
  const cardBgStyle = LOGIN.cardBackgroundImage
    ? {
        backgroundImage:    `url(${LOGIN.cardBackgroundImage})`,
        backgroundSize:     LOGIN.cardBackgroundSize     ?? 'cover',
        backgroundPosition: LOGIN.cardBackgroundPosition ?? 'center',
        backgroundRepeat:   'no-repeat',
      }
    : {};

  return (
    <div className={LOGIN.root} style={rootBgStyle}>

      {/* 전체 배경 오버레이 */}
      {LOGIN.overlayColor && (
        <div style={{
          position: 'fixed', inset: 0,
          backgroundColor: LOGIN.overlayColor,
          pointerEvents: 'none', zIndex: 0,
        }} />
      )}

      <div
        className={LOGIN.card}
        style={{ ...cardBgStyle, position: 'relative', zIndex: 1 }}
      >
        {/* 카드 오버레이 */}
        {LOGIN.cardOverlayColor && (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundColor: LOGIN.cardOverlayColor,
            borderRadius: 'inherit',
            pointerEvents: 'none', zIndex: 0,
          }} />
        )}

        {/* 카드 내부 콘텐츠 */}
        <div style={{ position: 'relative', zIndex: 1 }}>

          {/* 타이틀 — LOGIN.titleImage 있으면 이미지, 없으면 텍스트 */}
          <div className="text-center mb-8">
            {LOGIN.titleImage ? (
              <img src={LOGIN.titleImage} alt="포켓몬 탐험" className={LOGIN.titleImageClass} />
            ) : (
              <h1 className={LOGIN.title}>포켓몬 탐험</h1>
            )}
            <p className={LOGIN.subtitle}>커뮤니티 시스템</p>
          </div>

          {/* 로그인 / 회원가입 탭 */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setMode('login')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              로그인
            </button>
            <button
              onClick={() => setMode('register')}
              className={`flex-1 py-2 rounded-lg font-semibold transition-colors ${
                mode === 'register'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
              <input
                type="text"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="아이디를 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="비밀번호 (6자 이상)"
                required
              />
            </div>

            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="이름을 입력하세요"
                  required
                />
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                mode === 'login'
                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {mode === 'login' ? '로그인' : '회원가입'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
