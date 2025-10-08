import React from 'react';
import { Map, Book, Package, Settings, User, LogOut, Backpack } from 'lucide-react';
import NavButton from './NavButton';

export default function Sidebar({ currentTab, setCurrentTab, isAdmin, setIsAdmin, trainer }) {
  return (
    <aside className="w-64 bg-indigo-600 text-white flex flex-col">
      <div className="p-6 border-b border-indigo-500">
        <h1 className="text-2xl font-bold mb-2">포켓몬 월드</h1>
        <div className="text-sm opacity-90">트레이너: {trainer.name}</div>
      </div>

      <nav className="flex-1 px-3 py-4">
        <NavButton icon={Map} label="지도" active={currentTab === 'map'} onClick={() => setCurrentTab('map')} />
        <NavButton icon={Book} label="도감" active={currentTab === 'pokedex'} onClick={() => setCurrentTab('pokedex')} />
        <NavButton icon={User} label="포켓몬" active={currentTab === 'pokemon'} onClick={() => setCurrentTab('pokemon')} />
        <NavButton icon={Backpack} label="아이템" active={currentTab === 'items'} onClick={() => setCurrentTab('items')} />
        <NavButton icon={Package} label="프로필" active={currentTab === 'profile'} onClick={() => setCurrentTab('profile')} />
        {isAdmin && <NavButton icon={Settings} label="관리자" active={currentTab === 'admin'} onClick={() => setCurrentTab('admin')} />}
      </nav>

      <div className="p-4 border-t border-indigo-500">
        <button onClick={() => setIsAdmin(!isAdmin)} className="w-full text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-lg mb-2">
          {isAdmin ? '일반 모드' : '관리자 모드'}
        </button>
        <button className="w-full text-sm bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-lg flex items-center justify-center gap-2">
          <LogOut size={16} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}