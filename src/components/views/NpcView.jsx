import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Search, Star, ChevronLeft, ChevronRight, Shield, Swords, User } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';
import { ProfileSection } from '../common/ProfileRenderer';
import { useProfileTemplate, useMemberProfile } from '../../hooks/data/useProfileTemplate';

const PLACEHOLDER = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

/* ── 유틸 ── */
function getMemberList(members, npcOnly = false) {
  if (!members) return [];
  return Object.entries(members)
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m && m.name && !m.hidden && (npcOnly ? !!m.isNPC : !m.isNPC))
    .sort((a, b) => {
      const ar = a.isSuperAdmin ? 2 : a.isAdmin ? 1 : 0;
      const br = b.isSuperAdmin ? 2 : b.isAdmin ? 1 : 0;
      if (ar !== br) return br - ar;
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });
}
const getPokemonName = p => p?.nickname || p?.name || p?.nameKo || p?.nameEn || '포켓몬';
const getPokemonImg  = p => p?.sprite || p?.spriteUrl || p?.imageUrl || p?.iconUrl || p?.frontSprite || PLACEHOLDER;
const getPokemonIcon = p => getPokemonLocalIconUrl(p) || PLACEHOLDER;
const getFullImg     = m => m?.profileImageFull || m?.profileImage || m?.profileImageUrl || '';
const getListImg     = m => m?.profileImage || m?.profileImageFull || m?.profileImageUrl || '';
const getParty       = m => (m?.caughtPokemon || []).filter(Boolean).slice(0, 6);
const getPartner     = m => {
  const p = getParty(m);
  return p.find(x => x.isPartner) || p[0] || null;
};
const getBadges = m => (m?.gymBadges || m?.badges || []).filter(Boolean);


/* 스크롤 감지 등장 */
function Reveal({ children, delay = 0 }) {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setOn(true); }, { threshold: 0.08 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      transition: `opacity 0.58s ${delay}ms cubic-bezier(0.22,1,0.36,1), transform 0.58s ${delay}ms cubic-bezier(0.22,1,0.36,1)`,
      opacity: on ? 1 : 0,
      transform: on ? 'translateY(0)' : 'translateY(40px)',
    }}>
      {children}
    </div>
  );
}

/* 타입 색상 */
const TYPE_COLOR = {
  불:'#ef4444',물:'#3b82f6',풀:'#22c55e',전기:'#eab308',얼음:'#06b6d4',
  격투:'#dc2626',독:'#a855f7',땅:'#d97706',비행:'#8b5cf6',에스퍼:'#ec4899',
  벌레:'#84cc16',바위:'#92400e',고스트:'#6d28d9',드래곤:'#1d4ed8',
  악:'#111827',강철:'#64748b',페어리:'#f472b6',노말:'#94a3b8',
  fire:'#ef4444',water:'#3b82f6',grass:'#22c55e',electric:'#eab308',
  ice:'#06b6d4',fighting:'#dc2626',poison:'#a855f7',ground:'#d97706',
  flying:'#8b5cf6',psychic:'#ec4899',bug:'#84cc16',rock:'#92400e',
  ghost:'#6d28d9',dragon:'#1d4ed8',dark:'#111827',steel:'#64748b',
  fairy:'#f472b6',normal:'#94a3b8',
};

