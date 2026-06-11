// src/components/layout/MobileLayout.jsx
import React, { useEffect, useRef, useState } from 'react';
import { 
  Menu, X, Map, Users, Bot, BookOpen, Smile, Package, 
  ShoppingBag, ChefHat, User, MessageSquare, Settings, 
  LogOut, Volume2, VolumeX, Footprints, Coins, Tent, ChevronDown, Home, Sword
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
  const [trainerOpen, setTrainerOpen] = useState(true);
  const [adventureOpen, setAdventureOpen] = useState(true);
  const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = Math.max(0, window.scrollY);
      const delta = currentScrollY - lastScrollYRef.current;

      if (currentScrollY < 24) {
        setIsBottomNavHidden(false);
      } else if (delta > 8) {
        setIsBottomNavHidden(true);
      } else if (delta < -8) {
        setIsBottomNavHidden(false);
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, []);

  useEffect(() => {
    setIsBottomNavHidden(false);
    lastScrollYRef.current = window.scrollY;
  }, [currentTab]);

  const titleMap = {
    home: { label: '메인', icon: Home },
    map: { label: '지도(포켓몬포획)', icon: Map },
    members: { label: '멤버', icon: Users },
    npcs: { label: 'NPC', icon: Bot },
    pokedex: { label: '포켓몬 도감', icon: BookOpen },
    pokemon: { label: '포켓몬', icon: Smile },
    items: { label: '아이템', icon: Package },
    shop: { label: '상점', icon: ShoppingBag },
    camping: { label: '캠핑', icon: Tent },
    cooking: { label: '요리', icon: ChefHat },
    profile: { label: '프로필', icon: User },
    qna: { label: 'Q&A', icon: MessageSquare },
    admin: { label: '관리자', icon: Settings },
    battle: { label: '배틀', icon: Sword }
  };

  const CurrentTitleIcon = titleMap[currentTab]?.icon || Menu;

  const adventureItems = [
    { id: 'map', icon: Map, label: '지도(포켓몬포획)' },
    { id: 'camping', icon: Tent, label: '캠핑' },
    { id: 'cooking', icon: ChefHat, label: '요리' }
  ];

  const trainerItems = [
    { id: 'items', icon: Package, label: '가방' },
    { id: 'pokemon', icon: Smile, label: '엔트리(포켓몬)' }
  ];

  const menuItems = [];

  const handleMenuClick = (tabId) => {
    setCurrentTab(tabId);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-transparent text-green-950 overflow-x-hidden">
      {/* 상단 헤더 */}
      <header className="bg-[#f7fbec]/95 border-b border-lime-300 px-4 py-3 flex items-center justify-between sticky top-0 z-40 backdrop-blur">
        <button
          onClick={() => setMenuOpen(true)}
          className="p-2 hover:bg-lime-100 rounded-lg transition-colors"
        >
          <Menu size={24} className="text-green-900" />
        </button>
        
        <h1 className="text-lg font-bold text-green-950 flex items-center gap-2">
          <CurrentTitleIcon size={20} />
          {titleMap[currentTab]?.label || '메뉴'}
        </h1>
        
        <div className="bg-lime-100 px-3 py-1 rounded-lg border border-lime-300">
          <span className="text-xs font-bold text-green-800 flex items-center gap-1">
            <Footprints size={14} />
            {trainer.dailyWalks}/{trainer.maxDailyWalks}
          </span>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="flex-1 overflow-visible">
        {children}
      </main>

      {/* 하단 네비게이션 바 */}
      <nav className={`mobile-bottom-nav bg-[#f7fbec]/95 border-t border-lime-300 px-2 py-2 flex justify-around items-center bottom-0 z-40 backdrop-blur ${isBottomNavHidden ? 'is-hidden' : ''}`}>
        {[
          { id: 'home', icon: Home },
          { id: 'map', icon: Map },
          { id: 'pokemon', icon: Smile },
          { id: 'items', icon: Package },
          { id: 'shop', icon: ShoppingBag }
        ].map(({ id, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setCurrentTab(id)}
            className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all min-w-[60px] ${
              currentTab === id
                ? 'text-green-950 bg-lime-200'
                : 'text-green-700'
            }`}
          >
            <Icon size={24} />
            <span className="text-xs font-semibold mt-1">
              {titleMap[id]?.label || id}
            </span>
          </button>
        ))}
      </nav>

      {/* 햄버거 메뉴 */}
      {menuOpen && (
        <>
          {/* 오버레이 */}
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-[100000]"
            onClick={() => setMenuOpen(false)}
          />
          
          {/* 메뉴 패널 */}
          <aside className="fixed top-0 left-0 h-full w-64 bg-[#f7fbec] shadow-2xl z-[100001] flex flex-col animate-slide-in">
            {/* 메뉴 헤더 */}
            <div className="border-b-2 border-lime-300 bg-white/95 text-green-950 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">메뉴</h2>
                <button
                  onClick={() => setMenuOpen(false)}
                  className="p-1 hover:bg-lime-100/70 rounded-lg transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
              
              <div className="text-sm opacity-90">
                <p className="font-semibold">{trainer.name}</p>
                <p className="text-lime-700 flex items-center gap-1">
                  <Coins size={14} />
                  {trainer.money?.toLocaleString()}원
                </p>
              </div>
            </div>

            {/* 사운드 토글 */}
            <div className="p-4 border-b border-gray-200">
              <button
                onClick={toggleSound}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-colors ${
                  soundEnabled
                    ? 'bg-lime-100 text-green-800 hover:bg-lime-200'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
                <span>{soundEnabled ? '사운드 ON' : '사운드 OFF'}</span>
              </button>
            </div>

            {/* 네비게이션 메뉴 */}
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
              <button
                onClick={() => handleMenuClick('home')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  currentTab === 'home'
                    ? 'bg-lime-100 text-lime-800'
                    : 'text-gray-700 hover:bg-lime-50'
                }`}
              >
                <Home size={20} />
                <span>메인</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => {
                    setCurrentTab('profile');
                    setTrainerOpen((open) => !open);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                    currentTab === 'profile' || trainerItems.some((item) => item.id === currentTab)
                      ? 'bg-lime-100 text-lime-800'
                      : 'text-gray-700 hover:bg-lime-50'
                  }`}
                >
                  <User size={20} />
                  <span className="flex-1 text-left">트레이너카드</span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${trainerOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {trainerOpen && (
                  <div className="mt-1 space-y-1 pl-5">
                    {trainerItems.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => handleMenuClick(id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                          currentTab === id
                            ? 'bg-lime-100 text-lime-800'
                            : 'text-gray-600 hover:bg-lime-50'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleMenuClick('pokedex')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  currentTab === 'pokedex'
                    ? 'bg-lime-100 text-lime-800'
                    : 'text-gray-700 hover:bg-lime-50'
                }`}
              >
                <BookOpen size={20} />
                <span>도감</span>
              </button>

              <div>
                <button
                  type="button"
                  onClick={() => setAdventureOpen((open) => !open)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                    adventureItems.some((item) => item.id === currentTab)
                      ? 'bg-lime-100 text-lime-800'
                      : 'text-gray-700 hover:bg-lime-50'
                  }`}
                >
                  <Map size={20} />
                  <span className="flex-1 text-left">모험</span>
                  <ChevronDown
                    size={18}
                    className={`transition-transform ${adventureOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {adventureOpen && (
                  <div className="mt-1 space-y-1 pl-5">
                    {adventureItems.map(({ id, icon: Icon, label }) => (
                      <button
                        key={id}
                        onClick={() => handleMenuClick(id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      currentTab === id
                        ? 'bg-lime-100 text-lime-800'
                        : 'text-gray-600 hover:bg-lime-50'
                        }`}
                      >
                        <Icon size={18} />
                        <span>{label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => handleMenuClick('shop')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  currentTab === 'shop'
                    ? 'bg-lime-100 text-lime-800'
                    : 'text-gray-700 hover:bg-lime-50'
                }`}
              >
                <ShoppingBag size={20} />
                <span>상점</span>
              </button>

              <button
                onClick={() => handleMenuClick('qna')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                  currentTab === 'qna'
                    ? 'bg-lime-100 text-lime-800'
                    : 'text-gray-700 hover:bg-lime-50'
                }`}
              >
                <MessageSquare size={20} />
                <span>Q&A</span>
              </button>

              {menuItems.filter(({ id }) => !['pokedex'].includes(id)).map(({ id, icon: Icon, label }) => (
                <button
                  key={id}
                  onClick={() => handleMenuClick(id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                    currentTab === id
                      ? 'bg-lime-100 text-lime-800'
                      : 'text-gray-700 hover:bg-lime-50'
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
                        ? 'bg-lime-100 text-lime-800'
                        : 'text-gray-700 hover:bg-lime-50'
                    }`}
                  >
                    <Settings size={20} />
                    <span>관리자</span>
                  </button>
                  <button
                    onClick={() => handleMenuClick('battle')}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all ${
                      currentTab === 'battle'
                        ? 'bg-lime-100 text-lime-800'
                        : 'text-gray-700 hover:bg-lime-50'
                    }`}
                  >
                    <Sword size={20} />
                    <span>배틀</span>
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
