// src/components/layout/MobileLayout.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  Menu, X, Map, Users, Bot, BookOpen, Smile, Package,
  ShoppingBag, ChefHat, User, MessageSquare, Settings,
  LogOut, Volume2, VolumeX, Footprints, Coins, Tent, Home, Sword, ChevronRight
} from 'lucide-react';
import pokeballImg from '../../assets/pokeball.png';

const P = {
  bg:          'rgba(18,32,18,0.88)',
  bgDrawer:    'rgba(14,26,14,0.95)',
  border:      'rgba(120,175,60,0.28)',
  textPrimary: 'rgba(225,248,185,0.97)',
  textMuted:   'rgba(170,215,120,0.75)',
  accent:      'rgba(185,240,90,1.0)',
  accentBg:    'rgba(90,155,35,0.28)',
  inactive:    'rgba(170,210,125,0.7)',
};

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
  const [isBottomNavHidden, setIsBottomNavHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    lastScrollYRef.current = window.scrollY;
    const handleScroll = () => {
      const y = Math.max(0, window.scrollY);
      const d = y - lastScrollYRef.current;
      if (y < 24)      setIsBottomNavHidden(false);
      else if (d > 8)  setIsBottomNavHidden(true);
      else if (d < -8) setIsBottomNavHidden(false);
      lastScrollYRef.current = y;
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
    home:    { label: '메인',     icon: Home },
    map:     { label: '지도',     icon: Map },
    members: { label: '멤버',     icon: Users },
    npcs:    { label: 'NPC',      icon: Bot },
    pokedex: { label: '도감',     icon: BookOpen },
    pokemon: { label: '포켓몬',   icon: Smile },
    items:   { label: '아이템',   icon: Package },
    shop:    { label: '상점',     icon: ShoppingBag },
    camping: { label: '캠핑',     icon: Tent },
    cooking: { label: '요리',     icon: ChefHat },
    profile: { label: '트레이너', icon: User },
    qna:     { label: 'Q&A',      icon: MessageSquare },
    admin:   { label: '관리자',   icon: Settings },
    battle:  { label: '배틀',     icon: Sword },
  };

  const bottomNavItems = [
    { id: 'pokemon', icon: null, pokeball: true },
    { id: 'items',   icon: Package },
    { id: 'home',    icon: Home },
    { id: 'map',     icon: Map },
    { id: 'shop',    icon: ShoppingBag },
  ];

  const menuGroups = [
    {
      label: null,
      items: [
        { id: 'home',    icon: Home,          label: '메인' },
        { id: 'members', icon: Users,         label: '멤버' },
        { id: 'pokedex', icon: BookOpen,      label: '포켓몬 도감' },
        { id: 'qna',     icon: MessageSquare, label: 'Q&A' },
      ],
    },
    {
      label: '트레이너',
      items: [
        { id: 'profile', icon: User,    label: '트레이너 카드' },
        { id: 'pokemon', icon: Smile,   label: '포켓몬' },
        { id: 'items',   icon: Package, label: '아이템' },
      ],
    },
    {
      label: '모험',
      items: [
        { id: 'map',     icon: Map,         label: '지도 (포획)' },
        { id: 'camping', icon: Tent,        label: '캠핑' },
        { id: 'cooking', icon: ChefHat,     label: '요리' },
        { id: 'shop',    icon: ShoppingBag, label: '상점' },
      ],
    },
    ...(isAdmin ? [{
      label: '관리',
      items: [
        { id: 'admin',  icon: Settings, label: '관리자 패널' },
        { id: 'battle', icon: Sword,    label: '배틀' },
      ],
    }] : []),
  ];

  const handleMenuClick = (tabId) => { setCurrentTab(tabId); setMenuOpen(false); };

  return (
    <div style={{ minHeight: '100svh', display: 'flex', flexDirection: 'column', background: 'transparent', color: P.textPrimary, overflowX: 'hidden' }}>

      {/* ── 플로팅 메뉴 버튼 ── */}
      <button
        onClick={() => setMenuOpen(true)}
        style={{
          position: 'fixed', top: 14, left: 14, zIndex: 38,
          width: 40, height: 40, borderRadius: 10,
          background: P.bg,
          border: `1px solid ${P.border}`,
          boxShadow: '0 2px 10px rgba(0,0,0,0.4)',
          backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
          cursor: 'pointer', color: P.inactive,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        <Menu size={20} />
      </button>

      {/* ── 콘텐츠 ── */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* ── 하단 네비 (아이콘만) ── */}
      <nav className={`mobile-bottom-nav ${isBottomNavHidden ? 'is-hidden' : ''}`} style={{
        display: 'flex', justifyContent: 'space-around', alignItems: 'center',
        padding: '8px 4px',
        background: P.bg,
        backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        borderTop: `1px solid ${P.border}`,
        boxShadow: '0 -2px 16px rgba(0,0,0,0.5)',
        transition: 'transform 0.28s ease, opacity 0.28s ease',
        zIndex: 40,
      }}>
        {bottomNavItems.map(({ id, icon: Icon, pokeball }) => {
          const active = currentTab === id;
          return (
            <button key={id} onClick={() => setCurrentTab(id)} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 44, height: 44, borderRadius: 12, border: 'none', cursor: 'pointer',
              background: active ? P.accentBg : 'transparent',
              transition: 'all 0.18s ease',
            }}>
              {pokeball ? (
                <img
                  src={pokeballImg}
                  alt="포켓몬"
                  style={{
                    width: 18, height: 18,
                    opacity: active ? 1 : 0.55,
                    transition: 'opacity 0.18s ease',
                  }}
                />
              ) : (
                <Icon size={id === 'home' ? 28 : 24} color={active ? P.accent : P.inactive} />
              )}
            </button>
          );
        })}
      </nav>

      {/* ── 드로어 ── */}
      {menuOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100000, backdropFilter: 'blur(2px)' }}
            onClick={() => setMenuOpen(false)}
          />
          <aside style={{
            position: 'fixed', top: 0, left: 0, height: '100%', width: 272,
            background: P.bgDrawer,
            borderRight: `1px solid ${P.border}`,
            boxShadow: '4px 0 32px rgba(0,0,0,0.7)',
            zIndex: 100001, display: 'flex', flexDirection: 'column',
            animation: 'mob-slide-in 0.24s ease-out',
          }}>

            {/* 드로어 헤더 */}
            <div style={{
              padding: '20px 20px 16px',
              borderBottom: `1px solid ${P.border}`,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
            }}>
              <div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: P.textPrimary, letterSpacing: '0.03em' }}>
                  {trainer.name}
                </p>
                <p style={{ margin: '5px 0 0', fontSize: 13, color: P.textMuted, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <Coins size={13} />
                  {trainer.money?.toLocaleString()}원
                </p>
                {/* 탐험 횟수 */}
                <div style={{
                  marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 5,
                  background: P.accentBg, border: `1px solid ${P.border}`,
                  borderRadius: 20, padding: '4px 10px',
                }}>
                  <Footprints size={13} style={{ color: P.accent }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: P.accent }}>
                    탐험 {trainer.dailyWalks}/{trainer.maxDailyWalks}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setMenuOpen(false)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: P.inactive, padding: 4, marginTop: -2 }}
              >
                <X size={22} />
              </button>
            </div>

            {/* 사운드 */}
            <div style={{ padding: '10px 14px', borderBottom: `1px solid ${P.border}` }}>
              <button onClick={toggleSound} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: soundEnabled ? P.accentBg : 'rgba(50,50,50,0.2)',
                color: soundEnabled ? P.accent : P.inactive,
                fontSize: 13, fontWeight: 600, transition: 'all 0.18s',
              }}>
                {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
                {soundEnabled ? '사운드 ON' : '사운드 OFF'}
              </button>
            </div>

            {/* 메뉴 그룹 */}
            <nav className="mob-drawer-nav" style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {menuGroups.map((group, gi) => (
                <div key={gi} style={{ marginBottom: 4 }}>
                  {group.label && (
                    <p style={{ margin: '12px 8px 4px', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', color: P.textMuted, textTransform: 'uppercase' }}>
                      {group.label}
                    </p>
                  )}
                  {group.items.map(({ id, icon: Icon, label }) => {
                    const active = currentTab === id;
                    return (
                      <button key={id} onClick={() => handleMenuClick(id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: active ? P.accentBg : 'transparent',
                        color: active ? P.accent : P.textMuted,
                        fontSize: 13, fontWeight: active ? 700 : 500,
                        textAlign: 'left', transition: 'all 0.15s',
                        borderLeft: `2px solid ${active ? P.accent : 'transparent'}`,
                      }}>
                        <Icon size={17} style={{ flexShrink: 0 }} />
                        <span style={{ flex: 1 }}>{label}</span>
                        {active && <ChevronRight size={14} style={{ opacity: 0.5 }} />}
                      </button>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* 로그아웃 */}
            <div style={{ padding: '12px 16px', borderTop: `1px solid ${P.border}` }}>
              <button onClick={() => { setMenuOpen(false); onLogout(); }} style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '10px 14px', borderRadius: 8,
                border: '1px solid rgba(180,60,60,0.25)',
                background: 'rgba(120,30,30,0.15)', color: 'rgba(215,120,110,0.85)',
                fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              }}>
                <LogOut size={15} />
                로그아웃
              </button>
            </div>
          </aside>
        </>
      )}

      <style>{`
        @keyframes mob-slide-in {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .mob-drawer-nav::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
