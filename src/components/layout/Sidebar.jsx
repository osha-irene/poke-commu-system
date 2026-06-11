import React from 'react';

const assetPath = (fileName) => `${process.env.PUBLIC_URL}/img/ui/${fileName}`;

const adventureTabs = [
  { id: 'map', label: '지도(포켓몬포획)' },
  { id: 'camping', label: '캠핑' },
  { id: 'cooking', label: '요리' }
];

const trainerTabs = [
  { id: 'items', label: '가방' },
  { id: 'pokemon', label: '엔트리(포켓몬)' }
];

export default function Sidebar({ currentTab, setCurrentTab, isAdmin }) {
  const isTrainerActive = currentTab === 'profile' || trainerTabs.some((item) => item.id === currentTab);
  const isAdventureActive = adventureTabs.some((item) => item.id === currentTab);

  return (
    <aside className="trainer-rail">
      <nav className="trainer-nav" aria-label="트레이너 메뉴">
        <div className="trainer-nav__group">
          <button
            type="button"
            onClick={() => setCurrentTab('profile')}
            className={`brush-nav-button trainer-nav__button ${isTrainerActive ? 'is-active' : ''}`}
            aria-haspopup="true"
            aria-label="트레이너카드"
          >
            <img src={assetPath('trainercard.png')} alt="" />
          </button>

          <div className="trainer-nav__submenu" aria-label="트레이너카드 하위 메뉴">
            {trainerTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`trainer-nav__submenu-button ${currentTab === item.id ? 'is-active' : ''}`}
              >
                <span aria-hidden="true">-</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('pokedex')}
          className={`brush-nav-button trainer-nav__button ${currentTab === 'pokedex' ? 'is-active' : ''}`}
          aria-label="도감"
        >
          <img src={assetPath('pokedex.png')} alt="" />
        </button>

        <div className="trainer-nav__group">
          <button
            type="button"
            className={`brush-nav-button trainer-nav__button ${isAdventureActive ? 'is-active' : ''}`}
            aria-haspopup="true"
            aria-label="모험"
          >
            <img src={assetPath('adventure.png')} alt="" />
          </button>

          <div className="trainer-nav__submenu" aria-label="모험 하위 메뉴">
            {adventureTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCurrentTab(item.id)}
                className={`trainer-nav__submenu-button ${currentTab === item.id ? 'is-active' : ''}`}
              >
                <span aria-hidden="true">-</span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCurrentTab('shop')}
          className={`brush-nav-button trainer-nav__button ${currentTab === 'shop' ? 'is-active' : ''}`}
          aria-label="상점"
        >
          상점
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab('qna')}
          className={`brush-nav-button trainer-nav__button ${currentTab === 'qna' ? 'is-active' : ''}`}
          aria-label="Q&A"
        >
          <img src={assetPath('qna.png')} alt="" />
        </button>

        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setCurrentTab('admin')}
              className={`brush-nav-button trainer-nav__button ${currentTab === 'admin' ? 'is-active' : ''}`}
            >
              관리자
            </button>
            <button
              type="button"
              onClick={() => setCurrentTab('battle')}
              className={`brush-nav-button trainer-nav__button ${currentTab === 'battle' ? 'is-active' : ''}`}
            >
              배틀
            </button>
          </>
        )}
      </nav>
    </aside>
  );
}
