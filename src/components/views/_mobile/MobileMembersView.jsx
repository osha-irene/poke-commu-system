import React, { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';
import CachedImage from '../../common/CachedImage';

const getMemberList = (members) =>
  Object.entries(members || {})
    .map(([id, m]) => ({ id, ...(m || {}) }))
    .filter(m => m?.name && !m.hidden && !m.isNPC)
    .sort((a, b) => {
      const rank = m => m.isSuperAdmin ? 2 : m.isAdmin ? 1 : 0;
      if (rank(a) !== rank(b)) return rank(b) - rank(a);
      return (a.name || '').localeCompare(b.name || '', 'ko');
    });

const getFaceImg = m => m?.profileImage || m?.profileImageFull || m?.profileImageUrl || '';
const getPartner = m => {
  const party = (m?.caughtPokemon || []).filter(Boolean).slice(0, 6);
  return party.find(p => p?.isPartner) || m?.partnerPokemon || null;
};
const getPokemonName = p => p?.nickname || p?.nameKo || p?.name || '포켓몬';
const getPokemonDbSprite = p => {
  const name = p?.nameEn || p?.name;
  if (name) return `https://img.pokemondb.net/sprites/scarlet-violet/normal/${name.toLowerCase().replace(/\s+/g, '-')}.png`;
  return null;
};

/* 포켓몬 아이콘 — 왼쪽 절반만 */
function PokemonHalfIcon({ pokemon, size = 36 }) {
  const icon = getPokemonLocalIconUrl(pokemon);
  if (!icon) return <div style={{ width: size / 2, height: size, background: '#e0e0e0', borderRadius: 4 }} />;
  return (
    <div style={{
      width: size / 2,
      height: size,
      flexShrink: 0,
      backgroundImage: `url(${icon})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `auto ${size}px`,
      backgroundPosition: 'left center',
      imageRendering: 'pixelated',
    }} />
  );
}

/* ── 목록 카드 ── */
function MemberCard({ member, titles, onClick }) {
  const faceImg = getFaceImg(member);
  const partner = getPartner(member);
  const title = member.title && member.title !== 'none'
    ? titles.find(t => t.id === member.title)?.label || ''
    : '';

  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 14px',
        background: 'rgba(255,255,255,0.88)',
        borderRadius: 14,
        boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
        cursor: 'pointer',
      }}
    >
      <div style={{ width: 48, height: 48, borderRadius: 12, overflow: 'hidden', flexShrink: 0, background: '#e8f0e0' }}>
        {faceImg
          ? <CachedImage src={faceImg} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: '#7a9a60' }}>{member.name?.charAt(0)}</div>
        }
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {title && <div style={{ fontSize: 10, color: '#8aaa60', fontWeight: 600, letterSpacing: '0.04em', lineHeight: 1 }}>{title}</div>}
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1a2e10', lineHeight: 1.2 }}>{member.name}</div>
        {member.bio && <div style={{ fontSize: 11, color: '#888', marginTop: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{member.bio}</div>}
      </div>

      {partner && <PokemonHalfIcon pokemon={partner} size={36} />}
    </div>
  );
}

/* ── 멤버 상세 ── */
function MemberDetail({ member, titles, onBack }) {
  const faceImg = getFaceImg(member);
  const partner = getPartner(member);
  const partnerSprite = partner ? getPokemonDbSprite(partner) : null;
  const title = member.title && member.title !== 'none'
    ? titles.find(t => t.id === member.title)?.label || ''
    : '';
  const party = (member?.caughtPokemon || []).filter(Boolean).slice(0, 6);

  return (
    <div style={{ background: '#f4f8f0', paddingBottom: 100 }}>

      {/* 헤더 이미지 */}
      <div style={{ position: 'relative', width: '100%', height: 200, background: '#d8e8c8', overflow: 'hidden', flexShrink: 0 }}>
        {faceImg
          ? <CachedImage src={faceImg} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }} />
          : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>{member.name?.charAt(0)}</div>
        }

        {partnerSprite && (
          <img
            src={partnerSprite}
            alt={getPokemonName(partner)}
            style={{
              position: 'absolute', bottom: -16, right: 16,
              height: 72, width: 'auto', objectFit: 'contain',
              filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* 정보 카드 */}
      <div style={{
        margin: '0 16px', marginTop: -14,
        background: '#fff', borderRadius: 20,
        padding: '16px 18px 18px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
        position: 'relative', zIndex: 1,
      }}>
        {title && <div style={{ fontSize: 11, color: '#8aaa60', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 2 }}>{title}</div>}
        <h2 style={{ fontSize: 24, fontWeight: 700, color: '#1a2e10', margin: 0, lineHeight: 1.1 }}>{member.name}</h2>
        {partner && (
          <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
            파트너 <strong style={{ color: '#e06080' }}>{getPokemonName(partner)}</strong>
          </div>
        )}
        {member.bio && (
          <p style={{ fontSize: 13, color: '#555', marginTop: 10, marginBottom: 0, lineHeight: 1.6 }}>{member.bio}</p>
        )}
      </div>

      {/* 메모 */}
      {member.note && (
        <div style={{ margin: '10px 16px 0', background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8aaa60', letterSpacing: '0.04em', marginBottom: 6 }}>메모</div>
          <div style={{ fontSize: 13, color: '#444', lineHeight: 1.7 }}>
            {member.note.split('\n').map((line, i) => (
              <p key={i} style={{ margin: 0, marginBottom: '0.3em', textIndent: '0.5em' }}>{line || ' '}</p>
            ))}
          </div>
        </div>
      )}

      {/* 엔트리 */}
      {party.length > 0 && (
        <div style={{ margin: '10px 16px 0', background: '#fff', borderRadius: 16, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: '#8aaa60', letterSpacing: '0.04em', marginBottom: 10 }}>엔트리</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {party.map((p, i) => (
              <div key={i} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                background: '#f5f8f2', borderRadius: 10, padding: '6px 8px', minWidth: 44,
              }}>
                <PokemonHalfIcon pokemon={p} size={36} />
                <span style={{ fontSize: 10, color: '#666', textAlign: 'center', maxWidth: 44, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {getPokemonName(p)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 뒤로가기 — 우하단 고정 */}
      <button
        onClick={onBack}
        style={{
          position: 'fixed', bottom: 88, right: 20,
          width: 44, height: 44, borderRadius: '50%',
          background: 'rgba(30,60,20,0.75)', backdropFilter: 'blur(8px)',
          border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)',
          zIndex: 100,
        }}
      >
        <ChevronLeft size={22} />
      </button>
    </div>
  );
}

/* ── 메인 ── */
export default function MobileMembersView({ members = {}, titles = [] }) {
  const [selected, setSelected] = useState(null);
  const list = getMemberList(members);

  if (selected) {
    const m = members[selected.id] || selected;
    return <MemberDetail member={m} titles={titles} onBack={() => setSelected(null)} />;
  }

  return (
    <div style={{ padding: '16px 16px 80px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1a2e10', margin: '0 0 4px' }}>멤버</h2>
      {list.map(m => (
        <MemberCard key={m.id} member={m} titles={titles} onClick={() => setSelected(m)} />
      ))}
    </div>
  );
}
