import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { Star, ChevronLeft, ChevronRight, Shield, Swords, User } from 'lucide-react';
import memberButtonImg from '../../assets/members/member-button.png';
import npcBg from '../../assets/members/npcbg.png';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';

const npcBadgeImages = require.context('../../assets/members/badge', false, /\.png$/);
const PLACEHOLDER = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';

/* ── 색 추출 유틸 ── */
const clamp = (v, mn, mx) => Math.min(Math.max(v, mn), mx);
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) { h = s = 0; }
  else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return [h, s, l];
}
function hslToRgb(h, s, l) {
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  if (s === 0) { const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [Math.round(hue2rgb(p, q, h + 1/3) * 255), Math.round(hue2rgb(p, q, h) * 255), Math.round(hue2rgb(p, q, h - 1/3) * 255)];
}
function extractDominantColor(imgEl) {
  try {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.drawImage(imgEl, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;
    let r = 0, g = 0, b = 0, totalWeight = 0;
    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3];
      if (alpha < 128) continue;
      const pr = data[i], pg = data[i + 1], pb = data[i + 2];
      const max = Math.max(pr, pg, pb), min = Math.min(pr, pg, pb);
      const chroma = max - min;
      const lightness = (max + min) / 510;
      const [, saturation] = rgbToHsl(pr, pg, pb);
      if (chroma < 24 || saturation < 0.22) continue;
      if (lightness < 0.12 || lightness > 0.88) continue;
      const weight = saturation * clamp(1 - Math.abs(lightness - 0.5) * 1.15, 0.35, 1);
      r += pr * weight; g += pg * weight; b += pb * weight; totalWeight += weight;
    }
    if (totalWeight < 6) return null;
    const [h, s, l] = rgbToHsl(Math.round(r/totalWeight), Math.round(g/totalWeight), Math.round(b/totalWeight));
    const boostedSat = clamp(Math.max(s, 0.62) + 0.08, 0, 0.70);
    const correctedL = l > 0.62 ? 0.60 : clamp(l, 0.32, 0.48);
    return hslToRgb(h, boostedSat, correctedL);
  } catch { return null; }
}
const npcImgCache = {};

const getNpcOrder = m => {
  const order = Number(m?.npcOrder);
  return Number.isFinite(order) && order > 0 ? order : null;
};

const getNpcBadgeImg = m => {
  const order = getNpcOrder(m);
  if (!order) return '';
  try {
    return npcBadgeImages(`./${order}.png`);
  } catch {
    return '';
  }
};

