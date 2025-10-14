import React from 'react';
import { Map, BookOpen, Smile, Package, User, Settings, LogOut, ShoppingBag, Users, Bot, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import NavButton from './NavButton';

export default function Sidebar({ currentTab, setCurrentTab, isAdmin, trainer, onLogout, soundEnabled, onToggleSound }) {
  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* 로고 */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-indigo-600">🐾 포켓몬 탐험</h1>
        <p className="text-sm text-gray-500 mt-1">커뮤니티 시스템</p>
      </div>

      {/* 사용자 정보 */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-500 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {trainer.name?.charAt(0) || '?'}
          </div>
          <div className="flex-1">
            <div className="font-semibold text-gray-800">{trainer.name}</div>
            <div className="text-xs text-gray-500 flex items-center gap-1">
              {isAdmin && (
                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-semibold">
                  {trainer.isSuperAdmin ? '슈퍼관리자' : '관리자'}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-3 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>오늘의 탐험</span>
            <span className="font-semibold text-indigo-600">
              {trainer.dailyWalks}/{trainer.maxDailyWalks}회
            </span>
          </div>
        </div>

        {/* 사운드 토글 버튼 */}
        <button
          onClick={onToggleSound}
          className={`w-full mt-3 px-3 py-2 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
            soundEnabled 
              ? 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200' 
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          <span>{soundEnabled ? '사운드 ON' : '사운드 OFF'}</span>
        </button>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
        <NavButton 
          icon={Map}
          label="지도" 
          active={currentTab === 'map'}
          onClick={() => setCurrentTab('map')}
        />
        <NavButton 
          icon={Users}
          label="멤버" 
          active={currentTab === 'members'}
          onClick={() => setCurrentTab('members')}
        />

        <NavButton 
          icon={Bot}
          label="NPC" 
          active={currentTab === 'npcs'}
          onClick={() => setCurrentTab('npcs')}
        />

        <NavButton 
          icon={BookOpen}
          label="도감" 
          active={currentTab === 'pokedex'}
          onClick={() => setCurrentTab('pokedex')}
        />
        <NavButton 
          icon={Smile}
          label="포켓몬" 
          active={currentTab === 'pokemon'}
          onClick={() => setCurrentTab('pokemon')}
        />
        <NavButton 
          icon={Package}
          label="아이템" 
          active={currentTab === 'items'}
          onClick={() => setCurrentTab('items')}
        />
        <NavButton 
          icon={ShoppingBag}
          label="상점" 
          active={currentTab === 'shop'}
          onClick={() => setCurrentTab('shop')}
        />
        <NavButton 
          icon={User}
          label="프로필" 
          active={currentTab === 'profile'}
          onClick={() => setCurrentTab('profile')}
        />
        <NavButton 
          icon={MessageSquare} 
          label="Q&A" 
          active={currentTab === 'qna'} 
          onClick={() => setCurrentTab('qna')} 
        />
        
        {isAdmin && (
          <>
            <div className="border-t border-gray-300 my-4 pt-2"></div>
            <NavButton 
              icon={Settings}
              label="관리자" 
              active={currentTab === 'admin'}
              onClick={() => setCurrentTab('admin')}
            />
          </>
        )}
      </nav>

      {/* 로그아웃 버튼 */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={onLogout}
          className="w-full bg-gray-100 text-gray-700 px-4 py-3 rounded-lg hover:bg-gray-200 font-semibold transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={18} />
          <span>로그아웃</span>
        </button>
      </div>
    </aside>
  );
}