import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, ArrowLeft, Shield, Star, X, ChevronLeft, ChevronRight } from 'lucide-react';

const POKEMON_PLACEHOLDER = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

function getMemberList(members) {
  if (!members) return [];
  return Object.entries(members)
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m && m.name && !m.hidden)
    .sort((a, b) => {
      const ar = a.isSuperAdmin ? 2 : a.isAdmin ? 1 : 0;
      const br = b.isSuperAdmin ? 2 : b.isAdmin ? 1 : 0;
      if (ar !== br) return br - ar;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
}

function getPokemonName(p) {
  return p?.nickname || p?.name || p?.nameKo || p?.nameEn || '포켓몬';
}
function getPokemonImage(p) {
  return p?.sprite || p?.spriteUrl || p?.imageUrl || p?.iconUrl || p?.frontSprite || POKEMON_PLACEHOLDER;
}
function getMemberImage(m) {
  return m?.profileImage || m?.profileImageUrl || m?.avatarUrl || m?.imageUrl || '';
}
function getPartyPokemon(m) {
  return (m?.caughtPokemon || []).filter(Boolean).slice(0, 6);
}
function getPartnerPokemon(m) {
  if (m?.partnerPokemon) return m.partnerPokemon;
  const party = getPartyPokemon(m);
  return party.find(p => p.isPartner) || party[0] || null;
}
function getVisibleInventory(m) {
  return (m?.inventory || []).filter(i => i && (i.count ?? 1) > 0).slice(0, 12);
}

function RoleBadge({ member }) {
  if (member.isSuperAdmin) return <span className="mbr-badge mbr-badge--super">슈퍼관리자</span>;
  if (member.isAdmin) return <span className="mbr-badge mbr-badge--admin">관리자</span>;
  return <span className="mbr-badge mbr-badge--member">회원</span>;
}

function MemberDetail({ member, onBack }) {
  const party = getPartyPokemon(member);
  const partner = getPartnerPokemon(member);
  const inventory = getVisibleInventory(member);
  const imageUrl = getMemberImage(member);

  return (
    <div className="mbr-detail">
      <div className="mbr-visual">
        <button className="mbr-detail-back" onClick={onBack} aria-label="목록으로">
          <ChevronLeft size={14} strokeWidth={2.5} />
        </button>
        {imageUrl
          ? <img src={imageUrl} alt={member.name} className="mbr-visual-img" />
          : <div className="mbr-visual-placeholder">{member.name?.charAt(0) || '?'}</div>
        }
        <div className="mbr-visual-shade" />
        <div className="mbr-visual-footer">
          <span className="mbr-visual-name">{member.name}</span>
          <RoleBadge member={member} />
        </div>
      </div>

      <div className="mbr-body">
        <div className="mbr-body-inner">
          {(member.email || member.mastodonAccount) && (
            <p className="mbr-body-sub">{member.email || member.mastodonAccount}</p>
          )}

          <div className="mbr-stats-grid">
            <div className="mbr-stat"><span>소지금</span><strong>{(member.money || 0).toLocaleString()}원</strong></div>
            <div className="mbr-stat"><span>탐험</span><strong>{member.dailyWalks ?? 0}/{member.maxDailyWalks ?? 0}회</strong></div>
            <div className="mbr-stat"><span>포켓몬</span><strong>{(member.caughtPokemon || []).filter(Boolean).length}마리</strong></div>
            <div className="mbr-stat"><span>아이템</span><strong>{(member.inventory || []).filter(Boolean).length}종</strong></div>
          </div>

          {partner && (
            <section className="mbr-section">
              <h3 className="mbr-section-h"><Star size={12} />파트너</h3>
              <div className="mbr-partner-row">
                <div className="mbr-partner-img-box">
                  <img src={getPokemonImage(partner)} alt={getPokemonName(partner)} style={{ imageRendering: 'pixelated', width: 48, height: 48, objectFit: 'contain' }} />
                </div>
                <div>
                  <div className="mbr-partner-name">{getPokemonName(partner)}</div>
                  <div className="mbr-partner-lv">Lv.{partner.level || 1}</div>
                </div>
              </div>
            </section>
          )}

          {party.length > 0 && (
            <section className="mbr-section">
              <h3 className="mbr-section-h">엔트리</h3>
              <div className="mbr-party-grid">
                {party.map((p, i) => (
                  <div key={p.uniqueId || i} className="mbr-party-slot">
                    <img src={getPokemonImage(p)} alt={getPokemonName(p)} style={{ imageRendering: 'pixelated', width: 44, height: 44, objectFit: 'contain' }} />
                    <div className="mbr-party-name">{getPokemonName(p)}</div>
                    <div className="mbr-party-lv">Lv.{p.level || 1}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {inventory.length > 0 && (
            <section className="mbr-section">
              <h3 className="mbr-section-h">보유 아이템</h3>
              <div className="mbr-item-grid">
                {inventory.map((item, i) => (
                  <div key={item.itemId || i} className="mbr-item-slot">
                    <img src={item.imageUrl || item.spriteUrl || POKEMON_PLACEHOLDER} alt={item.name || '아이템'} style={{ imageRendering: 'pixelated', width: 32, height: 32, objectFit: 'contain' }} />
                    <div className="mbr-item-name">{item.name || '아이템'}</div>
                    <div className="mbr-item-cnt">×{item.count ?? 1}</div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MembersView({ members = {}, isLoading = false }) {
  const [activeId, setActiveId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);
  const [navState, setNavState] = useState({ prev: false, next: false });

  const memberList = useMemo(() => getMemberList(members), [members]);
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return memberList;
    return memberList.filter(m =>
      [m.name, m.nickname, m.email, m.mastodonAccount].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [memberList, searchQuery]);

  const activeMember = activeId ? memberList.find(m => m.id === activeId) : null;
  const hasActive = !!activeMember;

  const updateNav = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setNavState({ prev: el.scrollLeft > 2, next: el.scrollLeft < max - 2 });
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
    return () => el.removeEventListener('scroll', updateNav);
  }, [updateNav, filtered]);

  useEffect(() => {
    window.setTimeout(updateNav, 400);
  }, [hasActive, updateNav]);

  const scrollList = (dir) => {
    const el = listRef.current;
    if (!el) return;
    const amt = Math.max(220, Math.round(el.clientWidth * 0.58));
    el.scrollTo({ left: Math.max(0, el.scrollLeft + amt * dir), behavior: 'smooth' });
    window.setTimeout(updateNav, 360);
  };

  const openMember = (id) => {
    setActiveId(id);
  };

  const closeMember = () => {
    setActiveId(null);
  };

  return (
    <div className={`mbr-page${hasActive ? ' has-active' : ''}`}>
      {/* 좌측: 멤버 목록 */}
      <div className="mbr-roster">
        {/* 검색 — hover시 표시, 우상단 */}
        <div className="mbr-search-zone">
          <div className="mbr-search-inner">
            <input
              type="text"
              placeholder="이름·계정 검색"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="mbr-search-input"
            />
            <Search size={13} className="mbr-search-icon" aria-hidden="true" />
          </div>
        </div>

        {/* 카드 가로 스크롤 */}
        <div className="mbr-list-stage">
          <button
            className="mbr-list-nav mbr-list-nav-prev"
            hidden={!navState.prev}
            onClick={() => scrollList(-1)}
            aria-label="이전"
          >&#8249;</button>

          <div className="mbr-list" ref={listRef}>
            {isLoading ? null : filtered.map(m => {
              const img = getMemberImage(m);
              return (
                <button
                  key={m.id}
                  className={`mbr-card${activeId === m.id ? ' active' : ''}`}
                  onClick={() => openMember(m.id)}
                  title={m.name}
                >
                  <span className="mbr-card-thumb">
                    {img
                      ? <img src={img} alt={m.name} />
                      : <span className="mbr-card-initial">{m.name?.charAt(0) || '?'}</span>
                    }
                  </span>
                  <span className="mbr-card-main">
                    <em>{m.mastodonAccount || m.email || ''}</em>
                    <strong>{m.name}</strong>
                  </span>
                </button>
              );
            })}
          </div>

          <button
            className="mbr-list-nav mbr-list-nav-next"
            hidden={!navState.next}
            onClick={() => scrollList(1)}
            aria-label="다음"
          >&#8250;</button>
        </div>
      </div>

      {/* 우측: 디테일 */}
      <div className={`mbr-detail-wrap${hasActive ? '' : ' is-empty'}`}>
        {activeMember && <MemberDetail member={activeMember} onBack={closeMember} />}
      </div>
    </div>
  );
}