/* ── 유틸 ── */
function getMemberList(members, npcOnly = false) {
  if (!members) return [];
  return Object.entries(members)
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m && m.name && !m.hidden && (npcOnly ? !!m.isNPC : !m.isNPC))
    .sort((a, b) => {
      if (npcOnly) {
        const ao = getNpcOrder(a);
        const bo = getNpcOrder(b);
        if (ao !== null || bo !== null) return (ao ?? 999999) - (bo ?? 999999);
      }
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
  if (m?.partnerPokemon) return m.partnerPokemon;
  const p = getParty(m);
  return p.find(x => x.isPartner) || p[0] || null;
};
const getBadges = m => (m?.gymBadges || m?.badges || []).filter(Boolean);

const NPC_ALIGNMENT_MOCKS = Array.from({ length: 14 }, (_, i) => ({
  id: `npc_alignment_mock_${i + 1}`,
  name: `NPC ${String(i + 1).padStart(2, '0')}`,
  hidden: false,
  isNPC: true,
  isMock: true,
}));


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
  const [panelOpen, setPanelOpen] = useState(false);
  const [charLoaded, setCharLoaded] = useState(false);
  const [accent, setAccent] = useState(() => {
    const hex = member.accentColor?.replace('#', '');
    if (hex?.length === 6) return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
    const fullImg = getFullImg(member);
    return npcImgCache[fullImg] ?? null;
  });
  const imgRef = useRef(null);

  const party      = getParty(member);
  const partner    = getPartner(member);
  const nonPartner = party.filter(p => p !== partner);
  const badges     = getBadges(member);
  const fullImg    = getFullImg(member);
  const catchphrase = member.catchphrase || member.bio || member.quote || '캐치프레이즈';

  useEffect(() => {
    const t1 = setTimeout(() => setIntroVisible(true), 50);
    const t2 = setTimeout(() => setIntroVisible(false), 2000);
    const t3 = setTimeout(() => { setPhase('main'); setTimeout(() => setPanelOpen(true), 60); }, 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  useEffect(() => {
    document.body.classList.add('mbr-overlay-open');
    return () => { document.body.classList.remove('mbr-overlay-open'); };
  }, []);

  const handleCharLoad = () => {
    setCharLoaded(true);
    if (member.accentColor) return;
    if (imgRef.current) {
      const color = extractDominantColor(imgRef.current);
      if (color) { npcImgCache[fullImg] = color; setAccent(color); }
    }
  };

  const accentRgb = accent ? `${accent[0]},${accent[1]},${accent[2]}` : '80,120,200';
  // 이름용 짙은 액센트 — HSL로 명도 낮추기
  const darkAccentColor = (() => {
    const [r, g, b] = accent ?? [80, 120, 200];
    const [h, s, l] = rgbToHsl(r, g, b);
    const [dr, dg, db] = hslToRgb(h, clamp(s + 0.05, 0, 1), clamp(l - 0.18, 0.18, 0.5));
    return `rgb(${dr},${dg},${db})`;
  })();

  return (
    <div className={`mbr-overlay${closing ? ' mbr-overlay--closing' : ''}`}
      style={{ '--accent': `rgb(${accentRgb})`, '--accent-rgb': accentRgb }}>

      {/* ── 인트로 페이즈 ── */}
      {phase === 'intro' && (
        <div className={`mbr-intro${introVisible ? ' mbr-intro--visible' : ''}`}
          style={{ '--accent': `rgb(${accentRgb})` }}>
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
          {member.profileImageFull && <img src={member.profileImageFull} alt="" className={`mbr-main-char-bg${charLoaded ? ' mbr-main-char-bg--loaded' : ''}`} aria-hidden="true" />}

          <div className="mbr-main-visual" onClick={e => e.stopPropagation()}>
            {fullImg
              ? <img
                  ref={imgRef}
                  src={fullImg} alt={member.name}
                  className={`mbr-main-char${charLoaded ? ' mbr-main-char--loaded' : ''}`}
                  crossOrigin="anonymous"
                  onLoad={handleCharLoad}
                />
              : <div className="mbr-main-char-empty">{member.name?.charAt(0) || '?'}</div>
            }
          </div>

          {/* 이름 */}
          <div className="mbr-main-identity">
            <div className="mbr-main-identity-box" style={{
              background: `linear-gradient(to right, rgba(${accentRgb},0.72) 0%, rgba(${accentRgb},0.38) 55%, transparent 100%)`,
            }}>
              <span className="mbr-main-name" style={{ color: '#fff', textShadow: `0 1px 6px rgba(0,0,0,0.45)` }}>{member.name}</span>
            </div>
          </div>

          {/* 오른쪽: 패널 — 탭 없이 단일 패널 */}
          <div className="mbr-main-data">
            <button className="mbr-panel-close" onClick={() => setPanelOpen(false)} title="접기"
              style={{ color: `rgb(${accentRgb})` }}>
              <ChevronRight size={18} strokeWidth={2.5} />
            </button>
            {/* 탭 버튼: 정보 — 패널 토글, 열릴 때 테마색 배경 */}
            <div className="mbr-tabs">
              <button
                className={`mbr-tab${panelOpen ? ' mbr-tab--active' : ''}`}
                onClick={() => setPanelOpen(p => !p)}
                title="정보"
                style={panelOpen
                  ? { background: `rgb(${accentRgb})`, color: '#fff', borderColor: `rgb(${accentRgb})` }
                  : { background: '#fff', color: `rgb(${accentRgb})`, borderColor: `rgba(${accentRgb},0.35)` }
                }
              >
                <User size={24} strokeWidth={2.5} />
              </button>
            </div>
            <div className="mbr-main-data-inner">

              {/* ── NPC 전용 레이아웃 ── */}

              {/* 한마디 */}
              {member.npcQuote && (
                <Reveal delay={0}>
                  <p style={{
                    fontFamily: "'SUITE', sans-serif",
                    fontSize: 'clamp(1.55rem, 3vw, 2.1rem)',
                    fontWeight: 800,
                    color: `rgba(${accentRgb}, 0.78)`,
                    lineHeight: 1.3,
                    marginBottom: 14,
                    letterSpacing: '-0.01em',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 4,
                  }}>
                    <span style={{
                      fontFamily: 'Georgia, serif',
                      fontSize: 'clamp(3.1rem, 6vw, 4.2rem)',
                      lineHeight: 0.75,
                      color: `rgba(${accentRgb}, 0.78)`,
                      flexShrink: 0,
                    }}>&#x201C;</span>
                    <span style={{ paddingTop: 20 }}>{member.npcQuote}</span>
                  </p>
                </Reveal>
              )}

              {/* 이름 이하 패딩 래퍼 */}
              <div style={{ padding: '0 20px 0 30px' }}>

              {/* 이름 + 나이 + 직업 */}
              <Reveal delay={60}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
                  <span style={{ fontFamily: 'Paperlogy, sans-serif', fontSize: 'clamp(3.4rem, 6.4vw, 5rem)', fontWeight: 700, color: darkAccentColor, lineHeight: 1.05, marginRight: 10 }}>
                    {member.name}
                  </span>
                  {(member.npcAge || member.npcOccupation) && (
                    <span style={{ fontSize: '1.3rem', color: 'rgba(60,60,80,0.6)', fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                      {member.npcAge && <span>{member.npcAge}세</span>}
                      {member.npcAge && member.npcOccupation && <span>·</span>}
                      {member.npcOccupation && <span>{member.npcOccupation}</span>}
                    </span>
                  )}
                </div>
              </Reveal>

              {/* 소개 */}
              {member.npcBio && (
                <Reveal delay={120}>
                  <p style={{
                    fontSize: '1.15rem',
                    color: 'rgba(40,40,60,0.75)',
                    lineHeight: 1.75,
                    whiteSpace: 'pre-line',
                    marginBottom: 20,
                    borderLeft: `2px solid rgba(${accentRgb},0.4)`,
                    paddingLeft: 10,
                  }}>
                    {member.npcBio}
                  </p>
                </Reveal>
              )}

              {/* 파트너 + 엔트리 */}
              {(partner || nonPartner.length > 0) && (
                <Reveal delay={180}>
                  {partner && <>
                    <div className="mbr-data-section-label" style={{ color: `rgb(${accentRgb})` }}><Star size={11} />파트너</div>
                    <PkDetailCard pokemon={partner} large />
                  </>}
                  {nonPartner.length > 0 && <>
                    <div className="mbr-data-section-label" style={{ color: `rgb(${accentRgb})`, marginTop: partner ? 12 : 0 }}><Swords size={11} />엔트리</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                      {nonPartner.slice(0, 6).map((p, i) => (
                        <Reveal key={p.uniqueId || i} delay={i * 40}>
                          <PkDetailCard pokemon={p} large={false} />
                        </Reveal>
                      ))}
                    </div>
                  </>}
                </Reveal>
              )}

              {/* 뱃지 */}
              {badges.length > 0 && (
                <Reveal delay={240}>
                  <div className="mbr-data-section-label" style={{ color: `rgb(${accentRgb})` }}><Shield size={11} />뱃지</div>
                  <div className="mbr-badge-list">
                    {badges.map((b,i) => (
                      <div key={i} className="mbr-gym-badge" title={b.name || ''}
                        style={{ borderColor: `rgba(${accentRgb},0.35)` }}>
                        {b.imageUrl
                          ? <img src={b.imageUrl} alt={b.name||''} width={28} height={28} style={{objectFit:'contain'}} />
                          : <Shield size={14} />}
                      </div>
                    ))}
                  </div>
                </Reveal>
              )}

              </div>{/* 이름 이하 패딩 래퍼 끝 */}

            </div>
          </div>{/* mbr-main-data */}

        </div>
      )}
    </div>
  );
}

/* ── 목록 뷰 ── */
export default function NpcView({ members = {}, isLoading = false, isAdmin = false, npcOnly = false, onSwitchTab }) {
  const [activeId, setActiveId] = useState(null);
  const [closing, setClosing]   = useState(false);

  const memberList = useMemo(() => {
    const list = getMemberList(members, npcOnly);
    if (process.env.NODE_ENV !== 'development' || !npcOnly) return list;
    const usedIds = new Set(list.map(m => m.id));
    const mockFill = NPC_ALIGNMENT_MOCKS
      .filter(m => !usedIds.has(m.id))
      .slice(0, Math.max(0, 14 - list.length));
    return [...list, ...mockFill];
  }, [members, npcOnly]);

  const activeMember = activeId ? memberList.find(m => m.id === activeId) : null;

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => { setActiveId(null); setClosing(false); }, 420);
  }, []);

  return (
    <>
      {/* 목록 */}
      <div style={{ position: 'relative' }}>
        {onSwitchTab && !activeMember && (
          <button
            onClick={() => onSwitchTab('members')}
            className="tab-switch-btn"
            style={{ position: 'absolute', top: -16, left: -42, zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src={memberButtonImg} alt="멤버 보기" style={{ width: 150, height: 'auto', display: 'block' }} />
          </button>
        )}
        <div className="mbr-page npc-page">
          <div className="npc-grid">
              {[0, 1].map(row => (
                <div key={row} className="mbr-list npc-row" style={{ transform: row === 0 ? 'translateX(-10px)' : 'translateX(10px)' }}>
                  {!isLoading && memberList.slice(row * 7, row * 7 + 7).map(m => {
                    const img = getListImg(m);
                    const badgeImg = m.npcPrivate ? getNpcBadgeImg(m) : '';
                    const isPrivateNpc = !!m.npcPrivate;
                    return (
                      <button
                        key={m.id}
                        className={`mbr-card${isPrivateNpc ? ' mbr-card--private' : ''}`}
                        onClick={() => {
                          if (!isPrivateNpc) setActiveId(m.id);
                        }}
                        disabled={isPrivateNpc}
                      >
                        <span className="mbr-card-thumb">
                          <span className="mbr-card-npc-panel" aria-hidden="true">
                            <img src={npcBg} alt="" draggable={false} className="mbr-card-npc-bg" />
                            {badgeImg && (
                              <span className="mbr-card-npc-badge-wrap">
                                <img src={badgeImg} alt="" draggable={false} className="mbr-card-npc-badge-shadow" />
                                <img src={badgeImg} alt="" draggable={false} className="mbr-card-npc-badge" />
                              </span>
                            )}
                          </span>
                          {!isPrivateNpc && (img ? <img src={img} alt="" draggable={false} style={{ position: 'relative', zIndex: 1 }} /> : <span className="mbr-card-initial">{m.name?.charAt(0)||'?'}</span>)}
                        </span>
                        {!isPrivateNpc && <span className="mbr-card-name">{m.name}</span>}
                        {!isPrivateNpc && getPartner(m) && (
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
              ))}
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
