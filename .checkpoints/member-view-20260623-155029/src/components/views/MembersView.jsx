import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { ChevronLeft, User, Text } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';
import { TYPE_COLORS } from '../../constants/pokemon';
import { translateMoveName } from '../../battle/utils/move-translations';
import movesData from '../../data/moves.json';

const GenderMale = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="5" cy="8" r="4" stroke="#5b8fe8" strokeWidth="1.8"/>
    <line x1="8.5" y1="4.5" x2="12" y2="1" stroke="#5b8fe8" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="9.5" y1="1" x2="12" y2="1" stroke="#5b8fe8" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="12" y1="1" x2="12" y2="3.5" stroke="#5b8fe8" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);
const GenderFemale = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="5.5" r="4" stroke="#e85b9a" strokeWidth="1.8"/>
    <line x1="6.5" y1="9.5" x2="6.5" y2="12.5" stroke="#e85b9a" strokeWidth="1.8" strokeLinecap="round"/>
    <line x1="4.5" y1="11" x2="8.5" y2="11" stroke="#e85b9a" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

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
const memberImagePreloadCache = new Map();

const preloadMemberImage = (url) => {
  if (!url) return Promise.resolve();
  if (memberImagePreloadCache.has(url)) return memberImagePreloadCache.get(url);

  const promise = new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = async () => {
      try {
        await image.decode?.();
      } catch {
        // The loaded image is still usable when decode() is unavailable or rejects.
      }
      resolve(image);
    };
    image.onerror = () => {
      memberImagePreloadCache.delete(url);
      resolve(null);
    };
    image.src = url;
  });

  memberImagePreloadCache.set(url, promise);
  return promise;
};

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
const getPokemonDbSprite = p => {
  const name = p?.nameEn || p?.name;
  if (name) return `https://img.pokemondb.net/sprites/scarlet-violet/normal/${name.toLowerCase().replace(/\s+/g, '-')}.png`;
  return getOfficialArtwork(p);
};
const getPokemonName = p => p?.nickname || p?.nameKo || p?.name || '포켓몬';
const getPokeApiSprite = p => {
  if (p?.sprite) {
    const m = p.sprite.match(/\/pokemon\/(\d+)\.png/);
    if (m) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${m[1]}.png`;
  }
  const id = p?.dexId || p?.nationalDex || p?.pokemonId || p?.id;
  if (id) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  return getPokemonLocalIconUrl(p);
};

const MOVE_TYPE_COLORS = {
  normal: { bg: '#A8A878', text: '#fff' },
  fire: { bg: '#F08030', text: '#fff' },
  water: { bg: '#6890F0', text: '#fff' },
  electric: { bg: '#F8D030', text: '#3b2f00' },
  grass: { bg: '#78C850', text: '#fff' },
  ice: { bg: '#98D8D8', text: '#1e4f5f' },
  fighting: { bg: '#C03028', text: '#fff' },
  poison: { bg: '#A040A0', text: '#fff' },
  ground: { bg: '#E0C068', text: '#4b3510' },
  flying: { bg: '#A890F0', text: '#fff' },
  psychic: { bg: '#F85888', text: '#fff' },
  bug: { bg: '#A8B820', text: '#fff' },
  rock: { bg: '#B8A038', text: '#fff' },
  ghost: { bg: '#705898', text: '#fff' },
  dragon: { bg: '#7038F8', text: '#fff' },
  dark: { bg: '#705848', text: '#fff' },
  steel: { bg: '#B8B8D0', text: '#303048' },
  fairy: { bg: '#EE99AC', text: '#fff' },
};

const moveList = Array.isArray(movesData) ? movesData : (movesData.moves || []);
const moveTypeByKey = new Map(
  moveList.flatMap(move =>
    [move.id, move.nameEn, move.name]
      .filter(Boolean)
      .map(key => [String(key).toLowerCase(), move.type])
  )
);

const getMoveKey = (move) => (
  typeof move === 'string'
    ? move
    : move?.moveId || move?.id || move?.nameEn || move?.name || ''
);
const getMoveLabel = (move) => {
  const key = getMoveKey(move);
  return translateMoveName(key) || move?.nameKo || move?.name || key || '—';
};
const getMoveTypeColor = (move) => {
  const rawType = typeof move === 'string' ? null : (move?.type || move?.typeEn || move?.moveType);
  const type = String(rawType || moveTypeByKey.get(String(getMoveKey(move)).toLowerCase()) || 'normal').toLowerCase();
  return MOVE_TYPE_COLORS[type] || TYPE_COLORS[rawType] || { bg: '#777', text: '#fff' };
};

/* ── 편집 가능 텍스트 필드 ── */
const _catchphraseFontCache = new Map();

function CatchphraseDisplay({ value, color }) {
  const spanRef = useRef(null);
  const [fontSize, setFontSize] = useState(() => _catchphraseFontCache.get(value) ?? 96);

  useLayoutEffect(() => {
    const el = spanRef.current;
    if (!el || !value) return;
    if (_catchphraseFontCache.has(value)) {
      setFontSize(_catchphraseFontCache.get(value));
      return;
    }

    const prevWS = el.style.whiteSpace;
    el.style.whiteSpace = 'nowrap';
    el.style.fontSize = '96px';
    void el.offsetHeight;
    const oneLineH = el.scrollHeight;
    el.style.whiteSpace = prevWS;

    let lo = 16, hi = 96;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      el.style.fontSize = mid + 'px';
      void el.offsetHeight;
      const twoLineH = (oneLineH / 96) * mid * 2;
      if (el.scrollHeight <= twoLineH + 4) lo = mid;
      else hi = mid - 1;
    }
    _catchphraseFontCache.set(value, lo);
    setFontSize(lo);
  }, [value]);

  return (
    <div style={{ width: '100%', textAlign: 'right', opacity: '10%', pointerEvents: 'none' }}>
      <span ref={spanRef} style={{
        display: 'block',
        fontFamily: "'SUITE', sans-serif",
        fontSize,
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
      }}>
        {value || ''}
      </span>
    </div>
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
        <div style={{
          width: (large ? 48 : 36) / 2,
          height: large ? 48 : 36,
          backgroundImage: `url(${icon})`,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `auto ${large ? 48 : 36}px`,
          backgroundPosition: 'left center',
          imageRendering: 'pixelated',
          flexShrink: 0,
        }} />
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

  const preloadFullImg = () => {
    const full = getFullImg(member);
    if (full && full !== faceImg) preloadMemberImage(full);
  };

  return (
    <div
      className="rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer overflow-hidden hover:-translate-y-1 group aspect-square bg-gray-100"
      onClick={onClick}
      onMouseEnter={preloadFullImg}
    >
      {faceImg ? (
        <img src={faceImg} alt={member.name} loading="eager" decoding="async" fetchPriority="high"
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
  { id: 'entry', label: '엔트리', iconSrc: '/img/pokeball.png' },
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

function getOpaqueBottomRatio(imgEl) {
  try {
    const canvas = document.createElement('canvas');
    const width = 128;
    const height = Math.max(1, Math.round(width * imgEl.naturalHeight / imgEl.naturalWidth));
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return 1;

    ctx.drawImage(imgEl, 0, 0, width, height);
    const pixels = ctx.getImageData(0, 0, width, height).data;
    const minimumOpaquePixels = Math.max(3, Math.ceil(width * 0.025));
    for (let y = height - 1; y >= 0; y -= 1) {
      let opaquePixels = 0;
      for (let x = 0; x < width; x += 1) {
        if (pixels[(y * width + x) * 4 + 3] > 16) {
          opaquePixels += 1;
        }
      }
      if (opaquePixels >= minimumOpaquePixels) return (y + 1) / height;
    }
  } catch {
    return 1;
  }
  return 1;
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

const imgCache = {}; // url → accent color (모듈 레벨 캐시)

function MemberDetail({ member, titles, onBack, onTabChange }) {
  const fullImg = getFullImg(member);
  const imgRef = useRef(null);
  const opaqueBottomRatioRef = useRef(1);
  const prevMemberIdRef = useRef(null);
  const noteRef = useRef(null);
  const charTransitionTimerRef = useRef(null);
  const charReturnTimerRef = useRef(null);
  const [imgLoaded, setImgLoaded] = useState(() => !!imgCache[fullImg]);
  const [tab, setTab] = useState('main');
  const [charImageOffset, setCharImageOffset] = useState(0);
  const [charTabTransition, setCharTabTransition] = useState('');

  const commitTabChange = (id) => {
    const transition = id === 'text'
      ? 'rmv-char-to-text'
      : tab === 'text'
        ? 'rmv-char-from-text'
        : '';
    if (charTransitionTimerRef.current) clearTimeout(charTransitionTimerRef.current);
    setCharTabTransition(transition);
    if (transition) {
      charTransitionTimerRef.current = setTimeout(() => setCharTabTransition(''), 800);
    }
    setTab(id);
    onTabChange?.(id);
  };
  const changeTab = (id) => {
    if (id === tab) return;
    if (tab === 'main' && member.charImageScrollEnabled && charImageOffset > 0) {
      if (charReturnTimerRef.current) clearTimeout(charReturnTimerRef.current);
      setCharImageOffset(0);
      charReturnTimerRef.current = setTimeout(() => commitTabChange(id), 950);
      return;
    }
    commitTabChange(id);
  };
  const [hoveredTab, setHoveredTab] = useState(null);
  const [accent, setAccent] = useState(() => imgCache[fullImg] ?? null);
  const [note, setNote] = useState(member.note || '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [keywordTexts, setKeywordTexts] = useState(() => member.keywordTexts || ['', '', '']);
  const [kwEditing, setKwEditing] = useState(null);
  const [kwSaving, setKwSaving] = useState(false);
  const [etcText, setEtcText] = useState(() => member.etcText || '');
  const [etcEditing, setEtcEditing] = useState(false);
  const [etcSaving, setEtcSaving] = useState(false);

  const saveEtcText = async () => {
    setEtcSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      await update(ref(getDatabase(), `members/${member.id}`), { etcText });
    } finally {
      setEtcSaving(false);
      setEtcEditing(false);
    }
  };

  const saveKeywordText = async (i) => {
    setKwSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      const next = [...keywordTexts];
      await update(ref(getDatabase(), `members/${member.id}`), { keywordTexts: next });
    } finally {
      setKwSaving(false);
      setKwEditing(null);
    }
  };

  const saveNote = async () => {
    setNoteSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      await update(ref(getDatabase(), `members/${member.id}`), { note: note.trim() });
    } finally {
      setNoteSaving(false);
      setNoteEditing(false);
    }
  };

  const party = getParty(member);
  const partner = party.find(p => p?.isPartner) || member.partnerPokemon || null;
  const entry = party.filter(p => p !== partner);

  const accentRgb = accent ? `${accent[0]},${accent[1]},${accent[2]}` : '80,120,200';
  const selectedAccent = getSelectedAccentColor(accent);
  const selectedAccentRgb = `${selectedAccent[0]},${selectedAccent[1]},${selectedAccent[2]}`;
  const quoteAccent = getQuoteAccentColor(accent);
  const quoteAccentRgb = `${quoteAccent[0]},${quoteAccent[1]},${quoteAccent[2]}`;

  const handleImgLoad = () => {
    setImgLoaded(true);
    if (imgRef.current) {
      opaqueBottomRatioRef.current = getOpaqueBottomRatio(imgRef.current);
      const color = extractDominantColor(imgRef.current);
      if (color) {
        imgCache[fullImg] = color;
        setAccent(color);
      }
    }
  };

  useEffect(() => {
    const memberChanged = prevMemberIdRef.current !== member.id;
    prevMemberIdRef.current = member.id;
    if (imgCache[fullImg]) {
      setImgLoaded(true);
      setAccent(imgCache[fullImg]);
    } else if (memberChanged) {
      setAccent(null);
      setImgLoaded(false);
    }
  }, [fullImg, member.id]);


  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [note, noteEditing]);

  useEffect(() => {
    setCharImageOffset(0);
  }, [member.id, tab]);

  useEffect(() => () => {
    if (charTransitionTimerRef.current) clearTimeout(charTransitionTimerRef.current);
    if (charReturnTimerRef.current) clearTimeout(charReturnTimerRef.current);
  }, []);

  const moveScrollableCharacter = (event) => {
    event.preventDefault();
    const image = imgRef.current;
    if (!image) return;

    const renderedTop = parseFloat(window.getComputedStyle(image).top) || 0;
    const visibleImageHeight = image.offsetHeight * opaqueBottomRatioRef.current;
    const maxOffset = Math.max(0, renderedTop + visibleImageHeight - window.innerHeight + 20);
    const step = event.deltaY > 0 ? 100 : -100;
    setCharImageOffset(current => clamp(current + step, 0, maxOffset));
  };

  return (
    <div className="relative flex" style={{ height: '100vh' }}>



      {/* 좌측: 캐치프레이즈(뒤) + 캐릭터 이미지 */}
      <div className="relative" style={{ width: 'calc(100% - 240px)', flexShrink: 0 }}>
        {tab === 'main' && (
          <div
            className="rmv-catchphrase-fade"
            style={{
              position: 'fixed',
              top: '0.15rem',
              left: 0,
              width: '39vw',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <CatchphraseDisplay
              value={member.catchphrase || ''}
              color={quoteAccentRgb}
            />
          </div>
        )}
        {fullImg ? (
          member.charImageScrollEnabled && tab === 'main' ? (
            <div
              className={`rmv-char-scroll${charTabTransition === 'rmv-char-from-text' ? ' rmv-char-scroll-from-text' : ''}`}
              onWheel={moveScrollableCharacter}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: '-30vw',
                width: '100vw',
                overflow: 'hidden',
                boxSizing: 'border-box',
                zIndex: 2,
              }}
            >
              <img
                ref={imgRef}
                src={fullImg}
                alt={member.name}
                crossOrigin="anonymous"
                onLoad={handleImgLoad}
                onError={() => setImgLoaded(true)}
                className="rmv-char-base"
                style={{
                  position: 'relative',
                  top: member.charImageTop ?? 0,
                  left: `calc(30vw + ${member.charImageLeft ?? '9vw'})`,
                  display: 'block',
                  height: 'auto',
                  width: member.charImageWidth ?? '70vh',
                  maxWidth: 'none',
                  objectFit: 'contain',
                  objectPosition: 'top center',
                  filter: 'url(#paper-cut-outline) drop-shadow(0px 4px 3px rgba(20, 34, 3, 0.3))',
                  pointerEvents: 'none',
                  opacity: imgLoaded ? 1 : 0,
                  transform: `translateX(-50%) translateY(-${charImageOffset}px)`,
                  transition: 'transform 1.1s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease',
                  willChange: 'transform',
                }}
              />
            </div>
          ) : (
            <img
              ref={imgRef}
              src={fullImg}
              alt={member.name}
              crossOrigin="anonymous"
              onLoad={handleImgLoad}
              onError={() => setImgLoaded(true)}
              className={`rmv-char-base${tab === 'text' ? ' rmv-char-pushed' : ''}${charTabTransition ? ` ${charTabTransition}` : ''}`}
              style={{
                position: 'fixed',
                top: member.charImageTop ?? 0,
                left: member.charImageLeft ?? '9vw',
                height: 'auto',
                width: member.charImageWidth ?? '70vh',
                maxWidth: 'none',
                objectFit: 'contain',
                objectPosition: 'top center',
                zIndex: 2,
                filter: 'url(#paper-cut-outline) drop-shadow(0px 4px 3px rgba(20, 34, 3, 0.3))',
                pointerEvents: 'none',
                opacity: imgLoaded ? 1 : 0,
                transition: 'transform 0.55s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease',
              }}
            />
          )
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
        position: 'fixed', bottom: -1, left: 0, right: 0, height: 400,
        background: `linear-gradient(to top, rgba(${accentRgb},0.10) 0%, rgba(${accentRgb},0.06) 42%, rgba(${accentRgb},0) 100%)`,
        pointerEvents: 'none', zIndex: 1,
      }} />

      {/* 사이드 내비게이션 */}
      <div style={{
        position: 'absolute', top: '10rem', right: -64,
        display: 'flex', flexDirection: 'column',
        background: 'rgba(255,255,255)',
        borderRadius: 999,
        boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
        zIndex: 20,
      }}>
        {TABS.map(({ id, label, Icon, iconSrc }, i) => (
          <button
            key={id}
            onClick={() => changeTab(id)}
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
            {iconSrc ? (
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  height: 16,
                  display: 'block',
                  backgroundColor: 'currentColor',
                  WebkitMask: `url(${iconSrc}) center / contain no-repeat`,
                  mask: `url(${iconSrc}) center / contain no-repeat`,
                  transition: 'background-color 0.18s ease',
                }}
              />
            ) : (
              <Icon size={16} strokeWidth={2} />
            )}
          </button>
        ))}
      </div>



      {/* 설정 탭 — 스크롤 컨테이너 (오버레이에 붙음) */}
      {tab === 'text' && (() => {
        const [ar, ag, ab] = selectedAccent;
        const lum = 0.299 * ar + 0.587 * ag + 0.114 * ab;
        const kwTextColor = lum > 160 ? '#111' : '#fff';
        const renderInline = (text) => {
          const parts = text.split(/(\|[^|]+\|)/g);
          if (parts.length === 1) return text || null;
          return parts.map((part, k) =>
            /^\|[^|]+\|$/.test(part)
              ? <mark key={k} style={{ background: `rgba(${selectedAccentRgb}, 0.22)`, color: 'inherit', borderRadius: 3, padding: '1px 4px', fontWeight: 500 }}>{part.slice(1, -1)}</mark>
              : part
          );
        };
        const renderTextLine = (line, j) => {
          if (line.startsWith('*')) return (
            <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.7em' }}>
              <span style={{ color: `rgb(${selectedAccentRgb})`, fontWeight: 700, flexShrink: 0, lineHeight: 1.75 }}>•</span>
              <span>{renderInline(line.slice(1).trim()) || ' '}</span>
            </div>
          );
          return <p key={j} style={{ margin: 0, marginBottom: '0.7em', textIndent: '0.5em' }}>{renderInline(line) || ' '}</p>;
        };
        return (
          <>
            <div className="rmv-text-bg-reveal" style={{ position: 'fixed', top: 0, bottom: 0, left: '22%', right: 0, overflow: 'hidden', zIndex: 10, background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.85) 12%, rgba(255,255,255,0.97) 28%, rgba(255,255,255,0.97) 100%)', pointerEvents: 'none' }} />
            <div
              className="rmv-text-scroll"
              style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, overflowY: 'auto', overflowX: 'hidden', zIndex: 11, '--rmv-accent-base': selectedAccentRgb }}
            >
              <div className="rmv-text-tab-in flex flex-col justify-start gap-3"
                style={{ paddingTop: 42, paddingBottom: 40, paddingLeft: 32, paddingRight: 60, boxSizing: 'border-box', minWidth: 'calc((100vw - 53vw) * 0.65)' }}>
                {(member.keywords || []).slice(0, 3).map((kw, i) => {
                  if (!kw) return null;
                  const isEditing = kwEditing === i;
                  return (
                    <div key={i} style={{ paddingTop: 12 }}>
                      <div style={{ display: 'block', background: `rgb(${selectedAccentRgb})`, borderRadius: 0, padding: '5px 14px', marginBottom: 24, width: 'calc(100% + 2rem)', WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 82%)', maskImage: 'linear-gradient(to right, black 50%, transparent 82%)' }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: kwTextColor, letterSpacing: '0.04em' }}>#{kw}</span>
                      </div>
                      {isEditing ? (
                        <>
                          <textarea
                            value={keywordTexts[i]}
                            ref={el => { if (el) { el.style.height = 'auto'; requestAnimationFrame(() => { el.style.height = el.scrollHeight + 'px'; }); el.focus({ preventScroll: true }); } }}
                            onChange={e => { setKeywordTexts(prev => { const n = [...prev]; n[i] = e.target.value; return n; }); const el = e.target; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
                            style={{ display: 'block', width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '10px 14px', fontSize: 15, color: '#333', lineHeight: 1.75, fontFamily: 'inherit', overflow: 'hidden', minHeight: 48 }}
                          />
                          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                            <button onClick={() => saveKeywordText(i)} disabled={kwSaving}
                              style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: `rgb(${selectedAccentRgb})`, color: kwTextColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                              {kwSaving ? '저장 중...' : '저장'}
                            </button>
                            <button onClick={() => setKwEditing(null)}
                              style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.08)', color: '#555', fontSize: 13, cursor: 'pointer' }}>
                              취소
                            </button>
                          </div>
                        </>
                      ) : (
                        <div onClick={() => setKwEditing(i)}
                          style={{ fontSize: 15, color: keywordTexts[i] ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.75, cursor: 'text', minHeight: 40, paddingLeft: 18 }}>
                          {keywordTexts[i]
                            ? keywordTexts[i].split('\n').map(renderTextLine)
                            : '클릭해서 내용 추가...'}
                        </div>
                      )}
                    </div>
                  );
                })}
                <div style={{ paddingTop: 12 }}>
                  <div style={{ display: 'block', background: `rgb(${selectedAccentRgb})`, borderRadius: 0, padding: '5px 14px', marginBottom: 24, width: 'calc(100% + 2rem)', WebkitMaskImage: 'linear-gradient(to right, black 50%, transparent 82%)', maskImage: 'linear-gradient(to right, black 50%, transparent 82%)' }}>
                    <span style={{ fontSize: 22, fontWeight: 700, color: kwTextColor, letterSpacing: '0.04em' }}>기타</span>
                  </div>
                  {etcEditing ? (
                    <>
                      <textarea
                        value={etcText}
                        ref={el => { if (el) { el.style.height = 'auto'; requestAnimationFrame(() => { el.style.height = el.scrollHeight + 'px'; }); el.focus({ preventScroll: true }); } }}
                        onChange={e => { setEtcText(e.target.value); const el = e.target; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }}
                        style={{ display: 'block', width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.6)', borderRadius: 8, padding: '10px 14px', fontSize: 15, color: '#333', lineHeight: 1.75, fontFamily: 'inherit', overflow: 'hidden', minHeight: 48 }}
                      />
                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <button onClick={saveEtcText} disabled={etcSaving}
                          style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: `rgb(${selectedAccentRgb})`, color: kwTextColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                          {etcSaving ? '저장 중...' : '저장'}
                        </button>
                        <button onClick={() => setEtcEditing(false)}
                          style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.08)', color: '#555', fontSize: 13, cursor: 'pointer' }}>
                          취소
                        </button>
                      </div>
                    </>
                  ) : (
                    <div onClick={() => setEtcEditing(true)}
                      style={{ fontSize: 15, color: etcText ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.75, cursor: 'text', minHeight: 40, paddingLeft: 18 }}>
                      {etcText
                        ? etcText.split('\n').map(renderTextLine)
                        : '클릭해서 내용 추가...'}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
      })()}

            {/* 메인 탭 콘텐츠 */}
      {tab === 'main' && (
        <div
          key="main"
          className="rmv-tab-content flex flex-col justify-start gap-3"
          style={{ position: 'absolute', top: '16.5rem', left: '57%', width: 280, maxHeight: 'calc(100vh - 2rem)', overflowY: 'visible', paddingBottom: 24, boxSizing: 'border-box' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 28 }}>
            {(() => {
              const titleLabel = member.title && member.title !== 'none'
                ? titles.find(t => t.id === member.title)?.label
                : null;
              return (
                <span style={{ fontSize: 14, fontWeight: 600, color: `rgb(${accentRgb})`, letterSpacing: '0.05em', lineHeight: 1, visibility: titleLabel ? 'visible' : 'hidden' }}>
                  {titleLabel || ' '}
                </span>
              );
            })()}
            <h2 style={{ fontFamily: "'SBAggroB', sans-serif", fontWeight: 700, fontSize: 'clamp(2rem, 4vw, 3rem)', color: '#1a1a1a', lineHeight: 1.1 }}>{member.name}</h2>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: -12 }}>
            {partner && (
              <div style={{ position: 'relative', height: 65, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 110 }}>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)', fontWeight: 500, letterSpacing: '0.05em' }}>파트너</span>
                <span style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>{getPokemonName(partner)}</span>
                <img src={getPokemonDbSprite(partner)} alt={getPokemonName(partner)}
                  style={{ position: 'absolute', bottom: '0', right: '-2rem', width: 160, height: 160, objectFit: 'contain', zIndex: 5, pointerEvents: 'none' }} />
              </div>
            )}
            {(() => {
              const stats = [member.age, member.height, member.weight, member.hometown].filter(Boolean);
              return stats.length > 0 ? (
                <div style={{ fontSize: 17, fontWeight: 700, color: `rgb(${accentRgb})`, letterSpacing: '0.04em', lineHeight: 1.4, marginTop: 16 }}>
                  {stats.join(' · ')}
                </div>
              ) : null;
            })()}
            {noteEditing ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <textarea
                  ref={el => { noteRef.current = el; if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; el.focus({ preventScroll: true }); } }}
                  value={note}
                  onChange={e => { setNote(e.target.value); if (noteRef.current) { noteRef.current.style.height = 'auto'; noteRef.current.style.height = noteRef.current.scrollHeight + 'px'; } }}
                  style={{ width: '100%', resize: 'none', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(6px)', borderRadius: 10, padding: '10px 12px', fontSize: 15, color: '#333', lineHeight: 1.6, fontFamily: 'inherit', zIndex: 5, overflow: 'hidden', minHeight: 48, display: 'block' }}
                />
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={saveNote} disabled={noteSaving}
                    style={{ flex: 1, padding: '6px 0', borderRadius: 8, border: 'none', background: `rgb(${accentRgb})`, color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {noteSaving ? '저장 중...' : '저장'}
                  </button>
                  <button onClick={() => { setNote(member.note || ''); setNoteEditing(false); }}
                    style={{ padding: '6px 12px', borderRadius: 8, border: 'none', background: 'rgba(0,0,0,0.08)', color: '#555', fontSize: 13, cursor: 'pointer' }}>
                    취소
                  </button>
                </div>
              </div>
            ) : (
              <div onClick={() => setNoteEditing(true)}
                style={{ minHeight: 48, fontSize: 15, color: note ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.6, cursor: 'text', padding: '4px 2px', position: 'relative', zIndex: 1 }}>
                {note
                  ? note.split('\n').map((line, i) => <p key={i} style={{ margin: 0, marginBottom: '0.4em', textIndent: '0.5em' }}>{line || ' '}</p>)
                  : '클릭해서 메모 추가...'}
              </div>
            )}
          </div>
        </div>
      )}

            {/* 엔트리 탭 콘텐츠 */}
      {tab === 'entry' && (
        <>
        <div
          className="rmv-entry-title"
          style={{
            position: 'absolute',
            top: '2.6rem',
            left: '37%',
            right: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflowX: 'hidden',
            overflowY: 'visible',
          }}
        >
          <div
            style={{
              fontFamily: "'SUITE', sans-serif",
              fontSize: 160,
              fontWeight: 300,
              lineHeight: 1,
              letterSpacing: '-0.06em',
              color: `rgb(${accentRgb})`,
              opacity: 0.58,
              transform: 'scaleX(1.1)',
              transformOrigin: 'left center',
              whiteSpace: 'nowrap',
            }}
          >
            ENTRY
          </div>
        </div>
        <div
          key="entry"
          className="rmv-tab-content flex flex-col justify-start gap-3"
          style={{ position: 'absolute', top: '15rem', left: '60%', width: 286, overflow: 'visible', paddingBottom: 24, paddingRight: 6, boxSizing: 'border-box', zIndex: 1 }}
        >
          {party.length === 0
            ? <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.3)' }}>엔트리가 비어있어요</span>
            : party.map((p, i) => {
              const types = (Array.isArray(p.types) ? p.types : [p.type]).filter(Boolean);
              const moves = (p.moves || []).slice(0, 4);
              const baseName = p.nameKo || p.name || '';
              const nickname = p.nickname && p.nickname !== baseName ? p.nickname : null;
              return (
                <div key={i} style={{ background: `rgba(${accentRgb}, 0.10)`, border: `1px solid rgba(${accentRgb}, 0.18)`, backdropFilter: 'blur(8px)', borderRadius: 14, padding: '10px 16px 10px 12px', display: 'flex', gap: 10, alignItems: 'center' }}>
                  <img
                    src={getPokeApiSprite(p)}
                    alt={getPokemonName(p)}
                    style={{ width: 96, height: 96, objectFit: 'contain', flexShrink: 0, imageRendering: 'pixelated' }}
                    onError={e => { e.target.src = getPokemonLocalIconUrl(p); }}
                  />
                  <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', paddingTop: 3 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{nickname || baseName}</span>
                      {nickname && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)' }}>{baseName}</span>}
                      {p.gender === 'male' && <GenderMale />}
                      {p.gender === 'female' && <GenderFemale />}
                      {types.map((t, ti) => {
                        const tc = TYPE_COLORS[t] || { bg: '#888', text: '#fff' };
                        return (
                          <span key={ti} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99, background: tc.bg, color: tc.text }}>
                            {t}
                          </span>
                        );
                      })}
                      {p.ability && (
                        <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                          <span style={{ color: `rgba(${accentRgb}, 0.55)`, fontWeight: 600, marginRight: 3 }}></span>{p.ability}
                        </span>
                      )}
                      {p.isPartner && <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>파트너</span>}
                    </div>
                    {moves.length > 0 && (
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 4, marginTop: 8 }}>
                        {moves.map((mv, mi) => {
                          const mc = getMoveTypeColor(mv);
                          return (
                            <span
                              key={`${getMoveKey(mv)}-${mi}`}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                lineHeight: 1.2,
                                color: mc.text,
                                background: mc.bg,
                                borderRadius: 999,
                                padding: '3px 7px',
                                textAlign: 'center',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {getMoveLabel(mv)}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          }
        </div>
        </>
      )}
    {/* 말풍선 — 메인 탭에서만 표시 */}
      {tab === 'main' && member.bio && (
        <div className="rmv-bio-slide" style={{ position: 'absolute', top: '6rem', right: 'calc(43% - 290px)', width: 'calc(43vw * 1/2)', zIndex: 1 }}>
          <span style={{
            position: 'absolute',
            top: 30, left: 10,
            fontSize: 80, fontWeight: 700, lineHeight: 1,
            fontFamily: 'Georgia, serif',
            color: `rgb(${accentRgb})`,
            transform: 'translateY(-70%)',
            zIndex: 3,
            WebkitTextStroke: '7px white',
            paintOrder: 'stroke fill',
          }}>{'“'}</span>
          <div style={{ filter: `drop-shadow(-9px 12px 0px rgba(${accentRgb},0.7))` }}>
            <div style={{
              position: 'relative',
              background: 'white',
              borderRadius: 5,
              padding: '24px 28px',
              opacity: 0.95,
            }}>
              <svg
                width={22} height={28}
                viewBox={'0 0 28 28'}
                style={{ position: 'absolute', top: 6, left: -21 }}
              >
                <path d={'M0,0 L28,0 L28,28 Z'} fill={'white'} />
              </svg>
              <span style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                fontSize: 30, color: '#333', fontWeight: 400, lineHeight: 1.2,
                wordBreak: 'keep-all',
                fontFamily: ['Aggravo', 'Georgia', 'serif'].join(', '),
                transform: 'translateY(8px)',
              }}>
                {member.bio}
              </span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── 메인 ── */
export default function MembersView({ members = {}, isLoading, currentUserId, titles = [] }) {
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const listRef = useRef(null);

  const memberList = getMemberList(members);

  useEffect(() => {
    memberList.forEach(member => {
      preloadMemberImage(getFaceImg(member));
      preloadMemberImage(getFullImg(member));
    });
  }, [members]);

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
    const full = getFullImg(member);
    if (full) preloadMemberImage(full);
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
    setActiveTab('main');
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
            top: 0, bottom: 0, left: '30%', right: activeTab === 'text' ? '23%' : '30%',
            zIndex: 50,
            overflow: 'visible',
            background: 'rgba(255, 255, 255)',
            boxShadow: '0 0 80px rgba(0,0,0,0.18), 0 0 200px rgba(0,0,0,0.08)',
            transition: 'transform 0.45s cubic-bezier(0.22,1,0.36,1), opacity 0.4s, right 0.45s cubic-bezier(0.22,1,0.36,1)',
            transform: showDetail ? 'translateX(0)' : isClosing ? 'translateX(-60px)' : 'translateX(60px)',
            opacity: showDetail ? 1 : 0,
            pointerEvents: showDetail ? 'auto' : 'none',
            backdropFilter: 'blur(6px)',
          }}
        >
          <MemberDetail
            member={members[selected.id] || selected}
            titles={titles}
            onBack={closeMember}
            onTabChange={setActiveTab}
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
