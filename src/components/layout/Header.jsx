import React from 'react';
import logoText from '../../assets/logo_text.png';
import memberListImg from '../../assets/member.png';

export default function Header({ currentTab, setCurrentTab }) {
  return (
    <>
      <header className="site-header">
        <nav className="top-nav top-nav--left" aria-label="상단 왼쪽 메뉴" />

        <div className="site-logo">
          <img className="site-logo__text" src={logoText} alt="Poke Commu" />
          <button
            type="button"
            className="site-logo-hitbox"
            onClick={() => setCurrentTab('home')}
            aria-label="메인으로 이동"
          />
          <button
            type="button"
            className="site-logo-members"
            onClick={() => setCurrentTab('members')}
            aria-label="멤버 목록으로 이동"
          >
            <img src={memberListImg} alt="" aria-hidden="true" />
          </button>
        </div>

        <nav className="top-nav top-nav--right" aria-label="상단 오른쪽 메뉴" />
      </header>
    </>
  );
}
