import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';
import { getOwnedPokemonSpriteUrl } from '../../../utils/pokemonImageUtils';
import { findPokemonTemplate } from '../../../utils/pokemonBaseStats';
import { getTitleDisplayStyle } from '../../../utils/titleDisplay';
import { TYPE_COLORS, POKEBALL_LIST } from '../../../constants/pokemon';
import { translateMoveName } from '../../../battle/utils/move-translations';
import movesData from '../../../data/moves.json';
import { getAbilityKoreanName } from '../../../utils/abilityUtils';
import CachedImage from '../../common/CachedImage';
import { useMemberCaughtPokemon } from '../../../hooks/members/useMemberCaughtPokemon';
import { useGame } from '../../../contexts/GameContext';
import badge1Img from '../../../assets/members/badge/badge1.png';
import badge2Img from '../../../assets/members/badge/badge2.png';
import badge3Img from '../../../assets/members/badge/badge3.png';
import badge4Img from '../../../assets/members/badge/badge4.png';
import badge5Img from '../../../assets/members/badge/badge5.png';
import badge6Img from '../../../assets/members/badge/badge6.png';
import badge7Img from '../../../assets/members/badge/badge7.png';
import badge8Img from '../../../assets/members/badge/badge8.png';
import ribbonSilhouetteImg from '../../../assets/members/ribbon/ribbon-silhouette.png';
import ribbonCuteImg from '../../../assets/members/ribbon/ribbon-cute.png';
import ribbonIntelligenceImg from '../../../assets/members/ribbon/ribbon-intelligence.png';
import ribbonPowerfulImg from '../../../assets/members/ribbon/ribbon-powerful.png';
import ribbonCoolImg from '../../../assets/members/ribbon/ribbon-cool.png';
import ribbonBeautyImg from '../../../assets/members/ribbon/ribbon-beauty.png';

const BADGE_IMGS = [badge1Img, badge2Img, badge3Img, badge4Img, badge5Img, badge6Img, badge7Img, badge8Img];
const RIBBON_TYPE_IMGS = {
  cute: ribbonCuteImg,
  intelligence: ribbonIntelligenceImg,
  powerful: ribbonPowerfulImg,
  cool: ribbonCoolImg,
  beauty: ribbonBeautyImg,
};
const RIBBON_POSITIONS = [
  { left: '18%', top: '8%'  }, { left: '50%', top: '8%'  }, { left: '82%', top: '8%'  },
  { left: '18%', top: '37%' }, { left: '50%', top: '37%' }, { left: '82%', top: '37%' },
  { left: '34%', top: '66%' }, { left: '66%', top: '66%' },
];

const GenderMale = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="10" cy="14" r="5"/><line x1="19" y1="5" x2="14.14" y2="9.86"/><polyline points="15 5 19 5 19 9"/>
  </svg>
);
const GenderFemale = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ec4899" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="9" r="5"/><line x1="12" y1="14" x2="12" y2="21"/><line x1="9" y1="18" x2="15" y2="18"/>
  </svg>
);

const MOVE_TYPE_COLORS = {
  normal:{bg:'#A8A878',text:'#fff'},fire:{bg:'#F08030',text:'#fff'},water:{bg:'#6890F0',text:'#fff'},
  electric:{bg:'#F8D030',text:'#3b2f00'},grass:{bg:'#78C850',text:'#fff'},ice:{bg:'#98D8D8',text:'#1e4f5f'},
  fighting:{bg:'#C03028',text:'#fff'},poison:{bg:'#A040A0',text:'#fff'},ground:{bg:'#E0C068',text:'#4b3510'},
  flying:{bg:'#A890F0',text:'#fff'},psychic:{bg:'#F85888',text:'#fff'},bug:{bg:'#A8B820',text:'#fff'},
  rock:{bg:'#B8A038',text:'#fff'},ghost:{bg:'#705898',text:'#fff'},dragon:{bg:'#7038F8',text:'#fff'},
  dark:{bg:'#705848',text:'#fff'},steel:{bg:'#B8B8D0',text:'#303048'},fairy:{bg:'#EE99AC',text:'#fff'},
};
const _moveList = Array.isArray(movesData) ? movesData : (movesData.moves || []);
const _moveTypeByKey = new Map(_moveList.flatMap(m => [m.id, m.nameEn, m.name].filter(Boolean).map(k => [String(k).toLowerCase(), m.type])));
const getMoveKey = m => typeof m === 'string' ? m : m?.moveId || m?.id || m?.nameEn || m?.name || '';
const getMoveLabel = m => { const k = getMoveKey(m); return translateMoveName(k) || m?.nameKo || m?.name || k || '—'; };
const getMoveTypeColor = m => {
  const rawType = typeof m === 'string' ? null : (m?.type || m?.typeEn || m?.moveType);
  const type = String(rawType || _moveTypeByKey.get(String(getMoveKey(m)).toLowerCase()) || 'normal').toLowerCase();
  return MOVE_TYPE_COLORS[type] || { bg: '#777', text: '#fff' };
};

