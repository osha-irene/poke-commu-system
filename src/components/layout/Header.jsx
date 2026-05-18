import React from 'react';

const assetPath = (fileName) => `${process.env.PUBLIC_URL}/img/ui/${fileName}`;

const topNavItems = [
  { id: 'notice', label: '공지', image: assetPath('announce.png') },
  { id: 'world', label: '세계관', image: assetPath('world.png') },
  { id: 'system', label: '시스템', image: assetPath('system.png') },
  { id: 'members', label: '멤버', image: assetPath('member.png') }
];

export default function Header({ currentTab, setCurrentTab }) {
  const leftNavItems = topNavItems.slice(0, 2);
  const rightNavItems = topNavItems.slice(2);

  return (
    <header className="site-header">
      <nav className="top-nav top-nav--left" aria-label="커뮤니티 왼쪽 메뉴">
        {leftNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentTab(item.id)}
            className={`brush-nav-button ${currentTab === item.id ? 'is-active' : ''}`}
            aria-label={item.label}
          >
            <img src={item.image} alt="" />
          </button>
        ))}
      </nav>

      <button
        type="button"
        className="site-logo"
        onClick={() => setCurrentTab('notice')}
        aria-label="메인으로 이동"
      >
        <img src={assetPath('logo.png')} alt="Poke Commu" />
      </button>

      <nav className="top-nav top-nav--right" aria-label="커뮤니티 오른쪽 메뉴">
        {rightNavItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setCurrentTab(item.id)}
            className={`brush-nav-button ${currentTab === item.id ? 'is-active' : ''}`}
            aria-label={item.label}
          >
            <img src={item.image} alt="" />
          </button>
        ))}
      </nav>
    </header>
  );
}
