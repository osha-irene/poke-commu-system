import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, Award, User, Text, Users } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../utils/pokemonIconUtils';
import { getOwnedPokemonSpriteUrl } from '../../utils/pokemonImageUtils';
import { TYPE_COLORS } from '../../constants/pokemon';
import { POKEBALL_LIST } from '../../styles/theme';
import { translateMoveName } from '../../battle/utils/move-translations';
import movesData from '../../data/moves.json';
import abilitiesData from '../../data/abilities.json';
import CachedImage from '../common/CachedImage';
import { preloadDecodedImage } from '../../utils/imageCache';
import { useGame } from '../../contexts/GameContext';
import polaroidListWhite from '../../assets/members/polaroid-list-white.png';
import polaroidDetailWhite from '../../assets/members/polaroid-detail-white.png';
import npcButtonImg from '../../assets/members/npc-button.png';
import topButtonImg from '../../assets/members/top-button.png';
import memberBadgeImg from '../../assets/members/badge.png';
import ribbonSilhouetteImg from '../../assets/members/ribbon/ribbon-silhouette.png';
import ribbonCuteImg         from '../../assets/members/ribbon/ribbon-cute.png';
import ribbonIntelligenceImg  from '../../assets/members/ribbon/ribbon-intelligence.png';
import ribbonPowerfulImg      from '../../assets/members/ribbon/ribbon-powerful.png';
import ribbonCoolImg          from '../../assets/members/ribbon/ribbon-cool.png';
import ribbonBeautyImg        from '../../assets/members/ribbon/ribbon-beauty.png';
import badge1Img from '../../assets/members/badge/badge1.png';
import badge2Img from '../../assets/members/badge/badge2.png';
import badge3Img from '../../assets/members/badge/badge3.png';
import badge4Img from '../../assets/members/badge/badge4.png';
import badge5Img from '../../assets/members/badge/badge5.png';
import badge6Img from '../../assets/members/badge/badge6.png';
import badge7Img from '../../assets/members/badge/badge7.png';
import badge8Img from '../../assets/members/badge/badge8.png';
import chimeSound from '../../assets/sounds/chime.mp3';
import rubbingSound from '../../assets/sounds/rubbing.mp3';

const BADGE_IMGS = [badge1Img, badge2Img, badge3Img, badge4Img, badge5Img, badge6Img, badge7Img, badge8Img];
const BADGE_CLEANLINESS_DEFAULT = 2;
const BADGE_CLEANLINESS_MIN = 1;
const BADGE_CLEANLINESS_MAX = 5;
const BADGE_CLEANLINESS_WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const BADGE_SPARKLE_DURATION_MS = 24 * 60 * 60 * 1000;
const BADGE_SCRUB_STEP_MS = 2000;
const BADGE_SCRUB_DURATION_MS = BADGE_SCRUB_STEP_MS * (BADGE_CLEANLINESS_MAX - BADGE_CLEANLINESS_MIN);
const BADGE_DIRT_OPACITY = {
  1: 0,
  2: 0.08,
  3: 0.18,
  4: 0.32,
  5: 0.52,
};
const BADGE_SPARKLES = [
  { left: '18%', top: '28%', delay: '0s', size: 14 },
  { left: '33%', top: '13%', delay: '0.35s', size: 10 },
  { left: '62%', top: '20%', delay: '0.18s', size: 13 },
  { left: '79%', top: '39%', delay: '0.52s', size: 9 },
  { left: '22%', top: '66%', delay: '0.24s', size: 11 },
  { left: '50%', top: '76%', delay: '0.64s', size: 14 },
  { left: '72%', top: '67%', delay: '0.08s', size: 12 },
];

function clampBadgeCleanliness(value) {
  const level = Number(value);
  if (!Number.isFinite(level)) return BADGE_CLEANLINESS_DEFAULT;
  return Math.min(BADGE_CLEANLINESS_MAX, Math.max(BADGE_CLEANLINESS_MIN, Math.round(level)));
}

function getCurrentBadgeCleanliness(value, cleanedAt) {
  const base = clampBadgeCleanliness(value);
  const time = Number(cleanedAt);
  if (!Number.isFinite(time) || time <= 0) return base;
  const weeks = Math.max(0, Math.floor((Date.now() - time) / BADGE_CLEANLINESS_WEEK_MS));
  return clampBadgeCleanliness(base + weeks);
}

function normalizeBadgeCleanlinessArray(value, fallbackValue) {
  const source = Array.isArray(value) ? value : [];
  return BADGE_IMGS.map((_, i) => clampBadgeCleanliness(source[i] ?? fallbackValue));
}

function normalizeBadgeCleanedAtArray(value, fallbackValue) {
  const source = Array.isArray(value) ? value : [];
  return BADGE_IMGS.map((_, i) => Number(source[i] ?? fallbackValue) || 0);
}

function getCurrentBadgeCleanlinessLevels(member) {
  const baseLevels = normalizeBadgeCleanlinessArray(member.badgeCleanlinessLevels, member.badgeCleanliness);
  const cleanedAtLevels = normalizeBadgeCleanedAtArray(member.badgeCleanedAtLevels, member.badgeCleanedAt);
  return BADGE_IMGS.map((_, i) => getCurrentBadgeCleanliness(baseLevels[i], cleanedAtLevels[i]));
}

function normalizeDegrees(degrees) {
  return ((degrees % 360) + 360) % 360;
}

function getUnrotatedBadgeUv(event, rotation) {
  const rect = event.currentTarget.getBoundingClientRect();
  const x = event.clientX - (rect.left + rect.width / 2);
  const y = event.clientY - (rect.top + rect.height / 2);
  const rad = normalizeDegrees(rotation) * Math.PI / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const unrotatedX = x * cos + y * sin;
  const unrotatedY = -x * sin + y * cos;
  const u = unrotatedX / rect.width + 0.5;
  const v = unrotatedY / rect.height + 0.5;
  if (u < 0 || u > 1 || v < 0 || v > 1) return null;
  return { u, v };
}

function getBadgePieceIndexFromPointer(event, rotation, masks) {
  const uv = getUnrotatedBadgeUv(event, rotation);
  if (!uv) return null;
  if (masks?.length === BADGE_IMGS.length && masks.every(Boolean)) {
    for (let i = 0; i < masks.length; i += 1) {
      const mask = masks[i];
      const x = Math.min(mask.width - 1, Math.max(0, Math.floor(uv.u * mask.width)));
      const y = Math.min(mask.height - 1, Math.max(0, Math.floor(uv.v * mask.height)));
      if (mask.ctx.getImageData(x, y, 1, 1).data[3] > 24) return i;
    }
    return null;
  }
  const angle = normalizeDegrees(Math.atan2(uv.v - 0.5, uv.u - 0.5) * 180 / Math.PI);
  return Math.floor(((angle + 22.5) % 360) / 45);
}

const RIBBON_TYPE_IMGS = {
  cute:         ribbonCuteImg,
  intelligence: ribbonIntelligenceImg,
  powerful:     ribbonPowerfulImg,
  cool:         ribbonCoolImg,
  beauty:       ribbonBeautyImg,
};
const RIBBON_POSITIONS = [
  { left: '7%',  top: '8%'  }, { left: '50%', top: '8%'  }, { left: '93%', top: '8%'  },
  { left: '7%',  top: '37%' }, { left: '50%', top: '37%' }, { left: '93%', top: '37%' },
  { left: '50%', top: '66%' }, { left: '93%', top: '66%' },
];

const GenderMale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/>
  </svg>
);
const GenderFemale = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

/* ── 유틸 ── */
const getMemberList = (members) =>
  Object.entries(members || {})
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m?.name && !m.hidden && !m.isNPC)
    .sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

const getParty = m => (m?.caughtPokemon || []).filter(Boolean).slice(0, 6);
const getPartner = m => { const p = getParty(m); return p.find(x => x.isPartner) || p[0] || null; };
const getFaceImg = m => m?.profileImageThumb || m?.profileImage || m?.profileImageFull || m?.profileImageUrl || '';
const getFullImg     = m => m?.profileImageFull || m?.profileImage || m?.profileImageUrl || '';

