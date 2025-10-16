// src/components/layout/MobileLayout.jsx
import React, { useState } from 'react';
import { 
  Menu, X, Map, Users, Bot, BookOpen, Smile, Package, 
  ShoppingBag, ChefHat, User, MessageSquare, Settings, 
  LogOut, Volume2, VolumeX 
} from 'lucide-react';

export default function MobileLayout({ 
  currentTab, 
  setCurrentTab, 
  trainer, 
  isAdmin,
  soundEnabled,
  toggleSound,
  onLogout,
  children 
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const titles = {
    map: '🗺️ 지도',
    members: '👥 멤버',
    npcs: '🤖 NPC',
    pokedex: '📖 포켓몬 도감',
    pokemon: '👾 포켓몬',
    items: '🎒 아이템',
    shop: '🏪 상점',
    cooking: '🍳 요리',
    profile: '👤 프로필',
    qna: '💬 Q&A',
    admin: '⚙️ 관리자'
  };

  const menuItems = [
    { id: 'map', icon: Map, label: '지도' },
    { id: 'members', icon: Users, label: '멤버' },
    { id: 'npcs', icon: Bot, label: 'NPC' },
    { id: 'pokedex', icon: BookOpen, label: '도감' },
    { id: 'pokemon', icon: Smile, label: '포켓몬' },
    { id: 'items', icon: Package, label: '아이템' },
    { id: 'shop', icon: ShoppingBag, label: '상점' },
    { id: 'cooking', icon: ChefHat, label: '요리' },
    { id: 'profile', icon: User, label: '프로필' },
    { id: 'qna', icon: MessageSquare, label: 'Q&A' }
  ];

  const handleMenuClick = (tabId) => {
    setCurrentTab(tabId);
    setMenuOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      {/* 상단 헤더 */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={24} className="text-gray-700" />
        </button>
        
        <h1 className="text-lg font-bold text-gray-800">
          {titles[currentTab]}
        </h1>
        
        <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
          <span className="text-xs font-bold text-green-700">
            🚶 {trainer.dailyWalks}/{trainer.maxDailyWalks}
          </span>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>

      {/* 하단 네비게이션 바 */}
      <nav className="bg-white border-t border-gray-200 px-2 py-2 flex justify-around items-center sticky bottom-0 z-40">
        {[
          { id: 'map', icon: Map },
          { id: 'pokemon', icon: Smile },
          { id: 'items', icon: Package },
          { id: 'shop', icon: ShoppingBag },
          { id: 'profile', icon: User }
        ].map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[60px] ${
              currentTab === id
                ? 'text-indigo-600 bg-indigo-50'
                : 'text-gray-500'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs font-semibold mt-1">
              {titles[id].split(' ')[1]}
            </span>
          </button>
        ))}
      </nav>

      {/* 햄버거 메뉴 */}
      {menuOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* 메뉴 패널 */}
          <aside className="fixed top-0 left-0 h-full w-64 bg-white shadow-2xl z-50 flex flex-col animate-slide-in">
            {/* 메뉴 헤더 */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">메뉴</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="text-sm opacity-90">
                <p className="font-semibold">{trainer.name}</p>
                <p className="text-indigo-200">💰 {trainer.money?.toLocaleString()}원</p>
              </div>
            </div>

            {/* 사운드 토글 */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={toggleSound}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  soundEnabled
                    ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span>{soundEnabled ? '사운드 ON' : '사운드 OFF'}</span>
              </button>
            </div>

            {/* 네비게이션 메뉴 */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              {menuItems.map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleMenuClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                    currentTab === id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span>{label}</span>
                </button>
              ))}

              {isAdmin && (
                <>
                  <div className="border-t border-gray-300 my-4 pt-2"></div>
                  <button
                    onClick={() => handleMenuClick('admin')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                      currentTab === 'admin'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Settings size={20} />
                    <span>관리자</span>
                  </button>
                </>
              )}
            </nav>

            {/* 로그아웃 버튼 */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <LogOut size={18} />
                <span>로그아웃</span>
              </button>
            </div>
          </aside>
        </>
      )}

      <style jsx>{`
        @keyframes slide-in {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}