/* ── 유틸 ── */
const getMemberList = (members) =>
  Object.entries(members || {})
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m?.name && !m.hidden && !m.isNPC)
    .sort((a, b) => {
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

const getFaceImg = m => m?.profileImageThumb || m?.profileImage || m?.profileImageFull || m?.profileImageUrl || '';
const getPokemonName = p => p?.nickname || p?.nameKo || p?.name || '포켓몬';

const isGalarianFarfetchd = p => {
  const values = [
    p?.nameEn,
    p?.name,
    p?.species,
    p?.formName,
    p?.formVariant,
    p?.regionalForm,
  ].filter(Boolean).map(v => String(v).toLowerCase());
  const joined = values.join(' ');

  return (
    (joined.includes('farfetch') || joined.includes('파오리')) &&
    (joined.includes('galar') || joined.includes('가라르'))
  );
};

const isLillipup = p => {
  const values = [
    p?.nameEn,
    p?.name,
    p?.species,
    p?.formName,
    p?.formVariant,
  ].filter(Boolean).map(v => String(v).toLowerCase());
  const joined = values.join(' ');

  return joined.includes('lillipup') || joined.includes('요테리');
};

const isHerdier = p => {
  const values = [
    p?.nameEn,
    p?.name,
    p?.species,
    p?.formName,
    p?.formVariant,
  ].filter(Boolean).map(v => String(v).toLowerCase());
  const joined = values.join(' ');

  return joined.includes('herdier') || joined.includes('하데리어');
};

const isStoutland = p => {
  const values = [
    p?.nameEn,
    p?.name,
    p?.species,
    p?.formName,
    p?.formVariant,
  ].filter(Boolean).map(v => String(v).toLowerCase());
  const joined = values.join(' ');

  return joined.includes('stoutland') || joined.includes('그랑불');
};

const isSirfetchd = p => {
  const values = [
    p?.nameEn,
    p?.name,
    p?.species,
    p?.formName,
    p?.formVariant,
  ].filter(Boolean).map(v => String(v).toLowerCase());
  const joined = values.join(' ');

  return joined.includes('sirfetchd') || joined.includes('창파나이트');
};

const getPokemonDbSprite = p => {
  if (isGalarianFarfetchd(p)) {
    return 'https://img.pokemondb.net/sprites/sword-shield/normal/farfetchd-galarian.png';
  }
  if (isLillipup(p)) {
    return 'https://img.pokemondb.net/sprites/sword-shield/normal/lillipup.png';
  }
  if (isStoutland(p)) {
    return 'https://img.pokemondb.net/sprites/sword-shield/normal/stoutland.png';
  }
  if (isHerdier(p)) {
    return 'https://img.pokemondb.net/sprites/sword-shield/normal/herdier.png';
  }
  if (isSirfetchd(p)) {
    return 'https://img.pokemondb.net/sprites/sword-shield/normal/sirfetchd.png';
  }
  if (p?.regionalForm || p?.formVariant) {
    return getOwnedPokemonSpriteUrl(p) || getPokemonLocalIconUrl(p);
  }
  const name = p?.nameEn || p?.name;
  if (name) return `https://img.pokemondb.net/sprites/scarlet-violet/normal/${name.toLowerCase().replace(/\s+/g, '-')}.png`;
  return getOwnedPokemonSpriteUrl(p) || getPokemonLocalIconUrl(p);
};

const getEntryPokemonSprite = (p, allPokemonMaster = []) =>
  getOwnedPokemonSpriteUrl(p, findPokemonTemplate(p, allPokemonMaster) || p) || getPokemonLocalIconUrl(p);

const getBallUrl = (p, allItems = []) => {
  // caughtWithBall(볼 이름)이 최신/권위있는 값이고, ballImageUrl은 캐치/수정 시점에 찍어둔
  // 스냅샷일 뿐이라 어긋날 수 있다(예: 관리자가 "포획볼"을 바꿔도 ballImageUrl은 재계산되지
  // 않아 예전 볼 스프라이트로 남는 케이스 - MemberPokemonEditMode.jsx 참고). 그래서 매번
  // caughtWithBall로 실제 볼을 다시 찾고, 그마저 못 찾을 때만 캐시된 ballImageUrl로 보완한다.
  if (p?.caughtWithBall && allItems.length > 0) {
    const ballName = p.caughtWithBall.toLowerCase();
    const item = allItems.find(it => {
      const n = it.name?.toLowerCase();
      const en = it.nameEn?.toLowerCase();
      return n === ballName || en === ballName || n?.includes(ballName) || en?.includes(ballName);
    });
    if (item?.spriteUrl || item?.imageUrl) return item.spriteUrl || item.imageUrl;
  }
  if (p?.caughtWithBall) {
    const s = p.caughtWithBall.toLowerCase();
    const info = POKEBALL_LIST.find(b =>
      b.name === p.caughtWithBall || b.name.toLowerCase() === s || b.nameEn === s.replace(/\s/g, '-')
    );
    if (info) return `https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/${info.nameEn}.png`;
  }
  if (p?.ballImageUrl) return p.ballImageUrl;
  return 'https://cdn.jsdelivr.net/gh/PokeAPI/sprites@master/sprites/items/poke-ball.png';
};

const getParty = m => {
  const partner = m?.partnerPokemon;
  const caught = (m?.caughtPokemon || []).slice(0, 6).filter(Boolean);
  const rest = caught.filter(p => !p?.isPartner);
  return partner
    ? [{ ...partner, _isPartner: true }, ...rest].slice(0, 6)
    : rest.slice(0, 6);
};

const getPartner = m =>
  m?.partnerPokemon || (m?.caughtPokemon || []).filter(Boolean).find(p => p?.isPartner) || null;

/* ── 텍스트 파서 ── */
const ACCENT = '#5a9a30';

const renderInline = (text) => {
  const source = String(text || '');
  const parts = source.split(/(\*\*\*[^*]+\*\*\*|\*\*[^*]+\*\*|\*[^*\s][^*]*\*|\|[^|]+\|)/g);
  if (parts.length === 1) return source || null;
  return parts.map((part, k) => {
    if (/^\*\*\*[^*]+\*\*\*$/.test(part)) {
      return <strong key={k} style={{ color: ACCENT }}>{part.slice(3, -3)}</strong>;
    }
    if (/^\*\*[^*]+\*\*$/.test(part)) {
      return <strong key={k}>{part.slice(2, -2)}</strong>;
    }
    if (/^\*[^*\s][^*]*\*$/.test(part)) {
      return <em key={k}>{part.slice(1, -1)}</em>;
    }
    if (/^\|[^|]+\|$/.test(part)) {
      return <mark key={k} style={{ background: 'rgba(90,154,48,0.18)', color: 'inherit', borderRadius: 3, padding: '1px 4px', fontWeight: 600 }}>{part.slice(1, -1)}</mark>;
    }
    return part;
  });
};

const renderTextLine = (line, j) => {
  if (/^#{1,6}\s+/.test(line)) {
    const level = Math.min(line.match(/^#+/)?.[0].length || 1, 3);
    const fontSize = level === 1 ? '1.02rem' : level === 2 ? '0.96rem' : '0.9rem';
    return (
      <div
        key={j}
        style={{
          margin: j === 0 ? '0 0 0.65em' : '1.2em 0 0.65em',
          color: ACCENT,
          fontSize,
          fontWeight: 800,
          lineHeight: 1.45,
        }}
      >
        {renderInline(line.replace(/^#{1,6}\s+/, '').trim()) || ' '}
      </div>
    );
  }
  if (/^[-*]\s+/.test(line)) return (
    <div key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: '0.65em' }}>
      <span style={{ color: ACCENT, fontWeight: 700, flexShrink: 0, lineHeight: 1.85 }}>•</span>
      <span style={{ lineHeight: 1.85 }}>{renderInline(line.replace(/^[-*]\s+/, '').trim()) || ' '}</span>
    </div>
  );
  return <p key={j} style={{ margin: 0, marginBottom: '0.65em', textIndent: '0.5em' }}>{renderInline(line) || ' '}</p>;
};

/* ── 공통 스타일 ── */
const SEC_TITLE = {
  fontSize: '1rem', fontWeight: 800,
  color: '#1a2e10', letterSpacing: '0.02em',
  marginBottom: 10,
};

const SEC_DIVIDER = {
  border: 'none', borderTop: '1px solid #e8ede4',
  margin: '20px 0',
};

/* ── 타입 뱃지 ── */
function TypeBadge({ type }) {
  const c = TYPE_COLORS[type] || { bg: '#777', text: '#FFF' };
  return (
    <span style={{
      display: 'inline-block', padding: '2px 5px',
      borderRadius: 4, background: c.bg, color: c.text,
      fontSize: '0.58rem', fontWeight: 700, lineHeight: 1.4, letterSpacing: '0.02em',
    }}>{type}</span>
  );
}

/* ── 목록 카드 (3열 그리드) ── */
function MemberCard({ member, isRevealed, onTap }) {
  const faceImg = getFaceImg(member);

  return (
    <div
      onClick={onTap}
      style={{
        borderRadius: 12,
        overflow: 'hidden',
        cursor: 'pointer',
        position: 'relative',
        aspectRatio: '3 / 4',
        background: '#fff',
      }}
    >
      {/* 이미지 */}
      {faceImg
        ? <CachedImage src={faceImg} alt={member.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center', display: 'block' }}
          />
        : <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: '#fff' }}>
            {member.name?.charAt(0)}
          </div>
      }
      {/* 1탭 시 어두워지며 이름 정중앙 표시 */}
      <div style={{
        position: 'absolute', inset: 0,
        background: isRevealed ? 'rgba(0,0,0,0.52)' : 'rgba(0,0,0,0)',
        transition: 'background 0.2s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        pointerEvents: 'none',
      }}>
        {isRevealed && (
          <span style={{
            color: '#fff', fontWeight: 800,
            fontSize: '0.88rem', lineHeight: 1.3,
            textShadow: '0 1px 10px rgba(0,0,0,0.7)',
            textAlign: 'center', padding: '0 6px',
          }}>{member.name}</span>
        )}
      </div>
    </div>
  );
}

/* ── 메인 탭 ── */
function MainTab({ member, title, partner }) {
  const faceImg = getFaceImg(member);
  const keywords = (member.keywords || []).filter(Boolean);
  const infoRows = [
    member.age      && { label: '나이',   value: member.age },
    member.birthday && { label: '생일',   value: member.birthday },
    member.height   && { label: '키',     value: member.height },
    member.weight   && { label: '몸무게', value: member.weight },
    member.hometown && { label: '출신',   value: member.hometown },
  ].filter(Boolean);

  return (
    <div>
      {/* 따옴표 + 한마디 (bio) */}
      {member.bio && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', gap: 4, marginBottom: 10 }}>
          <span style={{
            fontSize: '2rem',
            fontFamily: "'Noto Serif KR', 'Georgia', 'Times New Roman', serif",
            color: '#b8d098', lineHeight: 0.8, flexShrink: 0,
          }}>&ldquo;</span>
          <span style={{
            fontSize: '0.88rem', color: '#444', fontWeight: 600,
            lineHeight: 1.5, textAlign: 'right', maxWidth: '72%',
          }}>{renderInline(member.bio)}</span>
        </div>
      )}

      {/* 이름 + 이미지 — 가로 배치 */}
      <div style={{ display: 'flex', gap: 14, alignItems: 'stretch', marginBottom: 16 }}>
        {/* 왼쪽: 칭호 + 이름 + 키워드 + 캐치프레이즈 + 파트너 */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {title && (
            <div style={{
              fontSize: '0.72rem', color: '#aaa', fontWeight: 700,
              letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 4,
              ...getTitleDisplayStyle(title, { compactFontSize: '0.64rem' }),
              ...(title && Array.from(title).length > 10 ? { letterSpacing: '0.08em' } : {}),
            }}>{title}</div>
          )}
          <div style={{
            fontFamily: "'Noto Serif KR', serif",
            fontSize: 'clamp(1.8rem, 8vw, 2.6rem)',
            fontWeight: 900, color: '#111', lineHeight: 1.05,
            marginBottom: 10,
          }}>{member.name}</div>
          {keywords.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
              {keywords.map((kw, i) => (
                <span key={i} style={{ fontSize: '0.82rem', color: '#e05588', fontWeight: 700 }}>#{kw}</span>
              ))}
            </div>
          )}
          {member.catchphrase && (
            <p style={{ fontSize: '0.85rem', color: '#555', lineHeight: 1.8, margin: '0 0 12px' }}>
              {renderInline(member.catchphrase.replace(/\n/g, ' '))}
            </p>
          )}
          {partner && (() => {
            const sprite = getPokemonDbSprite(partner);
            const icon = getPokemonLocalIconUrl(partner);
            const src = sprite || icon;
            return (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 'auto', paddingTop: 8 }}>
                {src && <img src={src} alt={getPokemonName(partner)} style={{ width: sprite ? 90 : 72, height: sprite ? 90 : 72, objectFit: 'contain', flexShrink: 0 }} />}
                <div style={{ paddingBottom: 8 }}>
                  <div style={{ fontSize: '0.6rem', color: '#8aaa78', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 3 }}>파트너</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, color: '#1a2e10', lineHeight: 1.2 }}>{getPokemonName(partner)}</div>
                  {partner.nickname && partner.nameKo && (
                    <div style={{ fontSize: '0.72rem', color: '#888', marginTop: 1 }}>{partner.nameKo}</div>
                  )}
                  {(() => {
                    const partnerTypes = Array.from(new Set(
                      [...(Array.isArray(partner.types) ? partner.types : []), partner.type, partner.type2].filter(Boolean)
                    ));
                    return partnerTypes.length > 0 && (
                      <div style={{ display: 'flex', gap: 3, marginTop: 5, flexWrap: 'wrap' }}>
                        {partnerTypes.map(t => <TypeBadge key={t} type={t} />)}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })()}
        </div>

        {/* 오른쪽: 이미지 */}
        {faceImg && (
          <CachedImage
            src={faceImg}
            alt={member.name}
            style={{
              width: 165, height: 240,
              objectFit: 'cover', objectPosition: 'top center',
              borderRadius: 14, flexShrink: 0, display: 'block',
            }}
          />
        )}
      </div>

      {/* 정보 그리드 */}
      {infoRows.length > 0 && (
        <>
          <hr style={SEC_DIVIDER} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 0' }}>
            {infoRows.map((row, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span style={{ fontSize: '0.68rem', color: '#8aaa78', fontWeight: 700, minWidth: 32, flexShrink: 0 }}>
                  {row.label}
                </span>
                <span style={{ fontSize: '0.9rem', color: '#1a2e10', fontWeight: 700 }}>
                  {row.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* 메모 */}
      {member.note && (
        <>
          <hr style={SEC_DIVIDER} />
          <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.85 }}>
            {member.note.split('\n').map(renderTextLine)}
          </div>
        </>
      )}

      {/* 파트너 포켓몬 소개 */}
      {partner && member.partnerText && (
        <>
          <hr style={SEC_DIVIDER} />
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 8 }}>
            <span style={{ fontSize: '0.58rem', color: '#8aaa78', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', flexShrink: 0 }}>Partner</span>
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1a2e10', whiteSpace: 'nowrap' }}>{getPokemonName(partner)}</span>
          </div>
          <div style={{ fontSize: '0.9rem', color: '#666', lineHeight: 1.85 }}>
            {member.partnerText.split('\n').map(renderTextLine)}
          </div>
        </>
      )}
    </div>
  );
}

/* ── 프로필 탭: keywords + keywordTexts + etcText (데스크탑 2탭) ── */
function ProfileTab({ member }) {
  const keywords = member.keywords || [];
  const keywordTexts = member.keywordTexts || [];
  const etcText = member.etcText || '';

  const sections = [
    ...keywords.slice(0, 3).map((kw, i) => ({
      label: kw ? `#${kw}` : null,
      text: keywordTexts[i] || '',
    })).filter(s => s.label),
    ...(etcText ? [{ label: '기타', text: etcText }] : []),
  ];

  if (!sections.length) {
    return <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>내용 없음</p>;
  }

  return (
    <div>
      {sections.map((s, i) => (
        <React.Fragment key={i}>
          {i > 0 && <hr style={SEC_DIVIDER} />}
          <div>
            <div style={{ ...SEC_TITLE, fontSize: '1.05rem', color: '#5a9a30' }}>{s.label}</div>
            {s.text
              ? <div style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.85 }}>
                  {s.text.split('\n').map(renderTextLine)}
                </div>
              : <p style={{ fontSize: '0.82rem', color: '#ccc', margin: 0, fontStyle: 'italic' }}>내용 없음</p>
            }
          </div>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ── 엔트리 탭 ── */
function EntryTab({ party, allItems = [], allPokemonMaster = [] }) {
  if (!party.length) {
    return <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>포켓몬 없음</p>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {party.map((p, i) => {
        const types = (Array.isArray(p?.types) ? p.types : [p?.type, p?.type2]).filter(Boolean);
        const ballUrl = getBallUrl(p, allItems);
        const baseName = p?.nameKo || p?.name || '';
        const nickname = p?.nickname && p.nickname !== baseName ? p.nickname : null;
        const moves = (p?.moves || []).slice(0, 4);
        const isPartner = p._isPartner;

        return (
          <div key={i} style={{
            position: 'relative',
            background: 'rgba(74,154,8,0.09)',
            borderRadius: 14, padding: '10px 14px 10px 10px',
            display: 'flex', gap: 10, alignItems: 'center',
          }}>
            <img src={ballUrl} alt="" style={{
              position: 'absolute', top: 6, left: 6,
              width: 27, height: 27, objectFit: 'contain',
              imageRendering: 'pixelated', opacity: 0.75, pointerEvents: 'none',
            }} />
            <div
              className="pokemon-bg-sprite"
              aria-label={getPokemonName(p)}
              role="img"
              style={{
                width: 96,
                height: 96,
                minWidth: 96,
                minHeight: 96,
                flexShrink: 0,
                backgroundImage: `url(${getEntryPokemonSprite(p, allPokemonMaster)})`,
                backgroundSize: '100%',
                backgroundPosition: 'center center',
                backgroundRepeat: 'no-repeat',
                position: 'relative',
                imageRendering: 'pixelated',
              }}
            />
            <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap', marginBottom: 4 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#1a1a1a' }}>{nickname || baseName}</span>
                {p?.isShiny && <span style={{ color: '#dc2626', fontSize: 11, fontWeight: 900 }}>★</span>}
                {nickname && <span style={{ fontSize: 11, color: 'rgba(0,0,0,0.35)' }}>{baseName}</span>}
                {p?.gender === 'male' && <GenderMale />}
                {p?.gender === 'female' && <GenderFemale />}
                {isPartner && <span style={{ fontSize: 10, fontWeight: 700, color: '#d97706' }}>파트너</span>}
                {types.map((t, ti) => {
                  const tc = TYPE_COLORS[t] || { bg: '#888', text: '#fff' };
                  return <span key={ti} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 4, background: tc.bg, color: tc.text }}>{t}</span>;
                })}
                {p?.level && <span style={{ fontSize: 10, fontWeight: 600, color: '#666', whiteSpace: 'nowrap' }}>Lv.{p.level}</span>}
                {p?.ability && <span style={{ fontSize: 10, color: '#666', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{getAbilityKoreanName(p.ability) || p.ability}</span>}
              </div>
              {moves.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                  {moves.map((mv, mi) => {
                    const mc = getMoveTypeColor(mv);
                    return (
                      <span key={mi} style={{
                        fontSize: 10, fontWeight: 700, lineHeight: 1.2,
                        color: mc.text, background: mc.bg,
                        borderRadius: 999, padding: '3px 7px',
                        textAlign: 'center', whiteSpace: 'nowrap',
                        overflow: 'hidden', textOverflow: 'ellipsis',
                      }}>
                        {getMoveLabel(mv)}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const BADGE_CLEANLINESS_DEFAULT = 2;
const BADGE_CLEANLINESS_MIN = 1;
const BADGE_CLEANLINESS_MAX = 5;
const BADGE_CLEANLINESS_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
const BADGE_DIRT_OPACITY = { 1: 0, 2: 0.08, 3: 0.18, 4: 0.32, 5: 0.52 };

function clampBadgeCleanliness(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return BADGE_CLEANLINESS_DEFAULT;
  return Math.min(BADGE_CLEANLINESS_MAX, Math.max(BADGE_CLEANLINESS_MIN, Math.round(n)));
}
function getCurrentBadgeCleanliness(value, cleanedAt) {
  const base = clampBadgeCleanliness(value);
  const t = Number(cleanedAt);
  if (!Number.isFinite(t) || t <= 0) return base;
  const periods = Math.max(0, Math.floor((Date.now() - t) / BADGE_CLEANLINESS_PERIOD_MS));
  return clampBadgeCleanliness(base + periods);
}
function getCleanlinessLevels(member) {
  const src = Array.isArray(member.badgeCleanlinessLevels) ? member.badgeCleanlinessLevels : [];
  const cleanedAtSrc = Array.isArray(member.badgeCleanedAtLevels) ? member.badgeCleanedAtLevels : [];
  return BADGE_IMGS.map((_, i) => getCurrentBadgeCleanliness(src[i] ?? member.badgeCleanliness, cleanedAtSrc[i] ?? member.badgeCleanedAt));
}

/* ── 업적 탭 ── */
function AchievementsTab({ member }) {
  const badgePieces = member.badgePieces || Array(8).fill(false);
  const ribbonTypes  = member.ribbonTypes  || Array(8).fill(null);
  const cleanlinessLevels = getCleanlinessLevels(member);

  return (
    <div style={{ paddingBottom: 24 }}>
      {/* 뱃지 — 겹쳐서 하나의 원형으로 */}
      <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16, textAlign: 'center', letterSpacing: '0.08em' }}>BADGE</div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 48 }}>
        <div style={{ position: 'relative', width: 270, height: 270 }}>
          {BADGE_IMGS.map((src, i) => (
            badgePieces[i] ? (
              <img
                key={i}
                src={src}
                alt=""
                style={{
                  position: 'absolute', inset: 0,
                  width: '100%', height: '100%',
                  objectFit: 'contain',
                  opacity: 1,
                  transition: 'opacity 0.3s',
                }}
              />
            ) : (
              <div
                key={i}
                aria-hidden="true"
                style={{
                  position: 'absolute', inset: 0,
                  background: '#c8c8c8',
                  opacity: 0.72,
                  pointerEvents: 'none',
                  maskImage: `url(${src})`,
                  WebkitMaskImage: `url(${src})`,
                  maskSize: 'contain', WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center', WebkitMaskPosition: 'center',
                  transition: 'opacity 0.3s',
                }}
              />
            )
          ))}
          {/* 청결도 오물 오버레이 */}
          {BADGE_IMGS.map((src, i) => badgePieces[i] && (
            <div
              key={`dirt-${i}`}
              style={{
                position: 'absolute', inset: 0,
                pointerEvents: 'none',
                opacity: BADGE_DIRT_OPACITY[cleanlinessLevels[i]] ?? 0,
                background: 'linear-gradient(145deg, rgba(8,10,14,0.94) 0%, rgba(34,31,28,0.9) 52%, rgba(0,0,0,0.98) 100%)',
                mixBlendMode: 'multiply',
                maskImage: `url(${src})`,
                WebkitMaskImage: `url(${src})`,
                maskSize: 'contain', WebkitMaskSize: 'contain',
                maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
                maskPosition: 'center', WebkitMaskPosition: 'center',
                transition: 'opacity 0.4s',
              }}
            />
          ))}
        </div>
      </div>

      {/* 리본 그리드 */}
      <div style={{ fontSize: 14, color: '#aaa', marginBottom: 16, textAlign: 'center', letterSpacing: '0.08em' }}>RIBBON</div>
      <div style={{ position: 'relative', width: 300, height: 320, margin: '0 auto' }}>
        {RIBBON_POSITIONS.map((pos, i) => (
          <div key={i} style={{ position: 'absolute', left: pos.left, top: pos.top, transform: 'translate(-50%, -50%)', width: 82, height: 82 }}>
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0.08)',
              maskImage: `url(${ribbonSilhouetteImg})`,
              WebkitMaskImage: `url(${ribbonSilhouetteImg})`,
              maskSize: 'contain', WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat', WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center', WebkitMaskPosition: 'center',
              opacity: ribbonTypes[i] ? 0 : 1,
              transition: 'opacity 0.3s',
            }} />
            <img
              src={ribbonSilhouetteImg}
              alt=""
              style={{
                position: 'absolute', inset: 0,
                width: '100%', height: 'auto',
                objectFit: 'contain',
                opacity: ribbonTypes[i] ? 0 : 0.35,
                transition: 'opacity 0.3s',
                filter: 'brightness(5) grayscale(1)',
                mixBlendMode: 'multiply',
              }}
            />
            {RIBBON_TYPE_IMGS[ribbonTypes[i]] && (
              <img
                src={RIBBON_TYPE_IMGS[ribbonTypes[i]]}
                alt=""
                style={{ position: 'absolute', inset: 0, width: '100%', height: 'auto', objectFit: 'contain' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── 관계 탭 ── */
function RelationsTab({ member, allMembers = {} }) {
  const relations = Array.isArray(member.relations) ? member.relations : [];
  if (!relations.length) {
    return <p style={{ color: '#bbb', fontSize: '0.85rem', textAlign: 'center', padding: '40px 0' }}>관계 없음</p>;
  }
  const findFace = (name) => {
    const found = Object.values(allMembers).find(m => m?.name === name || m?.charName === name);
    return found?.profileImageThumb || found?.profileImage || null;
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {relations.map((rel, i) => {
        const face = findFace(rel.charName);
        return (
          <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', padding: '12px 14px', borderRadius: 12, background: 'rgba(74,154,8,0.07)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'rgba(90,154,48,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {face
                ? <img src={face} alt={rel.charName} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
                : <span style={{ fontSize: 17, fontWeight: 700, color: '#5a9a30' }}>{rel.charName?.charAt(0) || '?'}</span>
              }
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#3a6a20', fontSize: 15, marginBottom: rel.intro ? 2 : 0 }}>{rel.charName || '(이름 없음)'}</div>
              {rel.intro && <div style={{ fontSize: 12, fontWeight: 700, color: '#7aaa50', lineHeight: 1.5, marginBottom: rel.memo ? 4 : 0 }}>{rel.intro}</div>}
              {rel.memo && <div style={{ fontSize: 13, color: '#555', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{rel.memo}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── 멤버 상세 ── */
const TABS = [
  { key: 'main', label: 'MAIN' },
  { key: 'profile', label: 'PROFILE' },
  { key: 'entry', label: 'ENTRY' },
  { key: 'achievement', label: 'BADGE' },
  { key: 'relation', label: 'RELATIONS' },
];

function MemberDetail({ member, titles, onBack, allPokemonMaster = [] }) {
  const [activeTab, setActiveTab] = useState('main');
  const [leaving, setLeaving] = useState(false);
  const { allItems = [], members: allMembers = {} } = useGame();
  const party = getParty(member);
  const partner = getPartner(member);
  const title = member.title && member.title !== 'none'
    ? titles.find(t => t.id === member.title)?.label || ''
    : '';

  const handleBack = () => {
    setLeaving(true);
    setTimeout(onBack, 500);
  };

  const changeTab = (nextKey) => {
    if (nextKey === activeTab) return;
    setActiveTab(nextKey);
  };

  const renderTabContent = (key) => {
    switch (key) {
      case 'main': return <MainTab member={member} title={title} partner={partner} />;
      case 'profile': return <ProfileTab member={member} />;
      case 'entry': return <EntryTab party={party} allItems={allItems} allPokemonMaster={allPokemonMaster} />;
      case 'achievement': return <AchievementsTab member={member} />;
      case 'relation': return <RelationsTab member={member} allMembers={allMembers} />;
      default: return null;
    }
  };

  const trackRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef({ startX: 0, startY: 0, dragging: false, dx: 0 });

  const activeIdx = TABS.findIndex(tab => tab.key === activeTab);
  const panelPercent = 100 / TABS.length;

  const setTrackTransform = (extraPx, withTransition) => {
    if (!trackRef.current) return;
    trackRef.current.style.transition = withTransition ? 'transform 0.3s ease-out' : 'none';
    trackRef.current.style.transform = `translateX(calc(-${activeIdx * panelPercent}% + ${extraPx}px))`;
  };

  const handleTouchStart = (e) => {
    const t = e.touches[0];
    dragRef.current = { startX: t.clientX, startY: t.clientY, dragging: false, dx: 0 };
  };

  const handleTouchMove = (e) => {
    const t = e.touches[0];
    const dx = t.clientX - dragRef.current.startX;
    const dy = t.clientY - dragRef.current.startY;

    if (!dragRef.current.dragging) {
      if (Math.abs(dx) < 10 || Math.abs(dx) < Math.abs(dy)) return;
      dragRef.current.dragging = true;
    }

    let followDx = dx;
    if (activeIdx === 0 && dx > 0) followDx = dx * 0.35;
    if (activeIdx === TABS.length - 1 && dx < 0) followDx = dx * 0.35;
    dragRef.current.dx = followDx;
    setTrackTransform(followDx, false);
  };

  const handleTouchEnd = (e) => {
    const { dragging, dx } = dragRef.current;
    if (!dragging) return;

    const containerWidth = containerRef.current?.offsetWidth || 0;
    const threshold = containerWidth ? containerWidth / 2 : 60;
    if (dx <= -threshold && activeIdx < TABS.length - 1) {
      e.stopPropagation();
      setTrackTransform(0, true);
      changeTab(TABS[activeIdx + 1].key);
    } else if (dx >= threshold && activeIdx > 0) {
      e.stopPropagation();
      setTrackTransform(0, true);
      changeTab(TABS[activeIdx - 1].key);
    } else {
      setTrackTransform(0, true);
    }
    dragRef.current = { startX: 0, startY: 0, dragging: false, dx: 0 };
  };

  return (
    <div className="mmv-detail-scroll" style={{
      position: 'fixed', inset: 0, zIndex: 400,
      overflowY: 'auto', overflowX: 'hidden',
      background: '#fff',
      WebkitOverflowScrolling: 'touch',
      animation: leaving
        ? 'mmv-fade-out 0.5s cubic-bezier(0.4,0,0.2,1) forwards'
        : 'mmv-fade-in 0.8s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <style>{`
        .mmv-detail-scroll::-webkit-scrollbar{display:none}
        .mmv-detail-scroll{scrollbar-width:none;-ms-overflow-style:none}
        @keyframes mmv-fade-in{from{opacity:0}to{opacity:1}}
        @keyframes mmv-fade-out{from{opacity:1}to{opacity:0}}
      `}</style>

      {/* 탭 네비 + 뒤로가기 — sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 5,
        display: 'flex', alignItems: 'center',
        background: '#fff',
        borderBottom: '1px solid #e8ede4',
        padding: '0 8px',
        overflowX: 'auto',
      }}>
        <button
          onClick={handleBack}
          style={{
            flexShrink: 0, width: 36, height: 44,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'none', border: 'none', cursor: 'pointer',
            color: '#888', padding: 0,
          }}
        >
          <ChevronLeft size={20} />
        </button>
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => changeTab(key)}
            style={{
              flexShrink: 0, padding: '13px 12px 10px',
              fontSize: '0.6rem', fontWeight: 800, letterSpacing: '0.08em',
              color: activeTab === key ? '#3a6a20' : '#aaa',
              background: 'none', border: 'none',
              borderBottom: activeTab === key ? '2px solid #5a9a30' : '2px solid transparent',
              cursor: 'pointer', whiteSpace: 'nowrap',
              transition: 'color 0.15s',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* 콘텐츠 — 모든 탭이 옆으로 연결된 필름스트립처럼 슬라이드, 손가락을 따라 이동 */}
      <div
        ref={containerRef}
        style={{ overflowX: 'hidden' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          ref={trackRef}
          style={{
            display: 'flex',
            width: `${TABS.length * 100}%`,
            transform: `translateX(-${activeIdx * panelPercent}%)`,
            transition: 'transform 0.3s ease-out',
          }}
        >
          {TABS.map(({ key }) => (
            <div key={key} style={{ width: `${100 / TABS.length}%`, flexShrink: 0, padding: '18px 20px 100px', boxSizing: 'border-box' }}>
              {renderTabContent(key)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── 메인 ── */
export default function MobileMembersView({ members = {}, titles = [], initialMemberId = null, onClearInitialMember, allPokemonMaster = [] }) {
  const [selected, setSelected] = useState(null);
  const [revealedId, setRevealedId] = useState(null);
  const revealTimer = useRef(null);
  const list = getMemberList(members);

  // caughtPokemon(포켓몬 전체 상세)은 더 이상 members prop에 항상 실려있지 않다 - 지금 열어본
  // 이 한 명에 대해서만 온디맨드로 조회한다 (RTDB 다운로드 절감, useMemberCaughtPokemon 참고).
  const { caughtPokemon: liveCaughtPokemon } = useMemberCaughtPokemon(selected?.id, allPokemonMaster, !!selected);

  useEffect(() => () => clearTimeout(revealTimer.current), []);

  useEffect(() => {
    const memberId = initialMemberId || (() => {
      const params = new URLSearchParams(window.location.search);
      return params.get('member');
    })();
    if (!memberId || list.length === 0) return;

    const target = list.find(m => String(m.id) === String(memberId));
    if (target) {
      const url = new URL(window.location.href);
      const state = window.history.state || {};
      if (!state.memberListReady && url.searchParams.get('member')) {
        const detailUrl = url.toString();
        url.searchParams.delete('member');
        window.history.replaceState({ tab: 'members' }, '', url.toString());
        window.history.pushState({ tab: 'members', member: target.id, memberListReady: true }, '', detailUrl);
      }
      setSelected(target);
      setRevealedId(null);
      onClearInitialMember?.();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialMemberId, list.length]);

  useEffect(() => {
    const onPopState = () => {
      const params = new URLSearchParams(window.location.search);
      const memberId = params.get('member');

      if (!memberId) {
        setSelected(null);
        setRevealedId(null);
        return;
      }

      const target = list.find(m => String(m.id) === String(memberId));
      if (target) {
        setSelected(target);
        setRevealedId(null);
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [list]);

  const handleCardTap = (m) => {
    if (revealedId === m.id) {
      clearTimeout(revealTimer.current);
      setRevealedId(null);
      const url = new URL(window.location.href);
      url.searchParams.set('tab', 'members');
      url.searchParams.set('member', m.id);
      window.history.pushState({ tab: 'members', member: m.id, memberListReady: true }, '', url.toString());
      setSelected(m);
    } else {
      clearTimeout(revealTimer.current);
      setRevealedId(m.id);
      revealTimer.current = setTimeout(() => setRevealedId(null), 2000);
    }
  };

  const handleDetailBack = () => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('member')) {
      window.history.back();
      return;
    }
    setSelected(null);
  };

  if (selected) {
    const m = members[selected.id] || selected;
    return (
      <MemberDetail
        member={{ ...m, caughtPokemon: liveCaughtPokemon || m?.caughtPokemon || [] }}
        titles={titles}
        onBack={handleDetailBack}
        allPokemonMaster={allPokemonMaster}
      />
    );
  }

  return (
    <div style={{
      padding: '28px 14px 80px',
      minHeight: 'calc(100dvh + 80px)',
      background: 'transparent',
      animation: 'mmv-fade-in 0.6s cubic-bezier(0.4,0,0.2,1)',
    }}>
      <style>{`@keyframes mmv-fade-in{from{opacity:0}to{opacity:1}}`}</style>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {list.map(m => (
          <MemberCard key={m.id} member={m} isRevealed={revealedId === m.id} onTap={() => handleCardTap(m)} />
        ))}
      </div>
    </div>
  );
}