function PkDetailCard({ pokemon, large }) {
  const types = Array.isArray(pokemon?.types) ? pokemon.types : [pokemon?.type].filter(Boolean);
  const moves = (pokemon?.moves || []).filter(Boolean).slice(0, 4);
  return (
    <div className={`mbr-pk${large ? ' mbr-pk--large' : ''}`}>
      <div className="mbr-pk-img">
        <img src={getPokemonImg(pokemon)} alt={getPokemonName(pokemon)}
          style={{ imageRendering:'pixelated', width: large?96:56, height: large?96:56, objectFit:'contain' }} />
      </div>
      <div className="mbr-pk-info">
        <div className="mbr-pk-name">{getPokemonName(pokemon)}</div>
        <div className="mbr-pk-lv">Lv.{pokemon?.level || 1}</div>
        {types.length > 0 && (
          <div className="mbr-pk-types">
            {types.map((t,i) => (
              <span key={i} className="mbr-pk-type"
                style={{ background: TYPE_COLOR[String(t).toLowerCase()] || '#94a3b8' }}>{t}</span>
            ))}
          </div>
        )}
        {moves.length > 0 && (
          <div className="mbr-pk-moves">
            {moves.map((mv,i) => (
              <span key={i} className="mbr-pk-move">{mv?.nameKo || mv?.name || mv?.moveId || '—'}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ━━ 전체화면 오버레이 ━━ */
function MemberOverlay({ member, onClose, isAdmin, closing }) {
  const [phase, setPhase] = useState('intro');
  const [introVisible, setIntroVisible] = useState(false);
  const [tab, setTab] = useState('character');
  const [panelOpen, setPanelOpen] = useState(false);
  const [charLoaded, setCharLoaded] = useState(false);

  const openTab = (t) => { setTab(t); setPanelOpen(true); };

  const party      = getParty(member);
  const partner    = getPartner(member);
  const nonPartner = party.filter(p => p !== partner);
  const badges     = getBadges(member);
  const fullImg    = getFullImg(member);
  const catchphrase = member.catchphrase || member.bio || member.quote || '캐치프레이즈';

  const { template } = useProfileTemplate();
  const { sections, saveSection } = useMemberProfile(member.id);

  useEffect(() => {
    const t1 = setTimeout(() => setIntroVisible(true), 50);
    const t2 = setTimeout(() => setIntroVisible(false), 2000);
    const t3 = setTimeout(() => setPhase('main'), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  /* 오버레이 열려있는 동안: 스크롤 막기 + 사이드바 숨기기 */
  useEffect(() => {
    document.body.classList.add('mbr-overlay-open');
    return () => {
      document.body.classList.remove('mbr-overlay-open');
    };
  }, []);

  return (
    <div className={`mbr-overlay${closing ? ' mbr-overlay--closing' : ''}`}>

      {/* ── 인트로 페이즈 ── */}
      {phase === 'intro' && (
        <div className={`mbr-intro${introVisible ? ' mbr-intro--visible' : ''}`}>
          <div className="mbr-intro-quote">
            <span className="mbr-intro-text">{catchphrase}</span>
          </div>
        </div>
      )}

      {/* ── 메인 페이즈 ── */}
      {phase === 'main' && (
        <div className={`mbr-main${panelOpen ? ' mbr-main--panel-open' : ''}`}>

          {/* 뒤로가기 */}
          <button className="mbr-close" onClick={onClose}>
            <ChevronLeft size={40} strokeWidth={2} />
          </button>

          {/* 왼쪽: 캐릭터 이미지 */}
          {member.profileImageFull && <img src={member.profileImageFull} alt="" className="mbr-main-char-bg" aria-hidden="true" />}

          <div className="mbr-main-visual" onClick={e => e.stopPropagation()}>
            {fullImg
              ? <img
                  src={fullImg} alt={member.name}
                  className={`mbr-main-char${charLoaded ? ' mbr-main-char--loaded' : ''}`}
                  onLoad={() => setCharLoaded(true)}
                />
              : <div className="mbr-main-char-empty">{member.name?.charAt(0) || '?'}</div>
            }
          </div>

          {/* 이름 — mbr-main 기준 좌측 끝 고정 */}
          <div className="mbr-main-identity">
            <div className="mbr-main-identity-box">
              <span className="mbr-main-name">{member.name}</span>
            </div>
          </div>

          {/* 오른쪽: 패널 */}
          <div className="mbr-main-data">
            <button className="mbr-panel-close" onClick={() => setPanelOpen(false)} title="접기">
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
            <div className="mbr-tabs">
              <button className={`mbr-tab${tab === 'character' ? ' mbr-tab--active' : ''}`} onClick={() => openTab('character')} title="캐릭터">
                <User size={24} strokeWidth={2.5} />
              </button>
              <button className={`mbr-tab${tab === 'pokemon' ? ' mbr-tab--active' : ''}`} onClick={() => openTab('pokemon')} title="포켓몬">
                <img src="/pokeball.png" alt="포켓몬" style={{width:24,height:24,objectFit:'contain'}} />
              </button>
            </div>
            <div className="mbr-main-data-inner">

              {/* 캐릭터 탭 */}
              {tab === 'character' && template.map((sec, i) => (
                <Reveal key={sec.key} delay={i * 60}>
                  <ProfileSection
                    sectionKey={sec.key}
                    label={sec.label}
                    value={sections[sec.key] || ''}
                    isAdmin={isAdmin}
                    onSave={saveSection}
                  />
                </Reveal>
              ))}

              {/* 포켓몬 탭 */}
              {tab === 'pokemon' && <>
                {partner && (
                  <Reveal delay={0}>
                    <div className="mbr-data-section-label"><Star size={11} />파트너</div>
                    <PkDetailCard pokemon={partner} large />
                  </Reveal>
                )}
                {nonPartner.length > 0 && (
                  <Reveal delay={80}>
                    <div className="mbr-data-section-label"><Swords size={11} />엔트리</div>
                    <div className="mbr-entry-cards">
                      {nonPartner.map((p, i) => (
                        <Reveal key={p.uniqueId || i} delay={i * 50}>
                          <PkDetailCard pokemon={p} large={false} />
                        </Reveal>
                      ))}
                    </div>
                  </Reveal>
                )}
                {badges.length > 0 && (
                  <Reveal delay={160}>
                    <div className="mbr-data-section-label"><Shield size={11} />뱃지</div>
                    <div className="mbr-badge-list">
                      {badges.map((b,i) => (
                        <div key={i} className="mbr-gym-badge" title={b.name || ''}>
                          {b.imageUrl
                            ? <img src={b.imageUrl} alt={b.name||''} width={28} height={28} style={{objectFit:'contain'}} />
                            : <Shield size={14} />}
                        </div>
                      ))}
                    </div>
                  </Reveal>
                )}
              </>}

            </div>
          </div>{/* mbr-main-data */}

        </div>
      )}
    </div>
  );
}

/* ── 목록 뷰 ── */
export default function NpcView({ members = {}, isLoading = false, isAdmin = false, npcOnly = false }) {
  const [activeId, setActiveId]       = useState(null);
  const [closing, setClosing]         = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const listRef = useRef(null);
  const [navState, setNavState] = useState({ prev: false, next: false });

  const memberList = useMemo(() => getMemberList(members, npcOnly), [members, npcOnly]);
  const filtered   = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return memberList;
    return memberList.filter(m =>
      [m.name, m.nickname, m.email, m.mastodonAccount].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [memberList, searchQuery]);

  const activeMember = activeId ? memberList.find(m => m.id === activeId) : null;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setActiveId(null); setClosing(false); }, 420);
  }, []);

  const updateNav = useCallback(() => {
    const el = listRef.current; if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    setNavState({ prev: el.scrollLeft > 2, next: el.scrollLeft < max - 2 });
  }, []);
  useEffect(() => {
    const el = listRef.current; if (!el) return;
    el.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
    return () => el.removeEventListener('scroll', updateNav);
  }, [updateNav, filtered]);

  const scrollList = dir => {
    const el = listRef.current; if (!el) return;
    el.scrollTo({ left: el.scrollLeft + Math.round(el.clientWidth * 0.58) * dir, behavior: 'smooth' });
    window.setTimeout(updateNav, 360);
  };

  return (
    <>
      {/* 목록 */}
      <div className="mbr-page">
        <div className="mbr-roster">
          <div className="mbr-list-stage">
            <button className="mbr-list-nav mbr-list-nav-prev" hidden={!navState.prev} onClick={() => scrollList(-1)}>&#8249;</button>
            <div className="mbr-list" ref={listRef}>
              {!isLoading && filtered.map(m => {
                const img = getFullImg(m);
                const party = getParty(m).slice(0, 6);
                return (
                  <button key={m.id} className="mbr-card" onClick={() => setActiveId(m.id)}>
                    <span className="mbr-card-thumb">
                      {img ? <img src={img} alt="" draggable={false} /> : <span className="mbr-card-initial">{m.name?.charAt(0)||'?'}</span>}
                    </span>
                    <span className="mbr-card-name">{m.name}</span>
                    {getPartner(m) && (
                      <span
                        className="mbr-card-partner-badge"
                        title={getPokemonName(getPartner(m))}
                        style={{ backgroundImage: `url(${getPokemonIcon(getPartner(m))})` }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
            <button className="mbr-list-nav mbr-list-nav-next" hidden={!navState.next} onClick={() => scrollList(1)}>&#8250;</button>
          </div>
        </div>
      </div>

      {/* 전체화면 오버레이 */}
      {activeMember && (
        <MemberOverlay member={activeMember} onClose={handleClose} isAdmin={isAdmin} closing={closing} />
      )}
    </>
  );
}
