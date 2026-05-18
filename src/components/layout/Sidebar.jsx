import React from 'react';

const assetPath = (fileName) => `${process.env.PUBLIC_URL}/img/ui/${fileName}`;

const trainerNavItems = [
  { id: 'profile', label: '트.카.', image: assetPath('trainercard.png') },
  { id: 'pokedex', label: '도감', image: assetPath('pokedex.png') },
  { id: 'map', label: '모험', image: assetPath('adventure.png') },
  { id: 'shop', label: '상점' },
  { id: 'qna', label: 'QnA', image: assetPath('qna.png') }
];

export default function Sidebar({ currentTab, setCurrentTab, isAdmin }) {
  return (
    <aside className="trainer-rail">
      <nav className="trainer-nav" aria-label="트레이너 메뉴">
        {trainerNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentTab(item.id)}
            className={`brush-nav-button trainer-nav__button ${currentTab === item.id ? 'is-active' : ''}`}
            aria-label={item.label}
          >
            {item.image ? <img src={item.image} alt="" /> : item.label}
          </button>
        ))}
        
        {isAdmin && (
          <button
            type="button"
            onClick={() => setCurrentTab('admin')}
            className={`brush-nav-button trainer-nav__button ${currentTab === 'admin' ? 'is-active' : ''}`}
          >
            관리자
          </button>
        )}
      </nav>
    </aside>
  );
}
