// src/components/views/ProfileView.jsx - 탭 추가 버전

import React, { useState } from 'react';
import { User, Settings } from 'lucide-react';
import ProfileSettings from '../settings/ProfileSettings';

export default function ProfileView({ trainer, caughtPokemon, items }) {
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState('info');

  // 포켓몬 카운트
  const caughtCount = caughtPokemon?.filter(p => p !== null && p !== undefined).length || 0;
  const completion = Math.round((caughtCount / 151) * 100);
  
  // 총 탐험 횟수 계산
  const todayWalksUsed = trainer.maxDailyWalks - trainer.dailyWalks;
  
  return (
    <div className="max-w-4xl mx-auto">
      {/* 탭 메뉴 */}
      <div className="bg-white rounded-lg shadow-lg mb-6 overflow-hidden">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'info'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <User className="w-5 h-5" />
            프로필 정보
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-semibold transition-colors ${
              activeTab === 'settings'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-5 h-5" />
            설정
          </button>
        </div>
      </div>

      {/* 프로필 정보 탭 */}
      {activeTab === 'info' && (
        <div className="bg-white rounded-lg border border-gray-200 p-8">
          <div className="flex gap-8 mb-8">
            <div 
              className="w-48 h-48 bg-indigo-500 rounded-lg flex items-center justify-center text-8xl"
              style={{
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            >
              {trainer.name?.charAt(0) || '👦'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h3 className="text-3xl font-bold">{trainer.name}</h3>
                {trainer.isSuperAdmin && (
                  <span className="bg-red-100 text-red-700 text-sm px-3 py-1 rounded-full font-semibold">
                    슈퍼관리자
                  </span>
                )}
                {trainer.isAdmin && !trainer.isSuperAdmin && (
                  <span className="bg-blue-100 text-blue-700 text-sm px-3 py-1 rounded-full font-semibold">
                    관리자
                  </span>
                )}
              </div>
              <p className="text-gray-600 text-lg mb-2">포켓몬 트레이너</p>
              
              <div className="bg-gray-50 rounded-lg p-4 inline-block">
                <div className="text-sm text-gray-600">일일 탐험 설정</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {trainer.maxDailyWalks}회/일
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <div className="text-sm text-gray-600 mb-1">포획한 포켓몬</div>
              <div className="text-4xl font-bold text-blue-600">{caughtCount}마리</div>
            </div>
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <div className="text-sm text-gray-600 mb-1">도감 완성도</div>
              <div className="text-4xl font-bold text-green-600">{completion}%</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-6 border border-purple-200">
              <div className="text-sm text-gray-600 mb-1">오늘 탐험</div>
              <div className="text-4xl font-bold text-purple-600">{todayWalksUsed}회</div>
            </div>
          </div>

          {/* 추가 정보 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">남은 탐험 횟수</span>
                <span className="font-semibold">{trainer.dailyWalks}회</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">보유 금액</span>
                <span className="font-semibold">{trainer.money?.toLocaleString() || 0}원</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">보유 아이템</span>
                <span className="font-semibold">{items?.length || 0}개</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">이메일</span>
                <span className="font-semibold">{trainer.email || '-'}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 설정 탭 */}
      {activeTab === 'settings' && (
        <ProfileSettings trainer={trainer} />
      )}
    </div>
  );
}