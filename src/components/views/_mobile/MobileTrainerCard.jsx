import React, { useState, useEffect } from 'react';
import { Link } from 'lucide-react';
import { getDatabase, ref, get } from 'firebase/database';
import { getPokemonLocalIconUrl } from '../../../utils/pokemonIconUtils';
import { getTitleDisplayStyle } from '../../../utils/titleDisplay';
import CachedImage from '../../common/CachedImage';
import { formatMastodonAccount, getMastodonUsername } from '../../../config/mastodonDomain';

function VerticalBarcode({ text, width = 20, height = 100 }) {
  const bits = [1, 0, 1];
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    for (let b = 7; b >= 0; b--) bits.push((c >> b) & 1);
    bits.push(0);
  }
  bits.push(1, 0, 1, 1);
  const runs = [];
  let cur = bits[0], cnt = 1;
  for (let i = 1; i < bits.length; i++) {
    if (bits[i] === cur) cnt++;
    else { runs.push([cur === 1, cnt]); cur = bits[i]; cnt = 1; }
  }
  runs.push([cur === 1, cnt]);
  const total = runs.reduce((s, [, c]) => s + c, 0);
  const unitH = height / total;
  let y = 0;
  return (
    <svg width={width} height={height} style={{ display: 'block' }}>
      {runs.map(([black, cnt], i) => {
        const h = Math.max(cnt * unitH, 0.5);
        const el = black ? <rect key={i} x={0} y={y} width={width} height={h} fill="#1a1a2e" /> : null;
        y += cnt * unitH;
        return el;
      })}
    </svg>
  );
}

export default function MobileTrainerCard({ trainer, titles = [] }) {
  const trainerId = trainer?.trainerId || (trainer?.id
    ? String(trainer.id.split('').reduce((acc, c) => (acc * 31 + c.charCodeAt(0)) & 0xFFFFFF, 0))
        .padStart(6, '0').slice(-6)
    : '000000');

  const partner = trainer?.partnerPokemon || null;
  const partnerIcon = partner ? getPokemonLocalIconUrl(partner) : null;
  const currentTitle = trainer?.title && trainer.title !== 'none'
    ? titles.find(t => t.id === trainer?.title)?.label || ''
    : '';
  const totalExploreCount = Number(trainer?.totalExploreCount) || 0;

  const [mastodonAccount, setMastodonAccount] = useState('');
  useEffect(() => {
    if (!trainer?.id) return;
    get(ref(getDatabase(), `members/${trainer.id}/mastodonAccount`)).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        setMastodonAccount(getMastodonUsername(val));
      }
    }).catch(() => {});
  }, [trainer?.id]);

  return (
    <div style={{
      width: '100%',
      maxWidth: 340,
      margin: '0 auto',
      borderRadius: 20,
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      border: '3px solid #4a7c2f',
      background: '#fff',
    }}>

      {/* 상단: 이미지 */}
      <div style={{
        position: 'relative',
        width: '100%',
        aspectRatio: '3/4',
        background: 'rgba(20,20,30,0.3)',
        overflow: 'hidden',
      }}>
        {trainer?.profileImage ? (
          <CachedImage
            src={trainer.profileImage}
            alt={trainer?.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'top center' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #e8f5e9, #c8e6c9)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'rgba(255,255,255,0.6)', border: '3px solid rgba(255,255,255,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
              {trainer?.name?.charAt(0) || '?'}
            </div>
          </div>
        )}

        {/* ID 뱃지 */}
        <div style={{
          position: 'absolute', bottom: 8, left: 10,
          background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)',
          borderRadius: 6, padding: '2px 8px',
          fontFamily: "'Aggravo', Georgia, serif",
          fontSize: 11, color: 'rgba(255,255,255,0.85)', letterSpacing: '0.08em',
        }}>
          ID. {trainerId}
        </div>
      </div>

      {/* 하단: 정보 */}
      <div style={{ padding: '14px 16px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* 칭호 + 이름 행 */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 8 }}>
          <div>
            {currentTitle && (
              <div style={{
                fontSize: 11,
                color: '#7a9a60',
                fontWeight: 600,
                letterSpacing: '0.05em',
                marginBottom: 2,
                ...getTitleDisplayStyle(currentTitle, { compactFontSize: 10 })
              }}>
                {currentTitle}
              </div>
            )}
            <div style={{ fontSize: 22, fontWeight: 700, color: '#1a2e10', lineHeight: 1.1 }}>
              {trainer?.name}
            </div>
          </div>

          {/* 파트너 + 바코드 */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            {partnerIcon && (
              <div style={{
                width: 48, height: 44, flexShrink: 0,
                backgroundImage: `url(${partnerIcon})`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: `auto 44px`,
                backgroundPosition: 'left center',
                imageRendering: 'pixelated',
              }} title={partner?.nickname || partner?.name} />
            )}
            <VerticalBarcode text={trainerId} width={18} height={52} />
          </div>
        </div>

        {/* 구분선 */}
        <div style={{ height: 1, background: 'rgba(90,150,30,0.15)', margin: '0 -2px' }} />

        {/* 스탯 — 2열 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 8px', fontSize: 12, color: '#888', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {partner && (
              <div>파트너 <strong style={{ color: '#e06080' }}>{partner.nickname || partner.name}</strong></div>
            )}
            {trainer?.hometown && <div>출신 지역 <strong style={{ color: '#333' }}>{trainer.hometown}</strong></div>}
            <div>여행 시작 <strong style={{ color: '#333' }}>7월 5일</strong></div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div>총 탐험 횟수 <strong style={{ color: '#333' }}>{totalExploreCount.toLocaleString()}회</strong></div>
            <div>경험치 <strong style={{ color: '#333' }}>{(trainer?.trainerExp || 0).toLocaleString()}</strong></div>
            <div>소지금 <strong style={{ color: '#b07030' }}>{(trainer?.money || 0).toLocaleString()}원</strong></div>
          </div>
        </div>

        {/* 마스토돈 */}
        {mastodonAccount && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Link size={11} style={{ color: '#a78bfa', flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#888', letterSpacing: '0.04em' }}>
              {formatMastodonAccount(mastodonAccount).toUpperCase()}
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
