import React from 'react';

export default function Header({ currentTab, trainer }) {
  const titles = {
    map: '🗺️ 지도',
    pokedex: '📖 포켓몬 도감',
    pokemon: '👥 내 포켓몬',
    items: '🎒 아이템',
    profile: '👤 프로필',
    admin: '⚙️ 관리자 패널'
  };

  return (
    <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between">
      <h2 className="text-2xl font-bold text-gray-800">{titles[currentTab]}</h2>
      
      <div className="bg-green-50 px-5 py-2 rounded-lg border border-green-200">
        <span className="text-sm font-bold text-green-700">
          🚶 오늘의 탐험: {trainer.dailyWalks}/{trainer.maxDailyWalks}
        </span>
      </div>
    </header>
  );
}