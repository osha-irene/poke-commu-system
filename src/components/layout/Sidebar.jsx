import React from 'react';

import adminIcon from '../../assets/sidebar/1/admin.png';
import adventureIcon from '../../assets/sidebar/1/advent.png';
import bagIcon from '../../assets/sidebar/1/bag.png';
import battleIcon from '../../assets/sidebar/1/battle.png';
import campingIcon from '../../assets/sidebar/1/camping.png';
import contestIcon from '../../assets/sidebar/1/contest.png';
import cookingIcon from '../../assets/sidebar/1/cooking.png';
import dexIcon from '../../assets/sidebar/1/dex.png';
import entryIcon from '../../assets/sidebar/1/entry.png';
import mapIcon from '../../assets/sidebar/1/map.png';
import mastodonIcon from '../../assets/sidebar/1/mastodon.png';
import qnaIcon from '../../assets/sidebar/1/qna.png';
import settingIcon from '../../assets/sidebar/1/setting.png';
import shopIcon from '../../assets/sidebar/1/shop.png';
import trainerCardIcon from '../../assets/sidebar/1/trainercard.png';
import twitterIcon from '../../assets/sidebar/1/twitter.png';

const adventureTabs = [
  { id: 'map', label: '지도/포켓몬', icon: mapIcon },
  { id: 'camping', label: '캠핑', icon: campingIcon },
  { id: 'cooking', label: '요리', icon: cookingIcon },
];

const trainerTabs = [
  { id: 'pokemon', label: '엔트리', icon: entryIcon },
  { id: 'items', label: '가방', icon: bagIcon },
];

const adminTabs = [
  { id: 'admin', label: '관리자', icon: adminIcon },
  { id: 'battle', label: '배틀', icon: battleIcon },
  { id: 'contest', label: '콘테스트', icon: contestIcon },
];

const IconImage = ({ src }) => <img src={src} alt="" aria-hidden="true" />;

export default function Sidebar({ currentTab, setCurrentTab, isAdmin, hiddenMenus = [] }) {
  const visible = (id) => isAdmin || !hiddenMenus.includes(id);

  const visibleTrainerTabs = trainerTabs.filter(item => visible(item.id));
  const visibleAdventureTabs = adventureTabs.filter(item => visible(item.id));

  const isTrainerActive = currentTab === 'profile' || trainerTabs.some((item) => item.id === currentTab);
  const isAdventureActive = adventureTabs.some((item) => item.id === currentTab);
  const isAdminToolActive = adminTabs.some((item) => item.id === currentTab);

  return (
    <>
    <aside className="trainer-rail">
      <nav className="trainer-nav" aria-label="사이드 메뉴">
        <div className="trainer-nav__main">
          <div className="trainer-nav__group">
            <button
              type="button"
              onClick={() => setCurrentTab('profile')}
              className={`brush-nav-button trainer-nav__button ${isTrainerActive ? 'is-active' : ''}`}
              aria-haspopup="true"
              aria-label="트레이너 카드"
            >
              <IconImage src={trainerCardIcon} />
            </button>

            <div className="trainer-nav__submenu" aria-label="트레이너 카드 하위 메뉴">
              {visibleTrainerTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`trainer-nav__submenu-button ${currentTab === item.id ? 'is-active' : ''}`}
                  aria-label={item.label}
                >
                  <IconImage src={item.icon} />
                </button>
              ))}
            </div>
          </div>

          {visible('pokedex') && (
            <button
              type="button"
              onClick={() => setCurrentTab('pokedex')}
              className={`brush-nav-button trainer-nav__button ${currentTab === 'pokedex' ? 'is-active' : ''}`}
              aria-label="도감"
            >
              <IconImage src={dexIcon} />
            </button>
          )}

          <div className="trainer-nav__group">
            <button
              type="button"
              className={`brush-nav-button trainer-nav__button ${isAdventureActive ? 'is-active' : ''}`}
              aria-haspopup="true"
              aria-label="모험"
            >
              <IconImage src={adventureIcon} />
            </button>

            <div className="trainer-nav__submenu" aria-label="모험 하위 메뉴">
              {visibleAdventureTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`trainer-nav__submenu-button ${currentTab === item.id ? 'is-active' : ''}`}
                  aria-label={item.label}
                >
                  <IconImage src={item.icon} />
                </button>
              ))}
            </div>
          </div>

          {visible('shop') && (
            <button
              type="button"
              onClick={() => setCurrentTab('shop')}
              className={`brush-nav-button trainer-nav__button ${currentTab === 'shop' ? 'is-active' : ''}`}
              aria-label="상점"
            >
              <IconImage src={shopIcon} />
            </button>
          )}
        </div>

<div className="trainer-nav__bottom">
  <div className="trainer-nav__social" aria-label="커뮤니티 링크">
    {visible('qna') && (
      <button
        type="button"
        onClick={() => setCurrentTab('qna')}
        className={`trainer-nav__social-button ${currentTab === 'qna' ? 'is-active' : ''}`}
        aria-label="Q&A"
      >
        <IconImage src={qnaIcon} />
      </button>
    )}
    <a href="https://x.com/Poke_OriginB" target="_blank" rel="noopener noreferrer" className="trainer-nav__social-button" aria-label="Twitter">
          <IconImage src={twitterIcon} />
        </a>


      <a href="https://originb-pokemon.world/" target="_blank" rel="noopener noreferrer" className="trainer-nav__social-button" aria-label="Mastodon">
          <IconImage src={mastodonIcon} />
        </a>
      </div>
     </div>
  </nav>
    </aside>

      {isAdmin && (
        <nav className="admin-corner-nav" aria-label="관리자 메뉴">
          <div className="trainer-nav__group trainer-nav__group--settings">
            <button
              type="button"
              className={`brush-nav-button trainer-nav__button ${isAdminToolActive ? 'is-active' : ''}`}
              aria-haspopup="true"
              aria-label="설정"
            >
              <IconImage src={settingIcon} />
            </button>

            <div className="trainer-nav__submenu" aria-label="설정 하위 메뉴">
              {adminTabs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrentTab(item.id)}
                  className={`trainer-nav__submenu-button ${currentTab === item.id ? 'is-active' : ''}`}
                  aria-label={item.label}
                >
                  <IconImage src={item.icon} />
                </button>
              ))}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
