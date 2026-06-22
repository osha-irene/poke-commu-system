import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, Pencil, Check, X, User, Text, Swords } from 'lucide-react';
import { getDatabase, ref, update } from 'firebase/database';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';

/* ── 유틸 ── */
const getMemberList = (members) =>
  Object.entries(members || {})
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m?.name && !m.hidden && !m.isNPC)
    .sort((a, b) => {
      const rank = m => m.isSuperAdmin ? 2 : m.isAdmin ? 1 : 0;
      if (rank(a) !== rank(b)) return rank(b) - rank(a);
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

const getParty = m => (m?.caughtPokemon || []).filter(Boolean).slice(0, 6);
const getPartner = m => { const p = getParty(m); return p.find(x => x.isPartner) || p[0] || null; };
const getFaceImg = m => m?.profileImage || m?.profileImageFull || m?.profileImageUrl || '';
const getFullImg     = m => m?.profileImageFull || m?.profileImage || m?.profileImageUrl || '';
const getPokemonImg = p => p?.sprite || p?.spriteUrl || p?.imageUrl || p?.iconUrl || '';
const getOfficialArtwork = p => {
  if (p?.sprite) {
    const m = p.sprite.match(/\/pokemon\/(\d+)\.png/);
    if (m) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${m[1]}.png`;
  }
  const id = p?.dexId || p?.nationalDex || p?.pokemonId || p?.id;
  if (id) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
  return getPokemonImg(p);
};
const getPokemonName = p => p?.nickname || p?.nameKo || p?.name || '포켓몬';

/* ── 편집 가능 텍스트 필드 ── */
function EditableField({ value, placeholder, onSave, multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  const save = async () => {
    await onSave(draft.trim());
    setEditing(false);
  };
  const cancel = () => { setDraft(value || ''); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-start gap-1.5 w-full">
        {multiline ? (
          <textarea
            autoFocus rows={3}
            value={draft}
            onChange={e => setDraft(e.target.value)}
            className="flex-1 text-sm border border-indigo-300 rounded px-2 py-1 resize-none focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        ) : (
          <input
            autoFocus type="text"
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
            className="flex-1 text-sm border border-indigo-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        )}
        <button onClick={save} className="p-1 bg-indigo-500 hover:bg-indigo-600 text-white rounded mt-0.5"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="p-1 bg-gray-200 hover:bg-gray-300 rounded mt-0.5"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }
  return (
    <div className={`group flex items-start gap-1.5 cursor-pointer ${className}`} onClick={() => { setDraft(value || ''); setEditing(true); }}>
      <span className={value ? '' : 'text-gray-300 italic'}>{value || placeholder}</span>
      <Pencil className="w-3 h-3 text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5 flex-shrink-0" />
    </div>
  );
}

function CatchphraseField({ value, color, canEdit, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || '');

  useEffect(() => {
    if (!editing) setDraft(value || '');
  }, [editing, value]);

  const save = async () => {
    await onSave(draft.trim());
    setEditing(false);
  };
  const cancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  if (editing) {
    return (
      <div style={{ width: '100%', pointerEvents: 'auto' }}>
        <textarea
          autoFocus
          rows={2}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Escape') cancel();
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') save();
          }}
          style={{
            width: '100%',
            resize: 'none',
            border: `1.5px solid rgba(${color},0.35)`,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.72)',
            color: `rgb(${color})`,
            padding: '10px 12px',
            fontSize: 'clamp(2rem, 4vw, 3.8rem)',
            fontWeight: 800,
            fontStretch: '90%',
            textAlign: 'right',
            lineHeight: 1.18,
            outline: 'none',
            boxShadow: `0 10px 26px rgba(${color},0.10)`,
          }}
        />
        <div className="flex gap-1.5 mt-2">
          <button onClick={save} className="p-1.5 text-white rounded" style={{ background: `rgb(${color})` }}><Check className="w-4 h-4" /></button>
          <button onClick={cancel} className="p-1.5 bg-white/80 text-gray-500 rounded"><X className="w-4 h-4" /></button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => canEdit && setEditing(true)}
      disabled={!canEdit}
      className="group"
      style={{
        pointerEvents: canEdit ? 'auto' : 'none',
        cursor: canEdit ? 'text' : 'default',
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        width: '100%',
        textAlign: 'right',
        opacity: '10%',
      }}
    >
      <span
        style={{
          display: 'block',
          fontFamily: "'SUITE', sans-serif",
          fontSize: 'clamp(4rem, 5.35vw, 6rem)',
          fontWeight: 500,
          transform: 'scale(1.2)',
          transformOrigin: 'center',
          filter: 'blur(1px)',
          width: '100%',
          color: value ? `rgba(${color},0.90)` : `rgba(${color},0.38)`,
          letterSpacing: '0',
          lineHeight: 1,
          whiteSpace: 'pre-wrap',
          textShadow: '0 1px 0 rgba(255,255,255,0.65)',
         
        }}
      >
        {value || '한마디를 입력하세요'}
        {canEdit && <Pencil className="inline-block w-4 h-4 ml-2 opacity-0 group-hover:opacity-70 transition-opacity align-middle" />}
      </span>
    </button>
  );
}

/* ── 포켓몬 슬롯 ── */
function PartySlot({ pokemon, large }) {
  if (!pokemon) return (
    <div className={`rounded-xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center ${large ? 'w-20 h-20' : 'w-20 h-20'}`}>
      <span className="text-gray-300 text-xs">—</span>
    </div>
  );
  const icon = getPokemonLocalIconUrl(pokemon);
  const types = (Array.isArray(pokemon.types) ? pokemon.types : [pokemon.type]).filter(Boolean);
  return (
    <div className={`rounded-xl bg-white border-2 border-gray-100 shadow-sm flex flex-col items-center justify-center gap-1 p-1 ${large ? 'w-20 h-20' : 'w-14 h-14'}`}
      title={getPokemonName(pokemon)}>
      {icon ? (
        <img src={icon} alt={getPokemonName(pokemon)}
          style={{ imageRendering: 'pixelated', width: large ? 48 : 36, height: large ? 48 : 36, objectFit: 'contain' }} />
      ) : (
        <div className="w-8 h-8 rounded-full bg-gray-200" />
      )}
      {large && <span className="text-xs text-gray-500 truncate w-full text-center">{getPokemonName(pokemon)}</span>}
    </div>
  );
}

/* ── 멤버 목록 카드 ── */
function MemberCard({ member, titles, onClick }) {
  const partner = getPartner(member);
  const partnerIcon = partner ? getPokemonLocalIconUrl(partner) : null;
  const faceImg = getFaceImg(member);
  const title = member.title && member.title !== 'none'
    ? titles.find(t => t.id === member.title)?.label || ''
    : '';

  return (
    <div
      className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 group aspect-square bg-gray-100"
      onClick={onClick}
    >
      {faceImg ? (
        <img src={faceImg} alt={member.name}
          className="w-full h-full object-cover object-top group-hover:scale-105 transition-transform duration-500" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-indigo-50 to-purple-50">
          <div className="w-20 h-20 rounded-full bg-indigo-100 border-4 border-white/80 flex items-center justify-center text-4xl shadow">
            {member.name?.charAt(0)}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── 멤버 상세 ── */
const TABS = [
  { id: 'main', label: '메인', Icon: User },
  { id: 'text', label: '설정', Icon: Text },
  { id: 'entry', label: '엔트리', Icon: Swords },
];

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

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

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

      const pr = data[i];
      const pg = data[i + 1];
      const pb = data[i + 2];
      const max = Math.max(pr, pg, pb);
      const min = Math.min(pr, pg, pb);
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
    // 채도 최소 0.65, 명도 0.35~0.45로 고정해서 짙고 선명하게
    const boostedSaturation = clamp(Math.max(s, 0.62) + 0.08, 0, 0.70);
    const correctedLightness = l > 0.62 ? 0.60 : clamp(l, 0.32, 0.48);
    return hslToRgb(h, boostedSaturation, correctedLightness);
  } catch { return null; }
}

function getSelectedAccentColor(color) {
  if (!color) return [102, 143, 221];
  const [h, s, l] = rgbToHsl(color[0], color[1], color[2]);
  return hslToRgb(h, clamp(s + 0.07, 0.66, 0.92), clamp(l + 0.08, 0.46, 0.58));
}

function getQuoteAccentColor(color) {
  if (!color) return [28, 55, 112];
  const [h, s, l] = rgbToHsl(color[0], color[1], color[2]);
  return hslToRgb(h, clamp(s + 0.06, 0.62, 0.92), clamp(l - 0.26, 0.14, 0.26));
}

function MemberDetail({ member, currentUserId, canEditAll, titles, onBack }) {
  const isOwn = member.id === currentUserId;
  const canEditMember = isOwn || canEditAll;
  const fullImg = getFullImg(member);
  const imgRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [tab, setTab] = useState('main');
  const [hoveredTab, setHoveredTab] = useState(null);
  const [accent, setAccent] = useState(null); // [r, g, b]

  const party = getParty(member);
  const partner = getPartner(member);
  const entry = party.filter(p => p !== partner);

  const accentRgb = accent ? `${accent[0]},${accent[1]},${accent[2]}` : '80,120,200';
  const selectedAccent = getSelectedAccentColor(accent);
  const selectedAccentRgb = `${selectedAccent[0]},${selectedAccent[1]},${selectedAccent[2]}`;
  const quoteAccent = getQuoteAccentColor(accent);
  const quoteAccentRgb = `${quoteAccent[0]},${quoteAccent[1]},${quoteAccent[2]}`;

  const saveField = async (field, value) => {
    const db = getDatabase();
    await update(ref(db, `members/${member.id}`), { [field]: value });
  };

  const handleImgLoad = () => {
    setImgLoaded(true);
    if (imgRef.current) {
      const color = extractDominantColor(imgRef.current);
      if (color) setAccent(color);
    }
  };

  useEffect(() => {
    setAccent(null);
    setImgLoaded(false);
  }, [fullImg, member.id]);

  return (
    <div className="relative flex" style={{ minHeight: '100vh' }}>

      {/* 한마디 텍스트*/}
      <div style={{
        position: 'absolute',
        top: 28, left: '28%', right: '28%',
        height: 100,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '4%',
        zIndex: 3,
        pointerEvents: 'none',
      }}>
        <span style={{ color: 'white', fontSize: '0.875rem', fontWeight: 500 }}>
          {member.bio || ''}
        </span>
      </div>

      {/* 좌측: 캐치프레이즈(뒤) + 캐릭터 이미지 */}
      <div className="relative" style={{ width: 'calc(100% - 240px)', flexShrink: 0 }}>
        {tab === 'main' && (
          <div
            style={{
              position: 'fixed',
              top: '0.15rem',
              left: 0,
              width: '39vw',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <CatchphraseField
              value={member.catchphrase || ''}
              color={quoteAccentRgb}
              canEdit={canEditMember}
              onSave={v => saveField('catchphrase', v)}
            />
          </div>
        )}
        {fullImg ? (
          <img
            ref={imgRef}
            src={fullImg}
            alt={member.name}
            onLoad={handleImgLoad}
            style={{
              position: 'fixed',
              top: 0,
              left: '9vw',
              transform: 'translateX(-50%)',
              height: 'auto',
              width: '70vh',
              maxWidth: 'none',
              objectFit: 'contain',
              objectPosition: 'top center',
              zIndex: 2,
              maskImage: 'linear-gradient(to bottom, black 90%, rgba(0,0,0,0.3) 98%, transparent 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, black 80%, rgba(0,0,0,0.3) 90%, transparent 100%)',
              filter: 'url(#paper-cut-outline) drop-shadow(0px 4px 3px rgba(20, 34, 3, 0.3))',
              pointerEvents: 'none',
              opacity: imgLoaded ? 1 : 0,
              transition: 'opacity 0.5s ease',
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-start justify-center pt-8" style={{ zIndex: 2 }}>
            <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-5xl">
              {member.name?.charAt(0)}
            </div>
          </div>
        )}
      </div>

      {/* 하단 액센트 그라데이션 */}
      <div style={{
        position: 'fixed', bottom: -1, left: 0, right: 0, height: 220,
        background: `linear-gradient(to top, rgba(${accentRgb},0.10) 0%, rgba(${accentRgb},0.06) 42%, rgba(${accentRgb},0) 100%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* 사이드 내비게이션 */}
      <div style={{
        position: 'absolute', top: '10rem', right: -64,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255,0.92)',
        borderRadius: 999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 20,
      }}>
        {TABS.map(({ id, label, Icon }, i) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            onMouseEnter={() => setHoveredTab(id)}
            onMouseLeave={() => setHoveredTab(null)}
            title={label}
            style={{
              width: 40, height: 40,
              border: 'none',
              background: tab === id
                ? `rgb(${selectedAccentRgb})`
                : hoveredTab === id
                  ? `rgba(${accentRgb},0.15)`
                  : 'transparent',
              color: tab === id ? '#fff' : `rgb(${accentRgb})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              borderRadius: i === 0 ? '999px 999px 0 0' : i === TABS.length - 1 ? '0 0 999px 999px' : 0,
            }}
          >
            <Icon size={16} strokeWidth={2} />
          </button>
        ))}
      </div>

      {/* 우측 콘텐츠 패널 */}
      <div
        className="z-10 flex flex-col justify-start gap-3"
        style={{ position: 'absolute', top: tab === 'main' ? '17rem' : '3.5rem', left: '60%', width: 240 }}
      >
        <h2 style={{ fontFamily: "'SBAggroB', sans-serif", fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#1a1a1a', lineHeight: 1.1 }}>{member.name}</h2>

        {/* 메인 탭 */}
        {tab === 'main' && <>
          {partner && (
            <div className="flex items-center gap-3 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.7)', padding: '8px 12px', backdropFilter: 'blur(6px)' }}>
              <img src={getOfficialArtwork(partner)} alt={getPokemonName(partner)}
                style={{ width: 56, height: 56, objectFit: 'cover' }} />
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-gray-800">{getPokemonName(partner)}</span>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => {
              const p = entry[i];
              return (
                <div key={i} className="flex items-center justify-center rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.6)', height: 40, backdropFilter: 'blur(4px)' }}>
                  {p
                    ? <img src={getPokemonLocalIconUrl(p)} alt={getPokemonName(p)}
                        style={{ width: 32, height: 32, imageRendering: 'pixelated', objectFit: 'contain' }} />
                    : <span style={{ color: 'rgba(0,0,0,0.15)', fontSize: 18 }}>—</span>}
                </div>
              );
            })}
          </div>
        </>}

        {/* 설정 탭 */}
        {tab === 'settings' && (
          <div className="flex flex-col gap-3 text-sm text-gray-600">
            {canEditMember ? (
              <EditableField value={member.bio} placeholder="한마디를 입력해보세요"
                onSave={v => saveField('bio', v)} multiline className="text-sm text-gray-600" />
            ) : (
              <span>{member.bio || '한마디가 없어요'}</span>
            )}
          </div>
        )}

        {/* 엔트리 탭 */}
        {tab === 'entry' && (
          <div className="flex flex-col gap-2">
            {party.length === 0
              ? <span className="text-sm text-gray-400">엔트리가 비어있어요</span>
              : party.map((p, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl"
                  style={{ background: 'rgba(255,255,255,0.7)', padding: '6px 10px', backdropFilter: 'blur(4px)' }}>
                  <img src={getPokemonLocalIconUrl(p)} alt={getPokemonName(p)}
                    style={{ width: 32, height: 32, imageRendering: 'pixelated', objectFit: 'contain' }} />
                  <div className="flex flex-col">
                    <span className="text-sm font-medium text-gray-800">{getPokemonName(p)}</span>
                    <span className="text-xs text-gray-400">Lv.{p?.level || 1}</span>
                  </div>
                  {p.isPartner && <span className="ml-auto text-xs text-amber-500 font-semibold">파트너</span>}
                </div>
              ))
            }
          </div>
        )}
      </div>

    </div>
  );
}

/* ── 메인 ── */
export default function MembersView({ members = {}, isLoading, currentUserId, titles = [] }) {
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const listRef = useRef(null);

  const memberList = getMemberList(members);

  useEffect(() => {
    if (showDetail) {
      document.body.classList.add('rmv-detail-open');
    } else {
      document.body.classList.remove('rmv-detail-open');
    }
    return () => {
      document.body.classList.remove('rmv-detail-open');
    };
  }, [showDetail]);

  const openMember = (member) => {
    setIsClosing(false);
    setSelected(member);
    setTransitioning(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setShowDetail(true));
    });
    setTimeout(() => setTransitioning(false), 400);
  };

  const closeMember = () => {
    setIsClosing(true);
    setShowDetail(false);
    setTimeout(() => { setSelected(null); setTransitioning(false); setIsClosing(false); }, 450);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-48 text-gray-400">불러오는 중...</div>
  );

  return (
    <div className="relative">
      <svg width="0" height="0" style={{ position: 'absolute', pointerEvents: 'none' }}>
        <defs>
          <filter id="paper-cut-outline" colorInterpolationFilters="sRGB" x="-15%" y="-15%" width="130%" height="130%">
            <feMorphology operator="dilate" radius="4" in="SourceAlpha" result="expanded" />
            <feFlood floodColor="white" result="color" />
            <feComposite in="color" in2="expanded" operator="in" result="outline" />
            <feMerge>
              <feMergeNode in="outline" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
      {/* 목록 */}
      <div
        ref={listRef}
        style={{
          position: showDetail ? 'absolute' : 'relative',
          top: 0, left: 0, right: 0,
          transition: 'opacity 0.25s',
          transform: 'none',
          opacity: showDetail ? 0 : 1,
          pointerEvents: showDetail ? 'none' : 'auto',
        }}
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5 p-1">
          {memberList.map(m => (
            <MemberCard
              key={m.id}
              member={m}
              titles={titles}
              onClick={() => openMember(m)}
            />
          ))}
        </div>
      </div>

      {/* 상세 — fixed 오버레이, site-header가 z-60으로 nav 항상 클릭 가능 */}
      {selected && (
        <div
          className="rmv-overlay"
          style={{
            position: 'fixed',
            top: 0, bottom: 0, left: '30%', right: '30%',
            zIndex: 50,
            overflow: 'visible',
            background: 'rgba(255, 255, 255, 0.87)',
            boxShadow: '0 0 80px rgba(0,0,0,0.18), 0 0 200px rgba(0,0,0,0.08)',
            transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.4s',
            transform: showDetail ? 'translateX(0)' : isClosing ? 'translateX(-60px)' : 'translateX(60px)',
            opacity: showDetail ? 1 : 0,
            pointerEvents: showDetail ? 'auto' : 'none',
            backdropFilter: 'blur(6px)',
          }}
        >
          <MemberDetail
            member={members[selected.id] || selected}
            currentUserId={currentUserId}
            titles={titles}
            onBack={closeMember}
          />
        </div>
      )}

      {/* 뒤로가기 — 오버레이 밖, z-55로 항상 위에 */}
      {selected && (
        <button
          onClick={closeMember}
          className="text-white hover:-translate-x-3 hover:text-gray-200"
          style={{
            position: 'fixed',
            top: '1rem',
            left: '26.5%',
            zIndex: 55,
            opacity: showDetail ? 1 : 0,
            pointerEvents: showDetail ? 'auto' : 'none',
            transition: 'opacity 0.3s, transform 0.3s ease-out',
          }}
        >
          <ChevronLeft className="w-14 h-14" strokeWidth={1.5} />
        </button>
      )}
    </div>
  );
}