const getPokemonImg = p => p?.sprite || p?.spriteUrl || p?.imageUrl || p?.iconUrl || '';
const getBallImageUrl = (p, allItems) => {
  if (p?.caughtWithBall && allItems?.length > 0) {
    const ballName = p.caughtWithBall.toLowerCase();
    const item = allItems.find(it => {
      const n = it.name?.toLowerCase();
      const en = it.nameEn?.toLowerCase();
      return n === ballName || en === ballName || n?.includes(ballName) || en?.includes(ballName);
    });
    if (item) return item.spriteUrl || item.imageUrl;
  }
  if (p?.ballImageUrl) return p.ballImageUrl;
  if (p?.caughtWithBall) {
    const search = p.caughtWithBall;
    const searchLower = search.toLowerCase();
    const ballInfo = POKEBALL_LIST.find(b =>
      b.name === search ||
      b.nameEn === searchLower.replace(/\s/g, '-') ||
      b.name.toLowerCase() === searchLower
    );
    if (ballInfo) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${ballInfo.nameEn}.png`;
  }
  return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
};
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
    if (m) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/${m[1]}.png`;
  }
  const id = p?.dexId || p?.nationalDex || p?.pokemonId || p?.id;
  if (id) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-ix/scarlet-violet/${id}.png`;
  return null;
};
const getEntryPokemonSprite = p => getOwnedPokemonSpriteUrl(p) || getPokemonLocalIconUrl(p);

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

const abilityList = Array.isArray(abilitiesData) ? abilitiesData : (abilitiesData.abilities || []);

const SIZE_DESC = {
  XXXS: '믿기 어려울 만큼 작은 크기인 것 같다.',
  XXS:  '매우 작은 크기인 것 같다.',
  XS:   '조금 작은 크기인 것 같다.',
  M:    '중간 정도의 크기인 것 같다.',
  XL:   '조금 큰 크기인 것 같다.',
  XXL:  '매우 큰 크기인 것 같다.',
  XXXL: '믿기 어려울 만큼 큰 크기인 것 같다.',
};
const getPokemonOriginLines = (p) => {
  const lines = [];
  if (p.isFromEgg) {
    lines.push((p.parents?.parent1 || p.parents?.parent2)
      ? `캠핑에서 생긴 알이 레벨 ${p.level}로 부화했다.`
      : `특별한 만남을 가지고 레벨 ${p.level}로 알에서 부화했다.`);
    if (p.parents?.parent1 || p.parents?.parent2) {
      const pr = p.parents;
      const p1 = pr.trainer1 ? `${pr.trainer1}의 ${pr.parent1}` : pr.parent1;
      const p2 = pr.trainer2 ? `${pr.trainer2}의 ${pr.parent2}` : pr.parent2;
      lines.push(p1 && p2 ? `${p1}와(과) ${p2}와(과) 성격이 닮은 것 같다.` : `${p1 || p2}와 성격이 닮은 것 같다.`);
    }
  } else if (p.isAdminGiven) {
    lines.push(`레벨 ${p.level}에 특별한 만남을 가졌다.`);
  } else {
    lines.push(`레벨 ${p.level}에 ${p.caughtLocation || p.metLocation || '야생'}에서 만났다.`);
  }
  if (p.sizeRank) {
    const sizeStr = SIZE_DESC[p.sizeRank] || '알 수 없는 크기인 것 같다.';
    lines.push(p.favoriteFlavor ? `${sizeStr} ${p.favoriteFlavor}을 좋아한다.` : sizeStr);
  } else if (p.favoriteFlavor) {
    lines.push(`${p.favoriteFlavor}을 좋아한다.`);
  }
  return lines;
};
const getAbilityDesc = (abilityName) => {
  if (!abilityName) return null;
  const n = abilityName.trim().toLowerCase();
  const found = abilityList.find(a =>
    a.name?.toLowerCase() === n || a.nameEn?.toLowerCase() === n
  );
  return found?.flavorTextKo || found?.shortEffectKo || found?.effectKo || null;
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
  const faceImg = getFaceImg(member);
  const [hovered, setHovered] = useState(false);

  const preloadFullImg = () => {
    const full = getFullImg(member);
    if (full && full !== faceImg) preloadDecodedImage(full);
  };

  const partner = member?.partnerPokemon ?? null;
  const partnerIcon = partner ? (getPokemonLocalIconUrl(partner) || partner?.iconUrl || partner?.sprite || '') : null;

  return (
    <div
      className="cursor-pointer"
      style={{
        position: 'relative',
        aspectRatio: '275 / 319',
        filter: 'drop-shadow(0 4px 10px rgba(0,0,0,0.18))',
        transform: hovered ? 'rotate(3deg)' : 'none',
        transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}
      onClick={onClick}
      onMouseEnter={() => { preloadFullImg(); setHovered(true); }}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 폴라로이드 프레임 */}
      <img
        src={polaroidListWhite}
        alt=""
        draggable={false}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill', pointerEvents: 'none', userSelect: 'none' }}
      />
      {/* 멤버 사진 */}
      <div style={{ position: 'absolute', left: '9.6%', top: '14%', width: '80.7%', height: '77.1%', overflow: 'hidden' }}>
        {faceImg ? (
          <CachedImage
            src={faceImg}
            alt={member.name}
            loading="eager"
            decoding="async"
            fetchPriority="high"
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(to bottom, #eef2ff, #f5f3ff)' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#4f46e5' }}>
              {member.name?.charAt(0)}
            </div>
          </div>
        )}
      </div>
      {/* 파트너 포켓몬 아이콘 — 우상단 */}
      {partnerIcon && (
        <div style={{
          position: 'absolute', top: 'calc(1% + 32px)', right: 'calc(-2% + 25px)',
          width: 36, height: 36,
          zIndex: 10,
          borderRadius: '50%',
          overflow: 'hidden',
          border: '2px solid white',
          background: 'rgba(255,255,255,0.9)',
          pointerEvents: 'none', userSelect: 'none',
        }}>
          <img src={partnerIcon} alt="" draggable={false} style={{
            width: 72, height: 72,
            maxWidth: 'none',
            imageRendering: 'pixelated',
            display: 'block',
            flexShrink: 0,
            marginLeft: -2,
            marginTop: -2,
          }} />
        </div>
      )}
      {/* 이름 — 폴라로이드 하단 여백 */}
      <div style={{
        position: 'absolute', bottom: '2.5%', left: 0, right: 0,
        textAlign: 'center',
        fontFamily: "'Aggravo', sans-serif",
        fontWeight: 300,
        fontSize: 27,
        color: '#1a1a1a',
        textShadow: '-2.5px -2.5px 0 #fff, 2.5px -2.5px 0 #fff, -2.5px 2.5px 0 #fff, 2.5px 2.5px 0 #fff, 0 -2.5px 0 #fff, 0 2.5px 0 #fff, -2.5px 0 0 #fff, 2.5px 0 0 #fff',
        letterSpacing: '0.02em',
        pointerEvents: 'none',
        userSelect: 'none',
      }}>
        {member.name}
      </div>
    </div>
  );
}

/* ── 멤버 상세 ── */
const TABS = [
  { id: 'main', label: '메인', Icon: User },
  { id: 'text', label: '설정', Icon: Text },
  { id: 'entry', label: '엔트리', iconSrc: '/img/pokeball.png' },
  { id: 'extra', label: '추가', Icon: Award },
  { id: 'relation', label: '관계', Icon: Users },
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
  return hslToRgb(h, clamp(s + 0.07, 0.50, 0.62), clamp(l + 0.08, 0.46, 0.58));
}

function getQuoteAccentColor(color) {
  if (!color) return [28, 55, 112];
  const [h, s, l] = rgbToHsl(color[0], color[1], color[2]);
  return hslToRgb(h, clamp(s + 0.06, 0.62, 0.92), clamp(l - 0.26, 0.14, 0.26));
}

const imgCache = {}; // url → accent color (모듈 레벨 캐시)

function MemberDetail({ member, members, titles, onBack, onTabChange, currentUserId, isAdmin }) {
  const { allItems = [] } = useGame();
  const isOwner = String(member.id || '') === String(currentUserId || '');
  const canEdit = isAdmin;
  const canEditRelations = isAdmin || isOwner;
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
    const transition = (id === 'text' || id === 'relation')
      ? 'rmv-char-to-text'
      : (tab === 'text' || tab === 'relation')
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
  const manualAccent = (() => {
    if (!member.accentColor) return null;
    const hex = member.accentColor.replace('#', '');
    return [parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)];
  })();
  const [accent, setAccent] = useState(() => manualAccent ?? imgCache[fullImg] ?? null);
  const [note, setNote] = useState(member.note || '');
  const [noteEditing, setNoteEditing] = useState(false);
  const [noteSaving, setNoteSaving] = useState(false);
  const [keywordTexts, setKeywordTexts] = useState(() => member.keywordTexts || ['', '', '']);
  const [kwEditing, setKwEditing] = useState(null);
  const [kwSaving, setKwSaving] = useState(false);
  const [etcText, setEtcText] = useState(() => member.etcText || '');
  const [etcEditing, setEtcEditing] = useState(false);
  const [etcSaving, setEtcSaving] = useState(false);
  const [partnerTextOpen, setPartnerTextOpen] = useState(false);
  const [partnerEditing, setPartnerEditing] = useState(false);
  const [partnerHovered, setPartnerHovered] = useState(false);
  const [hoveredEntryIndex, setHoveredEntryIndex] = useState(null);
  const [flippedEntryIndex, setFlippedEntryIndex] = useState(null);
  const [partnerTopOffset, setPartnerTopOffset] = useState(0.0);
  const [partnerImgHeight, setPartnerImgHeight] = useState(128);
  const [partnerText, setPartnerText] = useState(() => member.partnerText || '');
  const [savedPartnerText, setSavedPartnerText] = useState(() => member.partnerText || '');
  const [relations, setRelations] = useState(() => Array.isArray(member.relations) ? member.relations : []);
  const [relationEditIdx, setRelationEditIdx] = useState(null);
  const [relationDraft, setRelationDraft] = useState({ charName: '', intro: '', memo: '' });
  const [relationSaving, setRelationSaving] = useState(false);
  const [partnerTextSaving, setPartnerTextSaving] = useState(false);
  const [badgeRotation, setBadgeRotation] = useState(0);
  const [badgeHovering, setBadgeHovering] = useState(false);
  const [badgeCleanlinessLevels, setBadgeCleanlinessLevels] = useState(() => getCurrentBadgeCleanlinessLevels(member));
  const [badgeCleanedAtLevels, setBadgeCleanedAtLevels] = useState(() => normalizeBadgeCleanedAtArray(member.badgeCleanedAtLevels, member.badgeCleanedAt));
  const [badgeSparkleNow, setBadgeSparkleNow] = useState(() => Date.now());
  const [badgeScrubPreview, setBadgeScrubPreview] = useState({ index: null, progress: 0 });
  const [hoveredRibbon, setHoveredRibbon] = useState(null);
  const badgePrevAngleRef = useRef(null);
  const badgeScrubProgressRef = useRef(Array(8).fill(0));
  const badgePointerRef = useRef(null);
  const badgeLastScrubAtRef = useRef(0);
  const badgeMaskRef = useRef([]);
  const chimeAudioRef = useRef(null);
  const chimeAudioContextRef = useRef(null);
  const chimeAudioBufferRef = useRef(null);
  const chimeAudioLoadingRef = useRef(null);
  const rubbingAudioRef = useRef(null);
  const rubbingAudioContextRef = useRef(null);
  const rubbingAudioBufferRef = useRef(null);
  const rubbingAudioSourceRef = useRef(null);
  const rubbingAudioGainRef = useRef(null);
  const rubbingAudioLoadingRef = useRef(null);
  const badgeMouseDownRef = useRef(false);
  const [badgeSparkle, setBadgeSparkle] = useState({ index: null, key: 0 });
  const badgePieces = member.badgePieces || Array(8).fill(false);
  const ribbonPieces = member.ribbonPieces || Array(8).fill(false);
  const ribbonTypes  = member.ribbonTypes  || Array(8).fill(null);
  const canCleanBadge = String(member.id || '') === String(currentUserId || '');

  const playChimeSound = async (cleanlinessLevel = BADGE_CLEANLINESS_MIN) => {
    try {
      const level = clampBadgeCleanliness(cleanlinessLevel);
      const dirt = level - BADGE_CLEANLINESS_MIN;
      const playbackRate = Math.max(0.55, 1 - dirt * 0.11);
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        if (!chimeAudioContextRef.current) {
          chimeAudioContextRef.current = new AudioContextCtor();
        }
        const context = chimeAudioContextRef.current;
        if (context.state === 'suspended') await context.resume();
        if (!chimeAudioBufferRef.current) {
          if (!chimeAudioLoadingRef.current) {
            chimeAudioLoadingRef.current = fetch(chimeSound)
              .then(response => response.arrayBuffer())
              .then(arrayBuffer => context.decodeAudioData(arrayBuffer));
          }
          chimeAudioBufferRef.current = await chimeAudioLoadingRef.current;
        }
        const source = context.createBufferSource();
        const filter = context.createBiquadFilter();
        const gain = context.createGain();
        source.buffer = chimeAudioBufferRef.current;
        source.playbackRate.value = playbackRate;
        filter.type = 'lowpass';
        filter.frequency.value = Math.max(1800, 9000 - dirt * 1800);
        filter.Q.value = 0.6;
        gain.gain.value = 0.8;
        source.connect(filter);
        filter.connect(gain);
        gain.connect(context.destination);
        source.start(0);
        return;
      }
      if (!chimeAudioRef.current) chimeAudioRef.current = new Audio(chimeSound);
      const audio = chimeAudioRef.current;
      audio.preservesPitch = false;
      audio.mozPreservesPitch = false;
      audio.webkitPreservesPitch = false;
      audio.playbackRate = playbackRate;
      audio.volume = 0.8;
      audio.currentTime = 0;
      audio.play().catch(() => {});
    } catch {}
  };

  const stopRubbingSound = () => {
    if (rubbingAudioSourceRef.current) {
      try { rubbingAudioSourceRef.current.stop(); } catch {}
      try { rubbingAudioSourceRef.current.disconnect(); } catch {}
      rubbingAudioSourceRef.current = null;
    }
    const audio = rubbingAudioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
  };

  const playRubbingSound = async () => {
    try {
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        if (!rubbingAudioContextRef.current) {
          rubbingAudioContextRef.current = new AudioContextCtor();
        }
        const context = rubbingAudioContextRef.current;
        if (context.state === 'suspended') await context.resume();
        if (!rubbingAudioBufferRef.current) {
          if (!rubbingAudioLoadingRef.current) {
            rubbingAudioLoadingRef.current = fetch(rubbingSound)
              .then(response => response.arrayBuffer())
              .then(arrayBuffer => context.decodeAudioData(arrayBuffer));
          }
          rubbingAudioBufferRef.current = await rubbingAudioLoadingRef.current;
        }
        if (!rubbingAudioGainRef.current) {
          const gain = context.createGain();
          gain.gain.value = 0.55;
          gain.connect(context.destination);
          rubbingAudioGainRef.current = gain;
        }
        if (!rubbingAudioSourceRef.current) {
          const source = context.createBufferSource();
          source.buffer = rubbingAudioBufferRef.current;
          source.loop = true;
          source.connect(rubbingAudioGainRef.current);
          source.start(0);
          rubbingAudioSourceRef.current = source;
        }
        return;
      }
      if (!rubbingAudioRef.current) {
        rubbingAudioRef.current = new Audio(rubbingSound);
        rubbingAudioRef.current.loop = true;
        rubbingAudioRef.current.volume = 0.55;
      }
      const audio = rubbingAudioRef.current;
      if (audio.paused) audio.play().catch(() => {});
    } catch {}
  };

  const saveBadgeCleanlinessLevels = async (nextLevels, cleanedIndex, markCleaned = false) => {
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      const now = Date.now();
      const nextCleanedAtLevels = badgeCleanedAtLevels.map((value, i) => {
        if (i !== cleanedIndex) return value;
        return markCleaned ? now : 0;
      });
      setBadgeCleanedAtLevels(nextCleanedAtLevels);
      if (markCleaned) setBadgeSparkleNow(now);
      await update(ref(getDatabase(), `members/${member.id}`), {
        badgeCleanlinessLevels: nextLevels,
        badgeCleanedAtLevels: nextCleanedAtLevels,
      });
    } catch (error) {
      console.error('뱃지 청결도 저장 실패:', error);
    }
  };

  const scrubBadgeCleanliness = (event) => {
    if (!canCleanBadge || !badgeMouseDownRef.current) return;
    const point = { x: event.clientX, y: event.clientY };
    if (!badgePointerRef.current) {
      badgePointerRef.current = point;
      return;
    }
    const dx = point.x - badgePointerRef.current.x;
    const dy = point.y - badgePointerRef.current.y;
    badgePointerRef.current = point;
    if (Math.hypot(dx, dy) < 1.5) return;

    const pieceIndex = getBadgePieceIndexFromPointer(event, badgeRotation, badgeMaskRef.current);
    if (pieceIndex === null || !badgePieces[pieceIndex]) {
      setBadgeScrubPreview({ index: null, progress: 0 });
      stopRubbingSound();
      return;
    }

    playRubbingSound();
    const now = performance.now();
    const elapsed = badgeLastScrubAtRef.current ? Math.min(now - badgeLastScrubAtRef.current, 80) : 16;
    badgeLastScrubAtRef.current = now;
    badgeScrubProgressRef.current[pieceIndex] += elapsed;
    const currentLevel = badgeCleanlinessLevels[pieceIndex] ?? BADGE_CLEANLINESS_DEFAULT;

    if (currentLevel <= BADGE_CLEANLINESS_MIN) {
      const progress = Math.min(1, badgeScrubProgressRef.current[pieceIndex] / BADGE_SCRUB_STEP_MS);
      if (progress < 1) return;
      badgeScrubProgressRef.current[pieceIndex] = 0;
      setBadgeScrubPreview({ index: null, progress: 0 });
      saveBadgeCleanlinessLevels(badgeCleanlinessLevels, pieceIndex, true);
      setBadgeSparkle({ index: pieceIndex, key: Date.now() });
      return;
    }

    if (badgeScrubProgressRef.current[pieceIndex] < BADGE_SCRUB_STEP_MS) {
      setBadgeScrubPreview({ index: pieceIndex, progress: 0 });
      return;
    }

    const steps = Math.floor(badgeScrubProgressRef.current[pieceIndex] / BADGE_SCRUB_STEP_MS);
    badgeScrubProgressRef.current[pieceIndex] %= BADGE_SCRUB_STEP_MS;
    const nextLevel = Math.max(BADGE_CLEANLINESS_MIN, currentLevel - steps);
    const nextLevels = badgeCleanlinessLevels.map((level, i) => (
      i === pieceIndex ? nextLevel : level
    ));
    const reachedBrightest = nextLevel === BADGE_CLEANLINESS_MIN;
    if (reachedBrightest) {
      badgeScrubProgressRef.current[pieceIndex] = 0;
      setBadgeScrubPreview({ index: null, progress: 0 });
    } else {
      setBadgeScrubPreview({ index: pieceIndex, progress: 0 });
    }
    setBadgeCleanlinessLevels(nextLevels);
    saveBadgeCleanlinessLevels(nextLevels, pieceIndex, false);
  };

  const saveRelations = async (nextRelations) => {
    setRelationSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      await update(ref(getDatabase(), `members/${member.id}`), { relations: nextRelations });
      setRelations(nextRelations);
    } catch (err) {
      console.error('관계 저장 실패:', err);
    } finally {
      setRelationSaving(false);
    }
  };

  const findMemberFaceByName = (name) => {
    if (!name || !members) return null;
    const found = Object.values(members).find(m => m?.name === name);
    return found ? getFaceImg(found) : null;
  };

  const saveEtcText = async () => {
    if (!canEdit) return;
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
    if (!canEdit) return;
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
    if (!canEdit) return;
    setNoteSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      await update(ref(getDatabase(), `members/${member.id}`), { note: note.trim() });
    } finally {
      setNoteSaving(false);
      setNoteEditing(false);
    }
  };

  const savePartnerText = async () => {
    if (!canEdit) return false;
    const nextText = partnerText.trim();
    if (nextText === savedPartnerText) return true;
    setPartnerTextSaving(true);
    try {
      const { getDatabase, ref, update } = await import('firebase/database');
      await update(ref(getDatabase(), `members/${member.id}`), { partnerText: nextText });
      setPartnerText(nextText);
      setSavedPartnerText(nextText);
      return true;
    } catch (error) {
      console.error('파트너 설명 저장 실패:', error);
      alert('파트너 설명을 저장하지 못했습니다.');
      return false;
    } finally {
      setPartnerTextSaving(false);
    }
  };

  const party = getParty(member);
  const partner = party.find(p => p?.isPartner) || member.partnerPokemon || party[0] || null;
  const entry = party.filter(p => p !== partner);

  const accentRgb = accent ? `${accent[0]},${accent[1]},${accent[2]}` : '80,120,200';
  const selectedAccent = getSelectedAccentColor(accent);
  const selectedAccentRgb = `${selectedAccent[0]},${selectedAccent[1]},${selectedAccent[2]}`;
  const quoteAccent = getQuoteAccentColor(accent);
  const quoteAccentRgb = `${quoteAccent[0]},${quoteAccent[1]},${quoteAccent[2]}`;
  const partnerTextColor = (
    0.299 * selectedAccent[0] +
    0.587 * selectedAccent[1] +
    0.114 * selectedAccent[2]
  ) > 165 ? '#151515' : '#fff';
  const renderMarkedText = (text, markRgb = selectedAccentRgb) => {
    const parts = text.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*]+\*|\|[^|]+\|)/g);
    if (parts.length === 1) return text || null;
    return parts.map((part, k) => {
      if (/^\*\*\*[^*]+\*\*\*$/.test(part))
        return <strong key={k} style={{ color: `rgb(${markRgb})` }}>{part.slice(3, -3)}</strong>;
      if (/^\*\*[^*]+\*\*$/.test(part))
        return <strong key={k}>{part.slice(2, -2)}</strong>;
      if (/^\*[^*]+\*$/.test(part))
        return <em key={k}>{part.slice(1, -1)}</em>;
      if (/^\|[^|]+\|$/.test(part))
        return <mark key={k} style={{ background: `rgba(${markRgb}, 0.22)`, color: 'inherit', borderRadius: 3, padding: '1px 4px', fontWeight: 500 }}>{part.slice(1, -1)}</mark>;
      return part;
    });
  };
  const renderDetailTextLine = (line, j, markRgb = selectedAccentRgb) => {
    if (line.startsWith('#')) return (
      <div key={j} style={{ display: 'block', background: `rgba(${markRgb}, 0.25)`, borderRadius: 0, padding: '4px 14px', marginTop: '1.2em', marginBottom: '0.7em', marginLeft: '-0.5em', width: 'calc(100% + 1rem)', WebkitMaskImage: 'linear-gradient(to right, black 55%, transparent 85%)', maskImage: 'linear-gradient(to right, black 55%, transparent 85%)', fontSize: 16, fontWeight: 600 }}>
        {renderMarkedText(line.slice(1).trim(), markRgb) || ' '}
      </div>
    );
    if (line.startsWith('*')) return (
      <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.7em' }}>
        <span style={{ color: `rgb(${markRgb})`, fontWeight: 700, flexShrink: 0, lineHeight: 1.75 }}>•</span>
        <span>{renderMarkedText(line.slice(1).trim(), markRgb) || ' '}</span>
      </div>
    );
    return <p key={j} style={{ margin: 0, marginBottom: '0.7em', textIndent: '0.5em' }}>{renderMarkedText(line, markRgb) || ' '}</p>;
  };

  const handleImgLoad = () => {
    setImgLoaded(true);
    if (manualAccent) return; // 수동 색상 설정 시 자동 추출 스킵
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
    if (!partner) return;
    const url = getPokeApiSprite(partner);
    if (!url) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let topRow = img.naturalHeight;
        outer: for (let y = 0; y < img.naturalHeight; y++) {
          for (let x = 0; x < img.naturalWidth; x++) {
            if (data[(y * img.naturalWidth + x) * 4 + 3] > 10) { topRow = y; break outer; }
          }
        }
        const scale = Math.min(160 / img.naturalWidth, 160 / img.naturalHeight, 1);
        const renderedHeight = img.naturalHeight * scale;
        setPartnerTopOffset(topRow / img.naturalHeight);
        setPartnerImgHeight(renderedHeight);
      } catch { setPartnerTopOffset(0); }
    };
    img.onerror = () => setPartnerTopOffset(0);
    img.src = url;
  }, [partner?.sprite, partner?.dexId, partner?.nationalDex, partner?.id]);

  useEffect(() => {
    const memberChanged = prevMemberIdRef.current !== member.id;
    prevMemberIdRef.current = member.id;
    if (member.accentColor) {
      const hex = member.accentColor.replace('#', '');
      setAccent([parseInt(hex.slice(0,2),16), parseInt(hex.slice(2,4),16), parseInt(hex.slice(4,6),16)]);
      setImgLoaded(true);
    } else if (imgCache[fullImg]) {
      setImgLoaded(true);
      setAccent(imgCache[fullImg]);
    } else if (memberChanged) {
      setAccent(null);
      setImgLoaded(false);
    }
  }, [fullImg, member.id, member.accentColor]);


  useEffect(() => {
    const el = noteRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }, [note, noteEditing]);

  useEffect(() => {
    setCharImageOffset(0);
  }, [member.id, tab]);

  useEffect(() => {
    const nextText = member.partnerText || '';
    setPartnerText(nextText);
    setSavedPartnerText(nextText);
    setPartnerTextOpen(false);
  }, [member.id]);

  useEffect(() => {
    setRelations(Array.isArray(member.relations) ? member.relations : []);
    setRelationEditIdx(null);
    setRelationDraft({ charName: '', intro: '', memo: '' });
  }, [member.id]);

  useEffect(() => {
    let cancelled = false;
    Promise.all(BADGE_IMGS.map(src => new Promise(resolve => {
      const image = new Image();
      image.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(image, 0, 0);
          resolve({ ctx, width: canvas.width, height: canvas.height });
        } catch {
          resolve(null);
        }
      };
      image.onerror = () => resolve(null);
      image.src = src;
    }))).then(masks => {
      if (!cancelled) badgeMaskRef.current = masks;
    });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setBadgeCleanlinessLevels(getCurrentBadgeCleanlinessLevels(member));
    setBadgeCleanedAtLevels(normalizeBadgeCleanedAtArray(member.badgeCleanedAtLevels, member.badgeCleanedAt));
    badgeScrubProgressRef.current = Array(8).fill(0);
    badgePointerRef.current = null;
    badgeLastScrubAtRef.current = 0;
    setBadgeScrubPreview({ index: null, progress: 0 });
  }, [member.id, member.badgeCleanliness, member.badgeCleanedAt, member.badgeCleanlinessLevels, member.badgeCleanedAtLevels, tab]);

  useEffect(() => {
    const timer = setInterval(() => setBadgeSparkleNow(Date.now()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => () => {
    if (charTransitionTimerRef.current) clearTimeout(charTransitionTimerRef.current);
    if (charReturnTimerRef.current) clearTimeout(charReturnTimerRef.current);
    stopRubbingSound();
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
    <div className="relative flex" style={{ height: '100vh', minHeight: '100dvh' }} onWheel={member.charImageScrollEnabled && tab === 'main' ? moveScrollableCharacter : undefined}>



      {/* 좌측: 캐치프레이즈(뒤) + 캐릭터 이미지 */}
      <div className="relative" style={{ width: 'calc(100% - 240px)', flexShrink: 0, height: '100vh', minHeight: '100dvh', overflow: 'visible' }}>
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
        {fullImg && !member.profileImageFull ? (
          /* 두상 이미지만 있을 때 — polaroid-detail-white 프레임 */
          <div style={{
            position: 'fixed',
            top: 0, bottom: 0,
            left: 0, width: 'calc(100% - 240px)',
            display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
            paddingLeft: '0%',
            marginLeft: '-13%',
            zIndex: 15, pointerEvents: 'none',
          }}>
            <div style={{
              position: 'relative',
              aspectRatio: '628 / 747',
              height: '62vh',
              marginTop: '-15%',
              filter: 'drop-shadow(4px 5px 1px rgba(0,0,0,0.32))',
              transform: 'rotate(-8deg)',
            }}>
              {/* 폴라로이드 프레임 — 아래 레이어 */}
              <img src={polaroidDetailWhite} alt="" draggable={false} style={{
                position: 'absolute', inset: 0, width: '100%', height: '100%',
                objectFit: 'fill', pointerEvents: 'none', userSelect: 'none', zIndex: 1,
              }} />
              {/* 사진 — 프레임 위 레이어 */}
              <div style={{
                position: 'absolute', left: '6%', top: '15%', width: '88%', height: '80%',
                overflow: 'hidden', zIndex: 2,
              }}>
                <CachedImage
                  ref={imgRef}
                  src={fullImg}
                  alt={member.name}
                  crossOrigin="anonymous"
                  onLoad={handleImgLoad}
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'cover', objectPosition: 'top center',
                    display: 'block',
                  }}
                />
              </div>
            </div>
          </div>
        ) : fullImg ? (
          member.charImageScrollEnabled && tab === 'main' ? (
            <div
              className={`rmv-char-scroll${charTabTransition === 'rmv-char-from-text' ? ' rmv-char-scroll-from-text' : ''}`}
              style={{
                position: 'fixed',
                top: 0,
                bottom: 0,
                left: '-30vw',
                width: '100vw',
                overflow: 'hidden',
                boxSizing: 'border-box',
                zIndex: 15,
                pointerEvents: 'none',
              }}
            >
              <CachedImage
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
            <CachedImage
              ref={imgRef}
              src={fullImg}
              alt={member.name}
              crossOrigin="anonymous"
              onLoad={handleImgLoad}
              onError={() => setImgLoaded(true)}
              className={`rmv-char-base${(tab === 'text' || tab === 'relation') ? ' rmv-char-pushed' : ''}${charTabTransition ? ` ${charTabTransition}` : ''}`}
              style={{
                position: 'fixed',
                top: member.charImageTop ?? 0,
                left: member.charImageLeft ?? '9vw',
                height: 'auto',
                width: member.charImageWidth ?? '70vh',
                maxWidth: 'none',
                objectFit: 'contain',
                objectPosition: 'top center',
                zIndex: 15,
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
        const renderTextLine = (line, j) => renderDetailTextLine(line, j, selectedAccentRgb);
        return (
          <>
            <div className="rmv-text-bg-reveal" style={{ position: 'fixed', top: 0, bottom: 0, left: '22%', right: 0, overflow: 'hidden', zIndex: 16, background: 'linear-gradient(to right, transparent 0%, rgba(255,255,255,0.85) 12%, rgba(255,255,255,0.97) 28%, rgba(255,255,255,0.97) 100%)', pointerEvents: 'none' }} />
            <div
              className="rmv-text-scroll"
              style={{ position: 'absolute', top: 0, left: '30%', right: 0, bottom: 0, overflowY: 'auto', overflowX: 'hidden', zIndex: 17, '--rmv-accent-base': selectedAccentRgb }}
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
                            ref={el => { if (el && !el.dataset.initialized) { el.dataset.initialized = '1'; el.style.height = 'auto'; requestAnimationFrame(() => { el.style.height = el.scrollHeight + 'px'; }); el.focus({ preventScroll: true }); } }}
                            onChange={e => { setKeywordTexts(prev => { const n = [...prev]; n[i] = e.target.value; return n; }); const el = e.target; const sc = el.closest('.rmv-text-scroll'); const sv = sc?.scrollTop; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; if (sc != null && sv != null) sc.scrollTop = sv; }}
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
                        <div onClick={() => canEdit && setKwEditing(i)}
                          style={{ fontSize: 15, color: keywordTexts[i] ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.75, cursor: canEdit ? 'text' : 'default', minHeight: 40, paddingLeft: 18 }}>
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
                        ref={el => { if (el && !el.dataset.initialized) { el.dataset.initialized = '1'; el.style.height = 'auto'; requestAnimationFrame(() => { el.style.height = el.scrollHeight + 'px'; }); el.focus({ preventScroll: true }); } }}
                        onChange={e => { setEtcText(e.target.value); const el = e.target; const sc = el.closest('.rmv-text-scroll'); const sv = sc?.scrollTop; el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; if (sc != null && sv != null) sc.scrollTop = sv; }}
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
                    <div onClick={() => canEdit && setEtcEditing(true)}
                      style={{ fontSize: 15, color: etcText ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.75, cursor: canEdit ? 'text' : 'default', minHeight: 40, paddingLeft: 18 }}>
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

      {tab === 'extra' && (() => {
        const sparklingBadgeIndexes = badgeCleanlinessLevels
          .map((level, index) => {
            const cleanedAt = Number(badgeCleanedAtLevels[index]) || 0;
            const isRecentlyCleaned = cleanedAt > 0 && badgeSparkleNow - cleanedAt < BADGE_SPARKLE_DURATION_MS;
            return level === BADGE_CLEANLINESS_MIN && isRecentlyCleaned ? index : null;
          })
          .filter(index => index !== null);
        const getBadgeDirtOpacity = (index) => {
          const level = badgeCleanlinessLevels[index] ?? BADGE_CLEANLINESS_DEFAULT;
          return BADGE_DIRT_OPACITY[level] ?? BADGE_DIRT_OPACITY[BADGE_CLEANLINESS_DEFAULT];
        };
        const handleBadgeMove = (event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          const x = event.clientX - (rect.left + rect.width / 2);
          const y = event.clientY - (rect.top + rect.height / 2);
          const angle = Math.atan2(y, x) * 180 / Math.PI;
          if (badgePrevAngleRef.current !== null) {
            let delta = angle - badgePrevAngleRef.current;
            if (delta > 180) delta -= 360;
            if (delta < -180) delta += 360;
            setBadgeRotation(prev => prev + delta * 0.3);
          }
          badgePrevAngleRef.current = angle;
          scrubBadgeCleanliness(event);
        };
        return (
          <>
          {/* 배경 텍스트 */}
          <div style={{
            position: 'absolute',
            top: '2rem',
            left: 0,
            right: 0,
            zIndex: 0,
            pointerEvents: 'none',
            overflow: 'hidden',
          }}>
            <div className="rmv-achievements-text">
              <div style={{
                fontFamily: "'SUITE', sans-serif",
                fontSize: 130,
                fontWeight: 300,
                lineHeight: 1,
                letterSpacing: '-0.09em',
                color: `rgb(${accentRgb})`,
                opacity: 0.58,
                transform: 'scaleX(1.1)',
                transformOrigin: 'left center',
                whiteSpace: 'nowrap',
                marginLeft: '-5%',
              }}>
                ACHIEVEMENTS
              </div>
            </div>
          </div>
          {/* 회전하는 뱃지 실루엣 안에서만 배경 텍스트를 흐리게 처리 */}
          <div className="rmv-tab-content" style={{
            position: 'absolute',
            top: 'calc(8.5rem - 5px)', left: 'calc(39% + 3px)',
            width: 430, height: 430,
            zIndex: 5,
            pointerEvents: 'none',
            transform: `rotate(${badgeRotation}deg)`,
            transition: badgeHovering ? 'transform 0.6s ease-out' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
            willChange: 'transform',
            maskImage: `url(${memberBadgeImg})`,
            WebkitMaskImage: `url(${memberBadgeImg})`,
            maskSize: 'contain',
            WebkitMaskSize: 'contain',
            maskRepeat: 'no-repeat',
            WebkitMaskRepeat: 'no-repeat',
            maskPosition: 'center',
            WebkitMaskPosition: 'center',
            backdropFilter: 'blur(8px) saturate(1.12)',
            WebkitBackdropFilter: 'blur(8px) saturate(1.12)',
            background: 'rgba(255,255,255,0.18)',
            boxShadow: 'inset 0 0 32px rgba(255,255,255,0.24)',
          }}>
          </div>
          <div
            key="extra"
            className="rmv-tab-content"
            onClick={(event) => {
              event.stopPropagation();
              const pieceIndex = getBadgePieceIndexFromPointer(event, badgeRotation, badgeMaskRef.current);
              if (pieceIndex !== null && badgePieces[pieceIndex]) playChimeSound(badgeCleanlinessLevels[pieceIndex]);
            }}
            onMouseMove={handleBadgeMove}
            onMouseDown={(event) => {
              if (!canCleanBadge) return;
              badgeMouseDownRef.current = true;
              badgePointerRef.current = { x: event.clientX, y: event.clientY };
              badgeLastScrubAtRef.current = performance.now();
            }}
            onMouseUp={() => {
              badgeMouseDownRef.current = false;
              badgePointerRef.current = null;
              badgeLastScrubAtRef.current = 0;
              setBadgeScrubPreview({ index: null, progress: 0 });
              stopRubbingSound();
            }}
            onMouseEnter={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              const x = event.clientX - (rect.left + rect.width / 2);
              const y = event.clientY - (rect.top + rect.height / 2);
              badgePrevAngleRef.current = Math.atan2(y, x) * 180 / Math.PI;
              if (badgeMouseDownRef.current) {
                badgePointerRef.current = { x: event.clientX, y: event.clientY };
              }
              setBadgeHovering(true);
            }}
            onMouseLeave={() => {
              badgeMouseDownRef.current = false;
              badgePrevAngleRef.current = null;
              badgePointerRef.current = null;
              badgeLastScrubAtRef.current = 0;
              setBadgeScrubPreview({ index: null, progress: 0 });
              stopRubbingSound();
              setBadgeHovering(false);
            }}
            style={{ position: 'absolute', top: 'calc(8.5rem - 5px)', left: 'calc(39% + 3px)', width: 430, height: 430, display: 'flex', alignItems: 'center', justifyContent: 'center', boxSizing: 'border-box', zIndex: 10 }}
          >
            {/* accent 오버레이 — z=1 */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 1,
              transform: `rotate(${badgeRotation}deg)`,
              transition: badgeHovering ? 'transform 0.6s ease-out' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}>
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(to top, rgba(${accentRgb},0.10) 0%, rgba(${accentRgb},0.04) 100%)`,
                maskImage: `url(${memberBadgeImg})`,
                WebkitMaskImage: `url(${memberBadgeImg})`,
                maskSize: 'contain', WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center', WebkitMaskPosition: 'center',
              }} />
            </div>
            {/* 뱃지 조각 — z=3 */}
            <div style={{
              position: 'absolute', inset: 0, zIndex: 3,
              transform: `rotate(${badgeRotation}deg)`,
              transition: badgeHovering ? 'transform 0.6s ease-out' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
              willChange: 'transform',
            }}>
              {BADGE_IMGS.map((src, i) => (
                <img key={i} src={src} alt="" draggable={false} style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'contain', display: 'block',
                  opacity: badgePieces[i] ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }} />
              ))}
            </div>
            {BADGE_IMGS.map((src, i) => badgePieces[i] && (
              <div key={`dirt-${i}`} style={{
                position: 'absolute',
                inset: 0,
                zIndex: 4,
                pointerEvents: 'none',
                transform: `rotate(${badgeRotation}deg)`,
                transition: badgeHovering ? 'transform 0.6s ease-out' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
                opacity: getBadgeDirtOpacity(i),
                background: 'linear-gradient(145deg, rgba(8,10,14,0.94) 0%, rgba(34,31,28,0.9) 52%, rgba(0,0,0,0.98) 100%)',
                mixBlendMode: 'multiply',
                maskImage: `url(${src})`,
                WebkitMaskImage: `url(${src})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
                willChange: 'opacity, transform',
              }} />
            ))}
            {sparklingBadgeIndexes.map(index => (
              <div key={`${index}-${badgeCleanedAtLevels[index]}-${badgeSparkle.index === index ? badgeSparkle.key : 'active'}`} className="rmv-badge-sparkles" style={{
                position: 'absolute',
                inset: 0,
                zIndex: 6,
                pointerEvents: 'none',
                transform: `rotate(${badgeRotation}deg)`,
                transition: badgeHovering ? 'transform 0.6s ease-out' : 'transform 0.75s cubic-bezier(0.22, 1, 0.36, 1)',
                maskImage: `url(${BADGE_IMGS[index]})`,
                WebkitMaskImage: `url(${BADGE_IMGS[index]})`,
                maskSize: 'contain',
                WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat',
                WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center',
                WebkitMaskPosition: 'center',
              }}>
                {BADGE_SPARKLES.map((sparkle, i) => (
                  <span key={i} style={{
                    left: sparkle.left,
                    top: sparkle.top,
                    width: sparkle.size,
                    height: sparkle.size,
                    animationDelay: sparkle.delay,
                  }} />
                ))}
              </div>
            ))}
          </div>
          {/* 리본 — 90° 회전 W 꼭짓점, 하단 고정 */}
          <div className="rmv-tab-content" style={{
            position: 'fixed',
            bottom: -75,
            left: 'calc(30% + 33% - 62px)',
            width: 280,
            height: 480,
            pointerEvents: 'none',
            zIndex: 8,
          }}>
            {RIBBON_POSITIONS.map((pos, i) => (
              <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)', width: 145, height: 145, isolation: 'isolate', pointerEvents: ribbonTypes[i] ? 'auto' : 'none' }}
                onMouseEnter={() => setHoveredRibbon(i)}
                onMouseLeave={() => setHoveredRibbon(null)}
              >
                {/* 하단 그라데이션 복제 — 실루엣 마스크 안에서 multiply 기반 */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to top, rgba(${accentRgb},0.28) 0%, rgba(${accentRgb},0.10) 100%)`,
                  maskImage: `url(${ribbonSilhouetteImg})`,
                  WebkitMaskImage: `url(${ribbonSilhouetteImg})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  opacity: ribbonTypes[i] ? 0 : 1,
                  transition: 'opacity 0.4s ease',
                }} />
                {/* 실루엣 — multiply로 그라데이션과 합성 */}
                <img
                  src={ribbonSilhouetteImg}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'absolute', inset: 0,
                    width: '100%', height: 'auto',
                    objectFit: 'contain', display: 'block',
                    opacity: ribbonTypes[i] ? 0 : 0.45,
                    transition: 'opacity 0.4s ease',
                    filter: 'brightness(5) grayscale(1)',
                    mixBlendMode: 'multiply',
                  }}
                />
                {/* 컬러 — 수집 시 표시 (타입 지정된 슬롯만) */}
                {RIBBON_TYPE_IMGS[ribbonTypes[i]] && <img
                  src={RIBBON_TYPE_IMGS[ribbonTypes[i]]}
                  alt=""
                  draggable={false}
                  style={{
                    position: 'relative',
                    width: '100%', height: 'auto',
                    objectFit: 'contain',
                    opacity: ribbonTypes[i] ? 1 : 0,
                    transform: hoveredRibbon === i ? 'rotate(6deg)' : 'none',
                    transition: 'opacity 0.4s ease, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                />}
              </div>
            ))}
          </div>
          </>
        );
      })()}

            {/* 메인 탭 콘텐츠 */}
      {tab === 'main' && (
        <div
          key="main"
          className="rmv-tab-content flex flex-col justify-start gap-3"
          style={{ position: 'absolute', top: '16.5rem', left: '57%', width: 280, overflowX: 'visible', paddingBottom: 24, boxSizing: 'border-box', zIndex: 10 }}
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
              <div style={{ position: 'relative', height: 65, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 110, transform: 'translateY(16px)' }}>
                <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.25)', fontWeight: 500, letterSpacing: '0.05em' }}>파트너</span>
                <button
                  type="button"
                  onClick={() => { setPartnerTextOpen(open => !open); setPartnerEditing(false); }}
                  style={{ border: 0, padding: 0, background: 'transparent', fontSize: 22, fontWeight: 700, color: '#1a1a1a', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <span style={{ position: 'relative' }}>
                    {getPokemonName(partner)}
                    {partner.isShiny && <span style={{ position: 'absolute', left: '100%', top: '50%', transform: 'translateY(-50%)', color: '#e53e3e', fontSize: 13, lineHeight: 1, marginLeft: 3 }}>★</span>}
                  </span>
                </button>
                <img
                  src={getPokeApiSprite(partner) || getPokemonDbSprite(partner)}
                  alt={getPokemonName(partner)}
                  onClick={() => { setPartnerTextOpen(open => !open); setPartnerEditing(false); }}
                  onMouseEnter={() => setPartnerHovered(true)}
                  onMouseLeave={() => setPartnerHovered(false)}
                  style={{ position: 'absolute', bottom: '0', right: '-2rem', width: 'auto', height: 'auto', maxHeight: 160, maxWidth: 160, zIndex: 5, cursor: 'pointer' }}
                />
                {partnerHovered && (() => {
                  const imgH = partnerImgHeight;
                  const topPx = partnerTopOffset * imgH;
                  const bottomFromContainerBottom = imgH - topPx + 7;
                  return (
                    <div style={{ position: 'absolute', bottom: bottomFromContainerBottom, right: 18, zIndex: 10, pointerEvents: 'none' }}>
                      <div style={{ background: `rgb(${selectedAccentRgb})`, color: partnerTextColor, padding: '4px 10px', borderRadius: 8, fontSize: 12, fontWeight: 800, letterSpacing: '0.08em', whiteSpace: 'nowrap', boxShadow: '3px 3px 6px rgba(0,0,0,0.18)' }}>
                        CLICK!
                      </div>
                      <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: `7px solid rgb(${selectedAccentRgb})`, margin: '0 auto' }} />
                    </div>
                  );
                })()}
              </div>
            )}
            {partner && (
              <div
                style={{ display: 'grid', gridTemplateRows: partnerTextOpen ? '1fr' : '0fr', transition: 'grid-template-rows 0.38s cubic-bezier(0.16,1,0.3,1)' }}
              >
              <div style={{ overflow: 'hidden' }}>
              <div
                className={partnerTextOpen ? 'rmv-partner-text-in' : ''}
                onClick={() => { if (!partnerEditing && canEdit) setPartnerEditing(true); }}
                onWheel={e => e.stopPropagation()}
                style={{
                  position: 'relative',
                  zIndex: 6,
                  background: `rgba(${selectedAccentRgb}, ${savedPartnerText ? 1 : 0.45})`,
                  borderRadius: 8,
                  padding: '10px 12px',
                  marginTop: 2,
                  minHeight: 36,
                  maxHeight: 'calc(100vh - 25rem - 20px)',
                  overflowY: 'auto',
                  cursor: partnerEditing ? 'text' : (canEdit ? 'pointer' : 'default'),
                  transition: 'background 0.3s',
                }}
              >
                {partnerEditing ? (
                  <textarea
                    className="rmv-partner-text-input"
                    value={partnerText}
                    onChange={event => {
                      setPartnerText(event.target.value);
                      event.currentTarget.style.height = 'auto';
                      event.currentTarget.style.height = `${event.currentTarget.scrollHeight}px`;
                    }}
                    onBlur={async () => {
                      const saved = await savePartnerText();
                      if (saved) setPartnerEditing(false);
                    }}
                    onKeyDown={async event => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        const saved = await savePartnerText();
                        if (saved) setPartnerEditing(false);
                      }
                      if (event.key === 'Escape') {
                        setPartnerText(savedPartnerText);
                        setPartnerEditing(false);
                      }
                    }}
                    ref={element => {
                      if (!element) return;
                      element.style.height = 'auto';
                      element.style.height = `${element.scrollHeight}px`;
                      element.focus({ preventScroll: true });
                    }}
                    rows={4}
                    maxLength={1000}
                    placeholder="파트너에 대한 설명을 입력하세요."
                    disabled={partnerTextSaving}
                    style={{
                      width: '100%',
                      border: 0,
                      outline: 0,
                      padding: 0,
                      resize: 'none',
                      overflow: 'hidden',
                      background: 'transparent',
                      color: partnerTextColor,
                      caretColor: partnerTextColor,
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.65,
                      fontFamily: 'inherit',
                    }}
                  />
                ) : savedPartnerText ? (
                  <div
                    style={{
                      color: partnerTextColor,
                      fontSize: 14,
                      fontWeight: 500,
                      lineHeight: 1.65,
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'keep-all',
                    }}
                  >
                    {savedPartnerText}
                  </div>
                ) : (
                  <div style={{ color: `rgba(255,255,255,0.5)`, fontSize: 13, fontWeight: 500 }}>
                    클릭해서 설명 추가...
                  </div>
                )}
              </div>
              </div>
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
            <div
              onWheel={e => e.stopPropagation()}
              style={{ maxHeight: 'calc(100vh - 26rem)', overflowY: 'auto', overflowX: 'hidden', paddingRight: 2, paddingBottom: 48 }}
            >
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
                <div onClick={() => canEdit && setNoteEditing(true)}
                  style={{ minHeight: 48, fontSize: 15, color: note ? '#333' : 'rgba(0,0,0,0.25)', lineHeight: 1.6, cursor: canEdit ? 'text' : 'default', padding: '4px 2px', position: 'relative', zIndex: 1 }}>
                  {note
                    ? note.split('\n').map((line, i) => <p key={i} style={{ margin: 0, marginBottom: '1.4em', textIndent: '0.5em' }}>{line || ' '}</p>)
                    : (canEdit ? '클릭해서 메모 추가...' : '')}
                </div>
              )}
            </div>
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
            top: '2rem',
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
          onAnimationEnd={e => { e.currentTarget.style.animation = 'none'; }}
          style={{ position: 'absolute', top: '13rem', left: '55%', width: 320, overflow: 'visible', paddingBottom: 24, paddingRight: 6, boxSizing: 'border-box' }}
        >
          <style>{`
            @keyframes rmv-card-flip-in { from { transform: rotateY(-90deg) scaleX(0.8); opacity: 0; } to { transform: rotateY(0deg) scaleX(1); opacity: 1; } }
          `}</style>
          {party.length === 0
            ? <span style={{ fontSize: 14, color: 'rgba(0,0,0,0.3)' }}>엔트리가 비어있어요</span>
            : party.map((p, i) => {
              const types = (Array.isArray(p.types) ? p.types : [p.type]).filter(Boolean);
              const moves = (p.moves || []).slice(0, 4);
              const baseName = p.nameKo || p.name || '';
              const nickname = p.nickname && p.nickname !== baseName ? p.nickname : null;
              const isFlipped = flippedEntryIndex === i;
              const abilityDesc = getAbilityDesc(p.ability);
              const cardBg = hoveredEntryIndex === i && !isFlipped
                ? `rgb(${Math.round(255*0.9+(accent?.[0]??80)*0.1)},${Math.round(255*0.9+(accent?.[1]??120)*0.1)},${Math.round(255*0.9+(accent?.[2]??200)*0.1)})`
                : `rgba(${accentRgb}, 0.10)`;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoveredEntryIndex(i)}
                  onMouseLeave={() => setHoveredEntryIndex(null)}
                  onClick={() => setFlippedEntryIndex(isFlipped ? null : i)}
                  style={{ position: 'relative', zIndex: hoveredEntryIndex === i ? 20 : 1, cursor: 'pointer', borderRadius: 14, display: 'grid' }}
                >
                  {/* 앞면 */}
                  <div style={{
                    gridArea: '1/1',
                    borderRadius: 14,
                    background: cardBg,
                    backdropFilter: 'blur(8px)',
                    boxShadow: hoveredEntryIndex === i && !isFlipped ? '0 4px 20px rgba(0,0,0,0.10)' : 'none',
                    padding: '10px 16px 10px 12px',
                    display: 'flex', flexDirection: 'column', gap: 8,
                    transition: 'opacity 0.18s ease, transform 0.22s ease, background 0.18s ease',
                    opacity: isFlipped ? 0 : 1,
                    transform: isFlipped ? 'rotateY(90deg)' : (hoveredEntryIndex === i ? 'rotateY(-12deg)' : 'rotateY(0deg)'),
                    pointerEvents: isFlipped ? 'none' : 'auto',
                  }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <img src={getBallImageUrl(p, allItems)} alt="" style={{ position: 'absolute', top: 6, left: 6, width: 32, height: 32, objectFit: 'contain', imageRendering: 'pixelated', opacity: 0.75, pointerEvents: 'none' }} />
                      <img src={getEntryPokemonSprite(p)} alt={getPokemonName(p)} style={{ width: 96, height: 96, objectFit: 'contain', flexShrink: 0, imageRendering: 'auto' }} onError={e => { e.target.src = getPokemonLocalIconUrl(p); }} />
                      <div style={{ flex: 1, minWidth: 0, alignSelf: 'stretch', paddingTop: 3 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{nickname || baseName}</span>
                          {p.isShiny && <span aria-label="이로치" title="이로치" style={{ color: '#dc2626', fontSize: 11, lineHeight: 1, fontWeight: 900 }}>★</span>}
                          {nickname && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.38)' }}>{baseName}</span>}
                          {p.gender === 'male' && <GenderMale />}
                          {p.gender === 'female' && <GenderFemale />}
                          {types.map((t, ti) => {
                            const tc = TYPE_COLORS[t] || { bg: '#888', text: '#fff' };
                            return <span key={ti} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: tc.bg, color: tc.text }}>{t}</span>;
                          })}
                          {p.ability && <span style={{ fontSize: 11, color: '#555', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{p.ability}</span>}
                          {p.isPartner && <span style={{ fontSize: 11, fontWeight: 600, color: '#d97706' }}>파트너</span>}
                        </div>
                        {moves.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 6, marginTop: 8 }}>
                            {moves.map((mv, mi) => {
                              const mc = getMoveTypeColor(mv);
                              return <span key={`${getMoveKey(mv)}-${mi}`} style={{ fontSize: 10, fontWeight: 700, lineHeight: 1.2, color: mc.text, background: mc.bg, borderRadius: 999, padding: '3px 7px', textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getMoveLabel(mv)}</span>;
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                    {(() => {
                      const e = p.effort || p.evs || {};
                      const evs = [
                        { label: 'H', val: e.hp ?? 0 },
                        { label: 'A', val: e.attack ?? e.atk ?? 0 },
                        { label: 'B', val: e.defense ?? e.def ?? 0 },
                        { label: 'C', val: e.specialAttack ?? e.spa ?? 0 },
                        { label: 'D', val: e.specialDefense ?? e.spd ?? 0 },
                        { label: 'S', val: e.speed ?? e.spe ?? 0 },
                      ];
                      const hasAny = evs.some(ev => ev.val > 0);
                      if (!hasAny) return null;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 4, marginTop: -10, marginBottom: -4 }}>
                          {evs.map(({ label, val }) => (
                            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, background: '#fff', borderRadius: 999, padding: '0 4px', height: 14 }}>
                              <span style={{ fontSize: 10, fontWeight: 800, color: '#111', lineHeight: 1 }}>{label}</span>
                              <span style={{ fontSize: 10, fontWeight: 300, color: val > 0 ? '#111' : '#bbb', lineHeight: 1 }}>{val}</span>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                  {/* 뒷면 — 출신 메모 + 컨디션 */}
                  <div style={{
                    gridArea: '1/1',
                    borderRadius: 14,
                    background: `rgba(${accentRgb}, 0.92)`,
                    backdropFilter: 'blur(8px)',
                    padding: '12px 14px',
                    display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 7,
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                    opacity: isFlipped ? 1 : 0,
                    transform: isFlipped ? 'rotateY(0deg)' : 'rotateY(-90deg)',
                    pointerEvents: isFlipped ? 'auto' : 'none',
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {/* 출신 메모 */}
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.90)', lineHeight: 1.75 }}>
                        {getPokemonOriginLines(p).map((line, li) => (
                          <div key={li}>{line}</div>
                        ))}
                      </div>
                    </div>
                    {/* 컨디션 — 하단 고정 */}
                    {(() => {
                      const cond = p.condition || {};
                      const COND = [
                        { key: 'elegance',     label: '근사함' },
                        { key: 'beauty',       label: '아름다움' },
                        { key: 'cuteness',     label: '귀여움' },
                        { key: 'intelligence', label: '슬기로움' },
                        { key: 'strength',     label: '강인함' },
                      ];
                      const hasAny = COND.some(({ key }) => Number(cond[key] || 0) > 0);
                      if (!hasAny) return null;
                      return (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(44px, 1fr))', gap: 4 }}>
                          {COND.map(({ key, label }) => {
                            const val = Number(cond[key] || 0);
                            return (
                              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(255,255,255,0.18)', borderRadius: 999, padding: '2px 6px', height: 16 }}>
                                <span style={{ fontSize: 8, fontWeight: 800, color: '#fff', lineHeight: 1, whiteSpace: 'nowrap', overflow: 'visible' }}>{label}</span>
                                <span style={{ fontSize: 9, fontWeight: 300, color: val > 0 ? '#fff' : 'rgba(255,255,255,0.4)', lineHeight: 1, marginLeft: 'auto', flexShrink: 0 }}>{val}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })
          }
        </div>
        </>
      )}
      {/* 관계 탭 콘텐츠 */}
      {tab === 'relation' && (() => {
        const [ar, ag, ab] = selectedAccent;
        const kwTextColor = (0.299 * ar + 0.587 * ag + 0.114 * ab) > 160 ? '#111' : '#fff';
        return (
          <>
            {/* 우상단 추가 버튼 */}
            {canEditRelations && relationEditIdx !== 'new' && (
              <button
                onClick={() => { setRelationEditIdx('new'); setRelationDraft({ charName: '', intro: '', memo: '' }); }}
                onMouseEnter={e => e.currentTarget.style.filter = 'brightness(1.15)'}
                onMouseLeave={e => e.currentTarget.style.filter = ''}
                style={{ position: 'absolute', top: 195, right: 28, width: 36, height: 36, borderRadius: '50%', border: 'none', background: `rgb(${selectedAccentRgb})`, color: kwTextColor, fontSize: 22, fontWeight: 300, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', zIndex: 20, transition: 'filter 0.15s ease' }}
              >
                +
              </button>
            )}
            {/* 배경 텍스트 — achievements 탭과 동일한 방식 */}
            <div style={{ position: 'absolute', top: '2rem', left: 0, right: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
              <div className="rmv-achievements-text">
                <div style={{ fontFamily: "'SUITE', sans-serif", fontSize: 145, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.09em', color: `rgb(${accentRgb})`, opacity: 0.58, transform: 'scaleX(1.1)', transformOrigin: 'right center', whiteSpace: 'nowrap', textAlign: 'right', marginRight: '-5%' }}>
                  RELATIONS
                </div>
              </div>
            </div>
            <div
              style={{ position: 'fixed', top: 185, left: '40%', right: 0, bottom: 0, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', overscrollBehavior: 'contain', zIndex: 17, display: 'flex', flexDirection: 'column' }}
            >
              <div style={{ paddingTop: 42, paddingBottom: 40, paddingLeft: 32, paddingRight: 72, boxSizing: 'border-box', flex: '0 0 auto', minHeight: '100%' }}>
                {/* 관계 목록 */}
                {relations.map((rel, idx) => {
                  const isEditing = relationEditIdx === idx;
                  const faceImg = findMemberFaceByName(rel.charName);
                  if (isEditing) {
                    return (
                      <div key={idx} style={{ marginBottom: 14, padding: '14px', background: `rgba(${selectedAccentRgb}, 0.08)`, borderRadius: 12 }}>
                        <input
                          value={relationDraft.charName}
                          onChange={e => setRelationDraft(d => ({ ...d, charName: e.target.value }))}
                          placeholder="캐릭터 이름"
                          autoFocus
                          style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}
                        />
                        <input
                          value={relationDraft.intro}
                          onChange={e => setRelationDraft(d => ({ ...d, intro: e.target.value }))}
                          placeholder="한줄소개"
                          style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}
                        />
                        <textarea
                          value={relationDraft.memo}
                          onChange={e => setRelationDraft(d => ({ ...d, memo: e.target.value }))}
                          placeholder="메모"
                          rows={3}
                          style={{ display: 'block', width: '100%', resize: 'none', padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.65 }}
                        />
                        <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                          <button
                            onClick={async () => {
                              const next = relations.map((r, i) => i === idx ? { charName: relationDraft.charName, intro: relationDraft.intro, memo: relationDraft.memo } : r);
                              await saveRelations(next);
                              setRelationEditIdx(null);
                            }}
                            disabled={relationSaving}
                            style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: `rgb(${selectedAccentRgb})`, color: kwTextColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                          >
                            {relationSaving ? '저장 중...' : '저장'}
                          </button>
                          <button
                            onClick={() => { setRelationEditIdx(null); setRelationDraft({ charName: '', intro: '', memo: '' }); }}
                            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.08)', color: '#555', fontSize: 13, cursor: 'pointer' }}
                          >
                            취소
                          </button>
                          <button
                            onClick={async () => {
                              const next = relations.filter((_, i) => i !== idx);
                              await saveRelations(next);
                              setRelationEditIdx(null);
                            }}
                            disabled={relationSaving}
                            style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(220,38,38,0.08)', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div
                      key={idx}
                      className="rmv-relation-card"
                      onClick={() => { if (canEditRelations) { setRelationEditIdx(idx); setRelationDraft({ charName: rel.charName || '', intro: rel.intro || '', memo: rel.memo || '' }); } }}
                      style={{ position: 'relative', zIndex: 1, display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', marginBottom: 10, borderRadius: 12, background: 'rgba(255,255,255,0.95)', borderBottom: '1px solid rgba(0,0,0,0.07)', cursor: canEditRelations ? 'pointer' : 'default' }}
                    >
                      <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, border: `2px solid rgba(${selectedAccentRgb}, 0.3)`, background: `rgba(${selectedAccentRgb}, 0.1)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {faceImg ? (
                          <img src={faceImg} alt={rel.charName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }} />
                        ) : (
                          <span style={{ fontSize: 18, fontWeight: 700, color: `rgb(${selectedAccentRgb})` }}>{rel.charName?.charAt(0) || '?'}</span>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, color: `rgb(${selectedAccentRgb})`, fontSize: 16, marginBottom: rel.intro ? 3 : 4, lineHeight: 1.2 }}>{rel.charName || '(이름 없음)'}</div>
                        {rel.intro && (
                          <div style={{ fontSize: 13, fontWeight: 700, color: `rgba(${selectedAccentRgb}, 0.55)`, lineHeight: 1.5, marginBottom: rel.memo ? 5 : 0 }}>{rel.intro}</div>
                        )}
                        {rel.memo && (
                          <div style={{ fontSize: 14, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rel.memo}</div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* 새 관계 추가 */}
                {relationEditIdx === 'new' && (
                  <div style={{ marginTop: 20, padding: '14px', background: `rgba(${selectedAccentRgb}, 0.08)`, borderRadius: 12 }}>
                    <input
                      value={relationDraft.charName}
                      onChange={e => setRelationDraft(d => ({ ...d, charName: e.target.value }))}
                      placeholder="캐릭터 이름"
                      autoFocus
                      style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 15, fontWeight: 700, fontFamily: 'inherit' }}
                    />
                    <input
                      value={relationDraft.intro}
                      onChange={e => setRelationDraft(d => ({ ...d, intro: e.target.value }))}
                      placeholder="한줄소개"
                      style={{ display: 'block', width: '100%', marginBottom: 8, padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit' }}
                    />
                    <textarea
                      value={relationDraft.memo}
                      onChange={e => setRelationDraft(d => ({ ...d, memo: e.target.value }))}
                      placeholder="메모"
                      rows={3}
                      style={{ display: 'block', width: '100%', resize: 'none', padding: '6px 10px', border: 'none', outline: 'none', background: 'rgba(255,255,255,0.7)', borderRadius: 7, fontSize: 14, fontFamily: 'inherit', lineHeight: 1.65 }}
                    />
                    <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                      <button
                        onClick={async () => {
                          if (!relationDraft.charName.trim()) return;
                          const next = [...relations, { charName: relationDraft.charName.trim(), intro: relationDraft.intro.trim(), memo: relationDraft.memo.trim() }];
                          await saveRelations(next);
                          setRelationEditIdx(null);
                          setRelationDraft({ charName: '', intro: '', memo: '' });
                        }}
                        disabled={relationSaving || !relationDraft.charName.trim()}
                        style={{ flex: 1, padding: '6px 0', borderRadius: 7, border: 'none', background: `rgb(${selectedAccentRgb})`, color: kwTextColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                      >
                        {relationSaving ? '저장 중...' : '추가'}
                      </button>
                      <button
                        onClick={() => { setRelationEditIdx(null); setRelationDraft({ charName: '', intro: '', memo: '' }); }}
                        style={{ padding: '6px 12px', borderRadius: 7, border: 'none', background: 'rgba(0,0,0,0.08)', color: '#555', fontSize: 13, cursor: 'pointer' }}
                      >
                        취소
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        );
      })()}

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
                display: 'block',
                fontSize: 30, color: '#333', fontWeight: 400, lineHeight: 1.2,
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
                whiteSpace: 'pre-wrap',
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
export default function MembersView({ members = {}, isLoading, currentUserId, isAdmin = false, titles = [], onSwitchTab }) {
  const [selected, setSelected] = useState(null);
  const [transitioning, setTransitioning] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [activeTab, setActiveTab] = useState('main');
  const listRef = useRef(null);

  const memberList = getMemberList(members);

  useEffect(() => {
    memberList.forEach(member => {
      preloadDecodedImage(getFaceImg(member));
      preloadDecodedImage(getFullImg(member));
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
    if (full) preloadDecodedImage(full);
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
        {onSwitchTab && (
          <button
            onClick={() => onSwitchTab('npcs')}
            className="tab-switch-btn"
            style={{ position: 'absolute', top: -50, left: -70, zIndex: 10, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src={npcButtonImg} alt="NPC 보기" style={{ width: 150, height: 'auto', display: 'block' }} />
          </button>
        )}
        {!showDetail && createPortal(
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="tab-switch-btn"
            style={{ position: 'fixed', bottom: 30, right: 'calc(max(0px, (100vw - 1548px) / 2) + 230px)', zIndex: 100, background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
          >
            <img src={topButtonImg} alt="맨 위로" style={{ width: 80, height: 'auto', display: 'block' }} />
          </button>,
          document.body
        )}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(5, 1fr)',
          gap: '10px',
          padding: '20px 20px 60px',
          margin: '0 -40px',
        }}>
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
            members={members}
            titles={titles}
            onBack={closeMember}
            onTabChange={setActiveTab}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
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
